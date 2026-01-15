import BackButton from "components/item/BackButton";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ZoombieGame
 * - continuous X
 * - squad clones (+N from ItemBox only)
 * - enemies stack(anchored) and attack
 * - NO FOLLOW
 */

const LANE_COUNT = 5;

// world coords
const PLAYER_Y = 0.82;
const FAR_Y_DEFAULT = -0.8;
const DESPAWN_Y = 1.25;

const BASE_ZOMBIE_SPEED = 0.18;
const HIT_EPS_Y = 0.03;

const MAX_WIDTH = 480;

// ===== Stage rules =====
const FIRST_STAGE_TARGET = 20;
const NEXT_STAGE_STEP = 3;
const MAX_STAGE = 30;

// ===== Stacking enemies =====
const ANCHOR_Y = PLAYER_Y - 0.08;
const ANCHORED_ATTACK_INTERVAL = 1.2;
const PLAYER_GLOBAL_HURT_COOLDOWN = 0.18;

// ===== Drops (enemy) =====
// ✅ 적 드랍: 무기/버프만 (클론은 박스에서만)
const ENEMY_DROP_CHANCE = 0.28;

// ===== ItemBox =====
// ✅ 박스는 따로 스폰, 맞을 때마다 hp 감소, 0이면 +N 아이템 생성
const BOX_SPAWN_INTERVAL = 6.2; // 평균 스폰 간격(스테이지별로 바꾸고 싶으면 STAGES에 넣어도 됨)
const BOX_MAX_ALIVE = 2;
const BOX_SPEED = 0.12;
const BOX_STOP_Y = 0.26; // 이 위치에 도달하면 멈춰서 맞추기 쉽게 (현재 move에서는 미사용)
const BOX_WIDTH_UNITS = 1.1;
const BOX_HEIGHT_HIT_EPS_Y = 0.05; // 박스 피격 y 판정 폭(조금 넉넉히)

// ===== Chapter02 Snow Thrower (Stage 11~20) =====
const THROWER_STOP_Y = 0.32; // 맵 중간에서 멈추는 지점
const THROW_INTERVAL = 1.8; // 던지는 주기(초)
const SNOW_SHOT_SPEED = 0.1; // 투사체 속도(units/sec)
const SNOW_SHOT_DAMAGE = 1; // 맞으면 데미지
const SNOW_SHOT_RADIUS = 0.06; // 충돌 반지름

// 메인 포함 최대 20명 => 클론은 19명
const MAX_UNITS = 20;
const MAX_CLONES = MAX_UNITS - 1;

// ==============================
// ✅ STAGE 1~30 CONFIG (edit here)
// ==============================
type EnemyKind =
  | "normal"
  | "teddy"
  | "fat"
  | "king"
  | "queen"
  | "snowball"
  | "snowThrower";

type StageRule = {
  spawnIntervalSec: number;
  maxAlive: number;
  batch: { min: number; max: number };
  kindWeights: Partial<Record<EnemyKind, number>>;

  // ✅ 스테이지 배율(종류별 base 스펙에 곱/더함)
  hpMul: number; // enemy hp *= hpMul (현재 makeEnemy에서는 기본적으로 사용 안 함)
  hpAdd: number; // enemy hp += hpAdd (현재 makeEnemy에서는 기본적으로 사용 안 함)
  speedMul: number; // enemy speed *= speedMul
  damageAdd: number; // enemy damage += damageAdd (현재 makeEnemy에서는 기본적으로 사용 안 함)

  // (선택) 박스도 스테이지마다 바꾸고 싶으면
  boxSpawnIntervalSec?: number;
  boxMaxAlive?: number;
};

const STAGE_RULES_1_TO_30: StageRule[] = Array.from({ length: 30 }, (_, i) => {
  const stage = i + 1;

  // ---- 1) 난이도 커브(원하는대로 수정) ----
  const hpMul = 1 + (stage - 1) * 0.08;
  const hpAdd = Math.floor((stage - 1) * 0.6);
  const speedMul = 1 + (stage - 1) * 0.012;
  const damageAdd = Math.floor((stage - 1) / 6);

  // ---- 2) 스폰/개체수 커브 ----
  const spawnIntervalSec = Math.max(0.42, 1.15 - (stage - 1) * 0.025);
  const maxAlive = Math.min(22, 6 + Math.floor((stage - 1) * 0.55));
  const batchMin = stage < 6 ? 1 : stage < 14 ? 2 : 3;
  const batchMax = stage < 6 ? 2 : stage < 14 ? 3 : 5;

  // ---- 3) 몬스터 종류 비율 ----
  // 11~20(chapter02)에서 snowball + snowThrower 등장
  const kindWeights: StageRule["kindWeights"] =
    stage < 6
      ? { normal: 0.85, teddy: 0.15 }
      : stage < 11
      ? { normal: 0.6, teddy: 0.25, fat: 0.15 }
      : stage < 20
      ? // ? { snowball: 0.12, snowThrower: 0.6, normal: 0.1, teddy: 0.1, fat: 0.08 }
        { snowThrower: 1 }
      : stage < 30
      ? { normal: 0.35, teddy: 0.25, fat: 0.4 }
      : { normal: 0.25, teddy: 0.25, fat: 0.5 };

  // ---- 4) 박스 난이도 커브(선택) ----
  const boxSpawnIntervalSec = Math.max(3.8, 6.2 - (stage - 1) * 0.06);
  const boxMaxAlive = stage < 10 ? 2 : stage < 20 ? 3 : 4;

  return {
    spawnIntervalSec,
    maxAlive,
    batch: { min: batchMin, max: batchMax },
    kindWeights,

    hpMul,
    hpAdd,
    speedMul,
    damageAdd,

    boxSpawnIntervalSec,
    boxMaxAlive,
  };
});

// ✅ 기존 간격(가로 0.25, 세로 0.03, 바깥쪽 0.5)을 그대로 반복/확장해서 19개 슬롯 생성
function buildCloneSlots(maxClones: number): Array<{ dx: number; dy: number }> {
  const slots: Array<{ dx: number; dy: number }> = [];

  // 1) 너가 쓰던 "첫 6개"를 그대로 유지
  const base = [
    { dx: -0.25, dy: -0.03 },
    { dx: 0.25, dy: -0.03 },
    { dx: -0.25, dy: 0.03 },
    { dx: 0.25, dy: 0.03 },
    { dx: 0.5, dy: 0 },
    { dx: -0.5, dy: 0 },
  ];
  for (const s of base) {
    slots.push(s);
    if (slots.length >= maxClones) return slots;
  }

  // 2) 이후부터는 "같은 간격"으로 바깥 링을 계속 만든다
  const dxStep = 0.25;
  const dyStep = 0.03;

  for (let level = 2; slots.length < maxClones; level++) {
    const xs = [dxStep * level, dxStep * (level + 1)];
    const ys = [0, dyStep, dyStep * 2, dyStep * 3];

    const candidates: Array<{ dx: number; dy: number }> = [];

    for (const x of xs) {
      for (const y of ys) {
        if (y === 0) {
          candidates.push({ dx: x, dy: 0 });
          candidates.push({ dx: -x, dy: 0 });
        } else {
          candidates.push({ dx: x, dy: y });
          candidates.push({ dx: x, dy: -y });
          candidates.push({ dx: -x, dy: y });
          candidates.push({ dx: -x, dy: -y });
        }
      }
    }

    const key = (s: { dx: number; dy: number }) =>
      `${s.dx.toFixed(3)},${s.dy.toFixed(3)}`;
    const seen = new Set(slots.map(key));

    for (const c of candidates) {
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      slots.push(c);
      if (slots.length >= maxClones) break;
    }
  }

  return slots.slice(0, maxClones);
}

// ✅ 최종 슬롯 (클론 19명까지)
const CLONE_SLOTS: Array<{ dx: number; dy: number }> =
  buildCloneSlots(MAX_CLONES);

type StageConfig = {
  spawnIntervalSec: number;
  maxAlive: number;
  batch: { min: number; max: number };
  enemyTierWeights: { t1: number; t2: number; t3: number };
  hpBase: number;
  speedMul: number;
  kindWeights?: Partial<Record<EnemyKind, number>>;
};

const PLAYER_WEAPON_CLASS: Record<WeaponId, string> = {
  pistol: "player_pistol",
  rapid: "player_rapid",
  pierce: "player_pierce",
  shotgun: "player_shotgun",
};

const BULLET_CLASS: Record<WeaponId, string> = {
  pistol: "b_pistol",
  rapid: "b_rapid",
  pierce: "b_pierce",
  shotgun: "b_shotgun",
};

// (구버전 stages: 현재 stageRule로 운영 중이라 사실상 미사용)
const STAGES: StageConfig[] = [
  {
    spawnIntervalSec: 1.15,
    maxAlive: 6,
    batch: { min: 1, max: 1 },
    enemyTierWeights: { t1: 0.85, t2: 0.15, t3: 0.0 },
    hpBase: 0,
    speedMul: 0.95,
    kindWeights: { normal: 0.9, teddy: 0.1 },
  },
  {
    spawnIntervalSec: 1.05,
    maxAlive: 7,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.75, t2: 0.25, t3: 0.0 },
    hpBase: 0,
    speedMul: 1.0,
    kindWeights: { normal: 0.7, teddy: 0.2, fat: 0.1 },
  },
  {
    spawnIntervalSec: 0.98,
    maxAlive: 8,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.65, t2: 0.32, t3: 0.03 },
    hpBase: 0,
    speedMul: 1.03,
    kindWeights: { normal: 0.6, teddy: 0.3, fat: 0.1 },
  },
  {
    spawnIntervalSec: 0.92,
    maxAlive: 9,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.55, t2: 0.37, t3: 0.08 },
    hpBase: 1,
    speedMul: 1.06,
    kindWeights: { normal: 0.6, teddy: 0.3, fat: 0.1 },
  },
  {
    spawnIntervalSec: 0.86,
    maxAlive: 10,
    batch: { min: 1, max: 3 },
    enemyTierWeights: { t1: 0.48, t2: 0.4, t3: 0.12 },
    hpBase: 1,
    speedMul: 1.1,
    kindWeights: { normal: 0.6, teddy: 0.3, fat: 0.1 },
  },
  {
    spawnIntervalSec: 0.82,
    maxAlive: 11,
    batch: { min: 2, max: 3 },
    enemyTierWeights: { t1: 0.4, t2: 0.44, t3: 0.16 },
    hpBase: 2,
    speedMul: 1.14,
    kindWeights: { normal: 0.6, teddy: 0.2, fat: 0.2 },
  },
  {
    spawnIntervalSec: 0.78,
    maxAlive: 12,
    batch: { min: 2, max: 3 },
    enemyTierWeights: { t1: 0.34, t2: 0.46, t3: 0.2 },
    hpBase: 2,
    speedMul: 1.18,
    kindWeights: { normal: 0.6, teddy: 0.2, fat: 0.2 },
  },
  {
    spawnIntervalSec: 0.74,
    maxAlive: 13,
    batch: { min: 2, max: 4 },
    enemyTierWeights: { t1: 0.28, t2: 0.48, t3: 0.24 },
    hpBase: 3,
    speedMul: 1.22,
    kindWeights: { normal: 0.5, teddy: 0.3, fat: 0.2 },
  },
  {
    spawnIntervalSec: 0.7,
    maxAlive: 14,
    batch: { min: 3, max: 4 },
    enemyTierWeights: { t1: 0.22, t2: 0.5, t3: 0.28 },
    hpBase: 3,
    speedMul: 1.26,
    kindWeights: { normal: 0.5, teddy: 0.3, fat: 0.2 },
  },
  {
    spawnIntervalSec: 0.66,
    maxAlive: 15,
    batch: { min: 3, max: 5 },
    enemyTierWeights: { t1: 0.18, t2: 0.5, t3: 0.32 },
    hpBase: 4,
    speedMul: 1.3,
    kindWeights: { normal: 0.4, teddy: 0.3, fat: 0.3 },
  },
];

type EnemyTier = 1 | 2 | 3;

const ENEMY_WIDTH_UNITS: Record<EnemyTier, number> = {
  1: 1.0,
  2: 2.0,
  3: 2.6,
};

type Player = {
  x: number;
  widthUnits: number;
  hp: number;
  maxHp: number;
};

type EnemySpec = {
  hp: number;
  speedMul: number; // BASE_ZOMBIE_SPEED에 곱할 값
  damage: number;
  widthUnits: number; // 충돌/크기 영향
  cssClass: string; // 렌더링 class 매핑용
};

const ENEMY_SPECS: Record<EnemyKind, EnemySpec> = {
  normal: {
    hp: 2,
    speedMul: 1.0,
    damage: 1,
    widthUnits: 1.0,
    cssClass: "charactor_zoombie",
  },
  teddy: {
    hp: 3,
    speedMul: 1.05,
    damage: 1,
    widthUnits: 1.0,
    cssClass: "charactor_zoombie2",
  },
  fat: {
    hp: 10,
    speedMul: 0.4,
    damage: 2,
    widthUnits: 2.0,
    cssClass: "charactor_zoombie3",
  },
  king: {
    hp: 14,
    speedMul: 0.95,
    damage: 3,
    widthUnits: 2.6,
    cssClass: "charactor_zoombie4",
  },
  queen: {
    hp: 12,
    speedMul: 1.1,
    damage: 2,
    widthUnits: 2.4,
    cssClass: "charactor_zoombie3",
  },

  snowball: {
    hp: 18,
    speedMul: 1.0,
    damage: 2,
    widthUnits: 1.25,
    cssClass: "enemy_snowball",
  },

  // ✅ chapter02: 눈을 던지는 적(스테이지 11~20에서만 weights로 등장)
  snowThrower: {
    hp: 4,
    speedMul: 0.7,
    damage: 0, // 직접 앵커 공격은 안 씀(투사체로 데미지)
    widthUnits: 1.2,
    cssClass: "enemy_snow_thrower",
  },
};

type BossMission = {
  stage: 10 | 20 | 30;
  kind: EnemyKind;
  hp: number;
  speedMul: number;
  damage: number;
  widthUnits: number;
  attackInterval: number;
  dropOnKill?: boolean;
};

const BOSS_MISSIONS: BossMission[] = [
  {
    stage: 10,
    kind: "king",
    hp: 2880,
    speedMul: 0.55,
    damage: 4,
    widthUnits: 4.2,
    attackInterval: 0.45,
    dropOnKill: true,
  },
  {
    stage: 20,
    kind: "king",
    hp: 3200,
    speedMul: 0.58,
    damage: 6,
    widthUnits: 4.4,
    attackInterval: 0.42,
    dropOnKill: true,
  },
  {
    stage: 30,
    kind: "king",
    hp: 5200,
    speedMul: 0.6,
    damage: 8,
    widthUnits: 4.6,
    attackInterval: 0.38,
    dropOnKill: true,
  },
];

const getBossMission = (stage: number): BossMission | undefined =>
  BOSS_MISSIONS.find((m) => m.stage === stage);

const isBossStage = (stage: number) => !!getBossMission(stage);

type Enemy = {
  id: number;
  x: number;
  y: number;
  tier: EnemyTier;
  hp: number;
  maxHp: number;
  speed: number;
  widthUnits: number;
  damage: number;
  anchored: boolean;
  attackAcc: number;
  hitFx: number;
  hitText: string;
  kind: EnemyKind;

  // ✅ snowThrower 전용: 던지기 누적 타이머
  throwAcc?: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  pierce: boolean;
  weaponId: WeaponId;
};

type WeaponId = "pistol" | "rapid" | "pierce" | "shotgun";

type Weapon = {
  id: WeaponId;
  name: string;
  fireIntervalSec: number;
  bulletSpeed: number;
  pierce: boolean;
  pellets: number;
  damage: number;
  durationSec?: number;
  spreadUnits?: number;
};

const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    fireIntervalSec: 0.5,
    bulletSpeed: 0.75,
    pierce: false,
    pellets: 1,
    damage: 1,
  },
  rapid: {
    id: "rapid",
    name: "Rapid",
    fireIntervalSec: 0.25,
    bulletSpeed: 0.82,
    pierce: false,
    pellets: 1,
    damage: 1,
    durationSec: 8,
  },
  pierce: {
    id: "pierce",
    name: "Pierce",
    fireIntervalSec: 0.5,
    bulletSpeed: 0.78,
    pierce: true,
    pellets: 1,
    damage: 1,
    durationSec: 8,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    fireIntervalSec: 0.6,
    bulletSpeed: 0.74,
    pierce: false,
    pellets: 5,
    damage: 1,
    durationSec: 8,
    spreadUnits: 1.0,
  },
};

const SPEED_LEVELS = [0.6, 0.7, 0.8, 0.9];

const POWER_LEVELS = [1, 2, 3, 4];

type ItemKind = "weapon" | "fireRateMul" | "damageAdd" | "pierce" | "addClone";

type BuffKind = "pierce";
type Buff = { id: string; kind: BuffKind; value: number; timeLeft: number };

type CombatState = {
  baseWeaponId: WeaponId;
  tempWeapon?: { weaponId: WeaponId; timeLeft: number };

  // ✅ 영구 누적 업그레이드(스테이지/무기 변경과 무관)
  permFireMul: number; // 발사간격에 곱해지는 값(작을수록 더 빠름)
  permDamageAdd: number; // 데미지 +N

  // ✅ 일시 버프(원하면 유지: pierce 같은 것)
  buffs: Buff[];
};

type Item =
  | { id: number; x: number; y: number; kind: "weapon"; weaponId: WeaponId }
  | {
      id: number;
      x: number;
      y: number;
      kind: "fireRateMul";
      mul: number;
      durationSec: number;
    }
  | {
      id: number;
      x: number;
      y: number;
      kind: "damageAdd";
      add: number;
      durationSec: number;
    }
  | { id: number; x: number; y: number; kind: "pierce"; durationSec: number }
  | { id: number; x: number; y: number; kind: "addClone"; count: 1 | 2 | 3 };

type Mode = "playing" | "cleared" | "gameover";

// ✅ ItemBox entity
type ItemBox = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  reward: 1 | 2 | 3;
  widthUnits: number;
};

type BossState = {
  active: boolean;
  spawned: boolean;
  bossId?: number;
  mission: BossMission;
};

// ✅ 적 투사체(눈 던지기)
type EnemyShot = {
  id: number;
  x: number;
  y: number;
  px: number; // ✅ 이전 좌표
  py: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
};

type World = {
  stage: number;
  totalScore: number;
  stageScore: number;
  mode: Mode;
  enemies: Enemy[];
  bullets: Bullet[];
  items: Item[];
  boxes: ItemBox[];
  enemyShots: EnemyShot[]; // ✅ 추가
  combat: CombatState;
  boss?: BossState;
};

type CloneUnit = { id: number; slotIndex: number };

let enemyIdSeed = 1;
let bulletIdSeed = 1;
let itemIdSeed = 1;
let boxIdSeed = 1;
let cloneIdSeed = 1;
let enemyShotIdSeed = 1; // ✅

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));

function stageTarget(stage: number) {
  const stageInBlock = (stage - 1) % 10; // 0 ~ 9
  return FIRST_STAGE_TARGET + stageInBlock * NEXT_STAGE_STEP;
}

function pickEnemyTier(w: { t1: number; t2: number; t3: number }): EnemyTier {
  const r = Math.random();
  if (r < w.t1) return 1;
  if (r < w.t1 + w.t2) return 2;
  return 3;
}

function makeEvenOffsets(pellets: number, spreadUnits: number) {
  if (pellets <= 1) return [0];
  const half = spreadUnits / 2;
  const step = spreadUnits / (pellets - 1);
  return Array.from({ length: pellets }, (_, i) => -half + i * step);
}

const valueToLevel = (value: number, levels: number[]) => {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (value >= levels[i]) return i + 1;
  }
  return 1;
};

function getActiveWeapon(combat: CombatState): Weapon {
  const base = combat.tempWeapon
    ? WEAPONS[combat.tempWeapon.weaponId]
    : WEAPONS[combat.baseWeaponId];

  const permFireMul = combat.permFireMul ?? 1;
  const permDamageAdd = combat.permDamageAdd ?? 0;

  const hasPierce =
    base.pierce ||
    combat.buffs.some((b) => b.kind === "pierce" && b.timeLeft > 0);

  return {
    ...base,
    fireIntervalSec: Math.max(0.06, base.fireIntervalSec * permFireMul),
    damage: Math.max(1, base.damage + permDamageAdd),
    pierce: hasPierce,
  };
}

function applyItem(combat: CombatState, item: Item): CombatState {
  // ✅ 무기 아이템은 "임시 무기"로만 동작(기존 유지)
  if (item.kind === "weapon") {
    const w = WEAPONS[item.weaponId];
    const dur = w.durationSec ?? 6;
    return {
      ...combat,
      tempWeapon: { weaponId: item.weaponId, timeLeft: dur },
    };
  }

  // ✅ 발사속도 아이템은 "영구 누적"
  if (item.kind === "fireRateMul") {
    // item.mul은 0.7 같은 값(간격을 줄이는 효과)
    // 너무 빨라지는 것 방지: permFireMul 최소값 제한
    const nextPerm = Math.max(0.35, (combat.permFireMul ?? 1) * item.mul);
    return {
      ...combat,
      permFireMul: nextPerm,
    };
  }

  // ✅ 공격력 아이템은 "영구 누적"
  if (item.kind === "damageAdd") {
    const next = (combat.permDamageAdd ?? 0) + item.add;
    return {
      ...combat,
      permDamageAdd: next,
    };
  }

  // pierce는 원하면 일시 버프로 유지
  if (item.kind === "pierce") {
    return {
      ...combat,
      buffs: [
        ...combat.buffs,
        {
          id: crypto.randomUUID(),
          kind: "pierce",
          value: 1,
          timeLeft: item.durationSec,
        },
      ],
    };
  }

  return combat;
}

// ✅ 적 드랍(클론 제외)
function maybeDropEnemyItem(x: number, y: number): Item | null {
  if (Math.random() > ENEMY_DROP_CHANCE) return null;

  const r = Math.random();
  if (r < 0.42) {
    const w: WeaponId = (["rapid", "pierce", "shotgun"] as WeaponId[])[
      randInt(0, 2)
    ];
    return { id: itemIdSeed++, x, y, kind: "weapon", weaponId: w };
  }
  if (r < 0.72) {
    return {
      id: itemIdSeed++,
      x,
      y,
      kind: "fireRateMul",
      mul: 0.7,
      durationSec: 6,
    };
  }
  return { id: itemIdSeed++, x, y, kind: "damageAdd", add: 1, durationSec: 6 };
}

// ✅ 박스 생성: reward=1/2/3, hp=reward
function makeBox(): ItemBox {
  const reward = (Math.random() < 0.55 ? 1 : Math.random() < 0.85 ? 2 : 3) as
    | 1
    | 2
    | 3;
  const hp = reward;
  const halfW = BOX_WIDTH_UNITS / 2;
  const x = halfW + Math.random() * (LANE_COUNT - 2 * halfW);

  return {
    id: boxIdSeed++,
    x,
    y: FAR_Y_DEFAULT,
    hp,
    maxHp: hp,
    reward,
    widthUnits: BOX_WIDTH_UNITS,
  };
}

function makeProjectors(heightPx: number) {
  const GAMMA_Y = 1.4;
  const FAR_SCREEN_Y = -0.18 * heightPx;

  const projectYpx = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y);
    const nearPx = nearY * heightPx;
    const px = lerp(FAR_SCREEN_Y, nearPx, tt);
    if (worldY > nearY) {
      const slope = 1.1;
      return nearPx + (worldY - nearY) * heightPx * slope;
    }
    return px;
  };

  const getPerspective = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, 1.55);
    const scale = lerp(0.42, 1.0, tt);
    const spread = lerp(0.55, 1.0, tt);
    return { scale, spread };
  };

  return { projectYpx, getPerspective };
}

interface Props {
  onExit: () => void;
}

const ZoombieGame: React.FC<Props> = ({ onExit }) => {
  const [viewport, setViewport] = useState({ width: 360, height: 720 });
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const w = Math.floor(vv?.width ?? window.innerWidth);
      const h = Math.floor(vv?.height ?? window.innerHeight);
      setViewport({ width: w, height: h });
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  const WIDTH = Math.min(viewport.width, MAX_WIDTH);
  const HEIGHT = viewport.height;
  const laneWidth = WIDTH / LANE_COUNT;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const consumedCloneItemIdsRef = useRef<Set<number>>(new Set());
  const consumedEnemyShotIdsRef = useRef<Set<number>>(new Set());

  const [player, setPlayer] = useState<Player>({
    x: LANE_COUNT / 2,
    widthUnits: 1.3,
    hp: 10,
    maxHp: 10,
  });
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const [clones, setClones] = useState<CloneUnit[]>([]);
  const clonesRef = useRef(clones);
  useEffect(() => {
    clonesRef.current = clones;
  }, [clones]);

  const addClones = (count: 1 | 2 | 3) => {
    setClones((prev) => {
      const used = new Set(prev.map((p) => p.slotIndex));
      let addCount = count;
      const next = [...prev];

      for (let slotIndex = 0; slotIndex < CLONE_SLOTS.length; slotIndex++) {
        if (addCount <= 0) break;
        if (used.has(slotIndex)) continue;
        next.push({ id: cloneIdSeed++, slotIndex });
        addCount--;
      }
      return next;
    });
  };

  const getAllPlayerUnits = () => {
    const leader = { id: 0, x: playerRef.current.x, y: PLAYER_Y };
    const extra = clonesRef.current.map((c) => {
      const slot = CLONE_SLOTS[c.slotIndex] ?? { dx: 0, dy: 0 };
      return {
        id: c.id,
        x: clamp(playerRef.current.x + slot.dx, 0, LANE_COUNT),
        y: PLAYER_Y + slot.dy,
      };
    });
    return [leader, ...extra];
  };

  // ✅ setWorld 내부에서도 안전하게 쓰는 유닛 리스트(leader + clones)
  const getAllPlayerUnitsRef = () => {
    const leader = { id: 0, x: playerRef.current.x, y: PLAYER_Y };
    const extra = clonesRef.current.map((c) => {
      const slot = CLONE_SLOTS[c.slotIndex] ?? { dx: 0, dy: 0 };
      return {
        id: c.id,
        x: clamp(playerRef.current.x + slot.dx, 0, LANE_COUNT),
        y: PLAYER_Y + slot.dy,
      };
    });
    return [leader, ...extra];
  };

  const [world, setWorld] = useState<World>(() => ({
    stage: 1,
    totalScore: 0,
    stageScore: 0,
    mode: "playing",
    enemies: [],
    bullets: [],
    items: [],
    boxes: [],
    enemyShots: [], // ✅
    combat: {
      baseWeaponId: "pistol",
      permFireMul: 1,
      permDamageAdd: 0,
      buffs: [],
    },
    boss: undefined,
  }));
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  const lastTimeRef = useRef<number | null>(null);
  const spawnAccRef = useRef(0);
  const fireAccRef = useRef(0);
  const boxSpawnAccRef = useRef(0);
  const hurtCooldownRef = useRef(0);
  const farYRef = useRef(FAR_Y_DEFAULT);

  const { projectYpx, getPerspective } = useMemo(
    () => makeProjectors(HEIGHT),
    [HEIGHT]
  );

  const movePlayerByTouchX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const xUnits = (xPx / rect.width) * LANE_COUNT;
    setPlayer((p) => ({ ...p, x: clamp(xUnits, 0, LANE_COUNT) }));
  };

  const onTouchStart = (e: React.TouchEvent) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) =>
    movePlayerByTouchX(e.touches[0].clientX);

  useEffect(() => {
    const STEP = 0.55;
    const onKeyDown = (e: KeyboardEvent) => {
      if (worldRef.current.mode !== "playing") return;
      if (e.key === "ArrowLeft")
        setPlayer((p) => ({ ...p, x: clamp(p.x - STEP, 0, LANE_COUNT) }));
      if (e.key === "ArrowRight")
        setPlayer((p) => ({ ...p, x: clamp(p.x + STEP, 0, LANE_COUNT) }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentStageCfg = () =>
    STAGE_RULES_1_TO_30[Math.max(0, Math.min(29, worldRef.current.stage - 1))];

  function pickEnemyKind(
    weights: Partial<Record<EnemyKind, number>>
  ): EnemyKind {
    const entries = Object.entries(weights) as [EnemyKind, number][];
    const sum = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * (sum || 1);

    for (const [k, w] of entries) {
      r -= w;
      if (r <= 0) return k;
    }
    return "normal";
  }

  const makeEnemy = (): Enemy => {
    const cfg = currentStageCfg();
    const kind = pickEnemyKind(cfg.kindWeights ?? { normal: 1 });
    const spec = ENEMY_SPECS[kind];

    // ✅ 기존 적들은 “원래 스펙 그대로”
    let hp = spec.hp;
    let damage = spec.damage;

    if (kind === "snowball") {
      const s = worldRef.current.stage; // 11~20
      hp = clamp(10 + (s - 11), 8, 20);
      damage = 1; // 충돌 데미지 낮게
    }

    if (kind === "snowThrower") {
      const s = worldRef.current.stage; // 11~20
      hp = clamp(5 + Math.floor((s - 11) * 0.4), 5, 10);
      damage = 0;
    }

    const speed = BASE_ZOMBIE_SPEED * spec.speedMul * cfg.speedMul;
    const widthUnits = spec.widthUnits;
    const halfW = widthUnits / 2;
    const x = halfW + Math.random() * (LANE_COUNT - 2 * halfW);

    return {
      id: enemyIdSeed++,
      kind,
      tier: 1,
      x,
      y: farYRef.current,
      hp,
      maxHp: hp,
      speed,
      widthUnits,
      damage,
      anchored: false,
      attackAcc: 0,
      hitFx: 0,
      hitText: "HIT",
      throwAcc: kind === "snowThrower" ? 0 : undefined,
    };
  };

  const makeBoss = (mission: BossMission): Enemy => {
    const cfg = currentStageCfg();
    const halfW = mission.widthUnits / 2;
    const x = halfW + Math.random() * (LANE_COUNT - 2 * halfW);

    return {
      id: enemyIdSeed++,
      kind: mission.kind,
      tier: 3,
      x,
      y: farYRef.current,
      hp: mission.hp,
      maxHp: mission.hp,
      speed: BASE_ZOMBIE_SPEED * mission.speedMul * cfg.speedMul,
      widthUnits: mission.widthUnits,
      damage: mission.damage,
      anchored: false,
      attackAcc: 0,
      hitFx: 0,
      hitText: "BOSS",
    };
  };

  function segmentCircleHit(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    r: number
  ) {
    const abx = bx - ax;
    const aby = by - ay;
    const acx = cx - ax;
    const acy = cy - ay;

    const abLen2 = abx * abx + aby * aby;
    const t =
      abLen2 <= 0
        ? 0
        : Math.max(0, Math.min(1, (acx * abx + acy * aby) / abLen2));

    const hx = ax + abx * t;
    const hy = ay + aby * t;

    const dx = cx - hx;
    const dy = cy - hy;
    return dx * dx + dy * dy <= r * r;
  }

  const spawnEnemies = (dt: number) => {
    if (worldRef.current.boss?.active) return;
    const cfg = currentStageCfg();
    spawnAccRef.current += dt;
    if (spawnAccRef.current < cfg.spawnIntervalSec) return;

    const w = worldRef.current;
    if (w.enemies.length >= cfg.maxAlive) return;

    spawnAccRef.current -= cfg.spawnIntervalSec;
    const count = randInt(cfg.batch.min, cfg.batch.max);

    setWorld((prev) => {
      const room = cfg.maxAlive - prev.enemies.length;
      const spawnCount = Math.max(0, Math.min(count, room));
      if (spawnCount === 0) return prev;
      const newEnemies = Array.from({ length: spawnCount }, () => makeEnemy());
      return { ...prev, enemies: [...prev.enemies, ...newEnemies] };
    });
  };

  // ✅ 박스 스폰
  const spawnBoxes = (dt: number) => {
    if (worldRef.current.boss?.active) return;
    boxSpawnAccRef.current += dt;
    if (boxSpawnAccRef.current < BOX_SPAWN_INTERVAL) return;

    const w = worldRef.current;
    if (w.boxes.length >= BOX_MAX_ALIVE) return;

    boxSpawnAccRef.current -= BOX_SPAWN_INTERVAL;

    setWorld((prev) => {
      if (prev.boxes.length >= BOX_MAX_ALIVE) return prev;
      return { ...prev, boxes: [...prev.boxes, makeBox()] };
    });
  };

  const tickCombatTimers = (dt: number) => {
    setWorld((prev) => {
      const combat = prev.combat;

      const nextBuffs = combat.buffs
        .map((b) => ({ ...b, timeLeft: b.timeLeft - dt }))
        .filter((b) => b.timeLeft > 0);

      let nextTemp = combat.tempWeapon
        ? { ...combat.tempWeapon, timeLeft: combat.tempWeapon.timeLeft - dt }
        : undefined;
      if (nextTemp && nextTemp.timeLeft <= 0) nextTemp = undefined;

      return {
        ...prev,
        combat: { ...combat, buffs: nextBuffs, tempWeapon: nextTemp },
      };
    });
  };

  // ✅ 발사는 유닛의 실제 x/y 그대로 적용
  const fireIfReady = (dt: number) => {
    fireAccRef.current += dt;

    const w = worldRef.current;
    const weapon = getActiveWeapon(w.combat);

    if (fireAccRef.current < weapon.fireIntervalSec) return;
    fireAccRef.current -= weapon.fireIntervalSec;

    const units = getAllPlayerUnits();
    const bulletsToAdd: Bullet[] = [];

    const offsets =
      weapon.spreadUnits != null
        ? makeEvenOffsets(weapon.pellets, weapon.spreadUnits)
        : [0];

    for (const u of units) {
      for (const off of offsets) {
        bulletsToAdd.push({
          id: bulletIdSeed++,
          x: clamp(u.x + off, 0, LANE_COUNT),
          y: u.y,
          speed: weapon.bulletSpeed,
          damage: weapon.damage,
          pierce: weapon.pierce,
          weaponId: weapon.id,
        });
      }
    }

    setWorld((prev) => ({
      ...prev,
      bullets: [...prev.bullets, ...bulletsToAdd],
    }));
  };

  useEffect(() => {
    if (world.mode !== "playing") return;

    let raf = 0;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min(0.033, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      hurtCooldownRef.current = Math.max(0, hurtCooldownRef.current - dt);

      tickCombatTimers(dt);
      spawnEnemies(dt);
      spawnBoxes(dt);
      fireIfReady(dt);

      setWorld((prev) => {
        if (prev.mode !== "playing") return prev;

        // ✅ HP 0이면 즉시 gameover로 상태 고정
        if (playerRef.current.hp <= 0) {
          return { ...prev, mode: "gameover" };
        }

        // =========================
        // 1) MOVE
        // =========================
        let enemies = prev.enemies.map((e) => {
          const nextHitFx = Math.max(0, (e.hitFx ?? 0) - dt);

          // ✅ snowball: 절대 anchored 안 됨. 계속 굴러 내려감
          if (e.kind === "snowball") {
            return {
              ...e,
              y: e.y + e.speed * dt,
              hitFx: nextHitFx,
              anchored: false,
            };
          }

          // ✅ snowThrower: 중간지점에서 멈추고 throwAcc 누적
          if (e.kind === "snowThrower") {
            let ny = e.y;
            let stopped = false;

            if (ny < THROWER_STOP_Y) {
              ny = ny + e.speed * dt;
              if (ny >= THROWER_STOP_Y) {
                ny = THROWER_STOP_Y;
                stopped = true;
              }
            } else {
              stopped = true;
            }

            const nextThrowAcc = stopped
              ? (e.throwAcc ?? 0) + dt
              : e.throwAcc ?? 0;

            return {
              ...e,
              y: ny,
              anchored: false,
              attackAcc: 0,
              throwAcc: nextThrowAcc,
              hitFx: nextHitFx,
            };
          }

          // 기존 적: anchored 로직 유지
          if (!e.anchored) {
            const ny = e.y + e.speed * dt;
            if (ny >= ANCHOR_Y) {
              return {
                ...e,
                y: ANCHOR_Y,
                anchored: true,
                attackAcc: 0,
                hitFx: nextHitFx,
              };
            }
            return { ...e, y: ny, hitFx: nextHitFx };
          }

          return {
            ...e,
            y: ANCHOR_Y,
            attackAcc: e.attackAcc + dt,
            hitFx: nextHitFx,
          };
        });

        let boxes = prev.boxes.map((b) => ({ ...b, y: b.y + BOX_SPEED * dt }));

        let bullets = prev.bullets
          .map((b) => ({ ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y > FAR_Y_DEFAULT - 0.35 && b.y < DESPAWN_Y);

        let items = prev.items.map((it) => ({ ...it, y: it.y + 0.16 * dt }));

        // ✅ enemy shots move
        let enemyShots = prev.enemyShots.map((s) => {
          const nx = s.x + s.vx * dt;
          const ny = s.y + s.vy * dt;
          return { ...s, px: s.x, py: s.y, x: nx, y: ny };
        });

        const deadEnemyIds = new Set<number>();
        const deadBulletIds = new Set<number>();
        const deadBoxIds = new Set<number>();

        // =========================
        // 2) BOSS SPAWN (ONCE)
        // =========================
        if (prev.boss?.active && !prev.boss.spawned) {
          const boss = makeBoss(prev.boss.mission);
          enemies = [...enemies, boss];
          boxes = [];
          enemyShots = []; // ✅ 보스전 진입 시 투사체 정리

          return {
            ...prev,
            enemies,
            boxes,
            bullets,
            items,
            enemyShots,
            boss: { ...prev.boss, spawned: true, bossId: boss.id },
          };
        }

        // =========================
        // 2.5) THROWER -> SPAWN ENEMY SHOTS
        // =========================
        const spawnedEnemyShots: EnemyShot[] = [];

        enemies = enemies.map((e) => {
          if (e.kind !== "snowThrower") return e;
          if (e.y < THROWER_STOP_Y - 0.001) return e;

          const acc = e.throwAcc ?? 0;
          if (acc < THROW_INTERVAL) return e;

          const times = Math.floor(acc / THROW_INTERVAL);
          const nextAcc = acc - times * THROW_INTERVAL;

          const targetX = playerRef.current.x;
          const targetY = PLAYER_Y;

          for (let k = 0; k < times; k++) {
            const dx = targetX - e.x;
            const dy = targetY - e.y;
            const len = Math.max(0.0001, Math.hypot(dx, dy));
            const ux = dx / len;
            const uy = dy / len;

            spawnedEnemyShots.push({
              id: enemyShotIdSeed++,
              x: e.x,
              y: e.y,
              px: e.x, // ✅ 추가
              py: e.y, // ✅ 추가
              vx: ux * SNOW_SHOT_SPEED,
              vy: uy * SNOW_SHOT_SPEED,
              radius: SNOW_SHOT_RADIUS,
              damage: SNOW_SHOT_DAMAGE,
            });
          }

          return { ...e, throwAcc: nextAcc };
        });

        // ✅ spawn 결과를 실제 enemyShots에 반영
        enemyShots = [...enemyShots, ...spawnedEnemyShots];

        // =========================
        // 3) BULLET -> BOX
        // =========================
        const spawnedFromBox: Item[] = [];

        for (const b of bullets) {
          if (deadBulletIds.has(b.id)) continue;

          for (const box of boxes) {
            if (deadBoxIds.has(box.id)) continue;

            const dx = Math.abs(box.x - b.x);
            const dy = Math.abs(box.y - b.y);

            const BULLET_RADIUS_UNITS = 0.12;
            const halfW = box.widthUnits / 2;

            const hitX = dx < halfW + BULLET_RADIUS_UNITS;
            const hitY = dy < BOX_HEIGHT_HIT_EPS_Y;

            if (hitX && hitY) {
              box.hp -= 1;

              if (!b.pierce) deadBulletIds.add(b.id);

              if (box.hp <= 0) {
                deadBoxIds.add(box.id);
                spawnedFromBox.push({
                  id: itemIdSeed++,
                  x: box.x,
                  y: box.y,
                  kind: "addClone",
                  count: box.reward,
                });
              }

              if (!b.pierce) break;
            }
          }
        }

        // =========================
        // 4) BULLET -> ENEMY
        // =========================
        for (const b of bullets) {
          if (deadBulletIds.has(b.id)) continue;

          for (const e of enemies) {
            if (deadEnemyIds.has(e.id)) continue;

            const dx = Math.abs(e.x - b.x);
            const dy = Math.abs(e.y - b.y);

            const BULLET_RADIUS_UNITS = 0.12;
            const enemyHalfW = e.widthUnits / 2;

            const hitX = dx < enemyHalfW + BULLET_RADIUS_UNITS;
            const hitY = dy < HIT_EPS_Y;

            if (hitX && hitY) {
              e.hp -= b.damage;
              e.hitFx = 0.25;
              e.hitText = "HIT";

              if (!b.pierce) deadBulletIds.add(b.id);
              if (e.hp <= 0) deadEnemyIds.add(e.id);

              if (!b.pierce) break;
            }
          }
        }

        // =========================
        // 5) KILLS + DROPS
        // =========================
        let kills = 0;
        const dropped: Item[] = [];

        for (const e of enemies) {
          if (deadEnemyIds.has(e.id)) {
            kills += 1;
            const drop = maybeDropEnemyItem(e.x, e.y);
            if (drop) dropped.push(drop);
          }
        }

        enemies = enemies.filter((e) => !deadEnemyIds.has(e.id));
        bullets = bullets.filter((b) => !deadBulletIds.has(b.id));
        boxes = boxes.filter((bx) => !deadBoxIds.has(bx.id));
        items = [...items, ...dropped, ...spawnedFromBox];
        enemyShots = enemyShots.filter(
          (s) =>
            !consumedEnemyShotIdsRef.current.has(s.id) &&
            s.y < DESPAWN_Y + 0.2 &&
            s.y > FAR_Y_DEFAULT - 0.6 &&
            s.x > -1 &&
            s.x < LANE_COUNT + 1
        );

        // =========================
        // 6) BOSS DIED CHECK
        // =========================
        let nextCombat = prev.combat;

        const bossId = prev.boss?.bossId;
        const bossStillAlive =
          bossId != null && enemies.some((e) => e.id === bossId);
        const bossDied = prev.boss?.active && bossId != null && !bossStillAlive;

        if (bossDied) {
          return {
            ...prev,
            mode: "cleared",
            enemies: [],
            bullets: [],
            boxes: [],
            items,
            enemyShots: [], // ✅ 클리어 시 정리
            combat: nextCombat,
            totalScore: prev.totalScore + kills,
            stageScore: prev.stageScore + kills,
            boss: { ...prev.boss!, active: false },
          };
        }

        // =========================
        // 7) ITEM PICKUP (any unit)
        // =========================
        const units = getAllPlayerUnitsRef();
        const pickedItemIds = new Set<number>();

        for (const it of items) {
          if (Math.abs(it.y - PLAYER_Y) >= 0.06) continue;

          let picked = false;
          for (const u of units) {
            const dx = Math.abs(it.x - u.x);
            const dy = Math.abs(it.y - u.y);

            const inX = dx < playerRef.current.widthUnits * 0.7;
            const inY = dy < 0.07;

            if (inX && inY) {
              picked = true;
              break;
            }
          }
          if (!picked) continue;

          if (it.kind === "addClone") {
            if (!consumedCloneItemIdsRef.current.has(it.id)) {
              consumedCloneItemIdsRef.current.add(it.id);
              addClones(it.count);
            }
            pickedItemIds.add(it.id);
            continue;
          }

          pickedItemIds.add(it.id);
          nextCombat = applyItem(nextCombat, it);
        }

        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        // =========================
        // 8) DAMAGE HELPERS
        // =========================
        const setPlayerHp = (nextHp: number) => {
          playerRef.current = { ...playerRef.current, hp: nextHp };
          setPlayer((p) => ({ ...p, hp: nextHp }));
        };

        // =========================
        // 8-0) DAMAGE: ENEMY SHOT HIT (snow thrower)
        // =========================
        if (hurtCooldownRef.current <= 0 && enemyShots.length > 0) {
          const units = getAllPlayerUnitsRef();

          let hitShotId: number | null = null;
          let damage = 0;

          for (const s of enemyShots) {
            const ax = s.px ?? s.x;
            const ay = s.py ?? s.y;
            const bx = s.x;
            const by = s.y;

            // ✅ 리더(본체)만 판정
            const leader = { x: playerRef.current.x, y: PLAYER_Y };

            const playerR = 0.03; // ✅ 반경도 줄임(0.25~0.3 추천)
            const r = playerR + s.radius;

            if (segmentCircleHit(ax, ay, bx, by, leader.x, leader.y, r)) {
              hitShotId = s.id;
              damage = s.damage;
              break;
            }
            if (hitShotId != null) break;
          }

          if (hitShotId != null) {
            // ✅ 이 샷은 앞으로 절대 다시 데미지 못 주게 영구 마킹
            consumedEnemyShotIdsRef.current.add(hitShotId);

            // ✅ 즉시 제거
            enemyShots = enemyShots.filter((ss) => ss.id !== hitShotId);

            const nextHp = Math.max(0, playerRef.current.hp - damage);
            playerRef.current = { ...playerRef.current, hp: nextHp };
            setPlayer((p) => ({ ...p, hp: nextHp }));

            hurtCooldownRef.current = PLAYER_GLOBAL_HURT_COOLDOWN;

            if (nextHp <= 0) {
              return {
                ...prev,
                mode: "gameover",
                enemies,
                bullets,
                items,
                boxes,
                enemyShots,
                combat: nextCombat,
                totalScore: prev.totalScore + kills,
                stageScore: prev.stageScore + kills,
              };
            }
          }
        }

        // =========================
        // 8) DAMAGE: SNOWBALL CRASH (ONCE)
        // =========================
        if (hurtCooldownRef.current <= 0) {
          let hitOnce = false;

          for (const e of enemies) {
            if (e.kind !== "snowball") continue;
            if (Math.abs(e.y - PLAYER_Y) > 0.06) continue;

            for (const u of units) {
              const dx = Math.abs(e.x - u.x);
              const dy = Math.abs(e.y - u.y);

              const hitX =
                dx < playerRef.current.widthUnits * 0.55 + e.widthUnits * 0.5;
              const hitY = dy < 0.06;

              if (hitX && hitY) {
                const crashDamage = 1; // ✅ 눈덩이 충돌 데미지
                const nextHp = Math.max(0, playerRef.current.hp - crashDamage);
                setPlayerHp(nextHp);

                enemies = enemies.filter((x) => x.id !== e.id);

                hurtCooldownRef.current = PLAYER_GLOBAL_HURT_COOLDOWN;

                if (nextHp <= 0) {
                  return {
                    ...prev,
                    mode: "gameover",
                    enemies,
                    bullets,
                    items,
                    boxes,
                    enemyShots,
                    combat: nextCombat,
                    totalScore: prev.totalScore + kills,
                    stageScore: prev.stageScore + kills,
                  };
                }

                hitOnce = true;
                break;
              }
            }

            if (hitOnce) break;
          }
        }

        // =========================
        // 9) DAMAGE: ANCHORED ENEMY ATTACK
        // =========================
        if (hurtCooldownRef.current <= 0) {
          let totalDamage = 0;

          for (const e of enemies) {
            if (!e.anchored) continue;

            const interval =
              prev.boss?.active && prev.boss.bossId === e.id
                ? prev.boss.mission.attackInterval
                : ANCHORED_ATTACK_INTERVAL;

            if (e.attackAcc >= interval) {
              totalDamage += e.damage; //무조건 1번만 적용
              e.attackAcc = 0; //누적 리셋 (몰아치기 방지)
            }
          }

          if (totalDamage > 0) {
            const nextHp = Math.max(0, playerRef.current.hp - totalDamage);
            setPlayerHp(nextHp);
            hurtCooldownRef.current = PLAYER_GLOBAL_HURT_COOLDOWN;

            if (nextHp <= 0) {
              return {
                ...prev,
                mode: "gameover",
                enemies,
                bullets,
                items,
                boxes,
                enemyShots,
                combat: nextCombat,
                totalScore: prev.totalScore + kills,
                stageScore: prev.stageScore + kills,
              };
            }
          }
        }

        // =========================
        // 10) STAGE CLEAR CHECK
        // =========================
        const nextStageScore = prev.stageScore + kills;
        const nextTotalScore = prev.totalScore + kills;

        const target = stageTarget(prev.stage);

        if (!prev.boss?.active && nextStageScore >= target) {
          const mission = getBossMission(prev.stage);

          if (mission) {
            return {
              ...prev,
              mode: "playing",
              totalScore: nextTotalScore,
              stageScore: 0,
              enemies: [],
              boxes: [],
              bullets,
              items,
              enemyShots: [], // ✅ 보스전 진입 시 정리
              boss: { active: true, spawned: false, mission },
              combat: nextCombat,
            };
          }

          return {
            ...prev,
            mode: "cleared",
            enemies,
            bullets,
            items,
            boxes,
            enemyShots: [], // ✅ 클리어 시 정리
            combat: nextCombat,
            totalScore: nextTotalScore,
            stageScore: nextStageScore,
          };
        }

        // =========================
        // 11) NORMAL RETURN
        // =========================
        return {
          ...prev,
          enemies,
          bullets,
          items,
          boxes,
          enemyShots,
          combat: nextCombat,
          totalScore: nextTotalScore,
          stageScore: nextStageScore,
        };
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world.mode]);

  const activeWeapon = getActiveWeapon(world.combat);

  const hardResetToStage = (stage: number) => {
    consumedCloneItemIdsRef.current.clear();
    lastTimeRef.current = null;
    spawnAccRef.current = 0;
    fireAccRef.current = 0;
    boxSpawnAccRef.current = 0;
    farYRef.current = FAR_Y_DEFAULT;
    hurtCooldownRef.current = 0;
    consumedEnemyShotIdsRef.current.clear();

    setPlayer((p) => ({ ...p, x: LANE_COUNT / 2, hp: p.maxHp }));
    setClones([]);

    setWorld((prev) => ({
      stage,
      totalScore: prev.totalScore,
      stageScore: 0,
      mode: "playing",
      enemies: [],
      bullets: [],
      items: [],
      boxes: [],
      enemyShots: [], // ✅
      combat: {
        baseWeaponId: "pistol",
        permFireMul: 1,
        permDamageAdd: 0,
        buffs: [],
      },
      boss: undefined,
    }));
  };

  const handleRetry = () => hardResetToStage(world.stage);
  const handleNextStage = () =>
    hardResetToStage(Math.min(MAX_STAGE, world.stage + 1));

  const xUnitsToPx = (xUnits: number) => (xUnits / LANE_COUNT) * WIDTH;

  const target = stageTarget(world.stage);
  const playerHpPct = player.maxHp > 0 ? clamp01(player.hp / player.maxHp) : 0;

  const units = getAllPlayerUnits();

  const renderEnemy = (e: Enemy) => {
    const ypx = projectYpx(e.y, farYRef.current);
    const { scale, spread } = getPerspective(e.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(e.x);
    const x = centerX + (baseX - centerX) * spread;

    const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp));
    const hitOffsetPx = e.hitFx > 0 ? -5 : 0;

    // ✅ snowball: 구형 + 그림자 + 숫자
    if (e.kind === "snowball") {
      const size = laneWidth * 0.78 * e.widthUnits;

      return (
        <div
          key={e.id}
          style={{
            position: "absolute",
            left: x,
            top: ypx,
            transform: `translate(-50%, -50%) translateY(${hitOffsetPx}px) scale(${scale})`,
            width: 120,
            height: 120,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -6,
              transform: "translateX(-50%)",
              width: size * 0.9,
              height: size * 0.28,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 70%)",
              filter: "blur(1px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 28%, rgba(255,255,255,1) 0%, rgba(245,245,245,0.98) 28%, rgba(210,210,210,0.95) 62%, rgba(170,170,170,0.92) 100%)",
              boxShadow:
                "inset -10px -14px 18px rgba(0,0,0,0.16), inset 8px 10px 16px rgba(255,255,255,0.35), 0 18px 22px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4a4c52ff",
              fontWeight: 800,
              fontSize: 45,
            }}
          >
            <span style={{ textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>
              {e.hp}
            </span>
          </div>

          {e.hitFx > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: 999,
                boxShadow: "0 0 18px rgba(180,255,255,0.65)",
                opacity: Math.min(1, e.hitFx / 0.18),
              }}
            />
          )}
        </div>
      );
    }

    // ✅ snowThrower: 중간에서 멈춰서 던지는 캐릭터(외형은 cssClass로)
    if (e.kind === "snowThrower") {
      return (
        <div
          key={e.id}
          style={{
            position: "absolute",
            left: x,
            top: ypx,
            transform: `translate(-50%, -50%) translateY(${hitOffsetPx}px) scale(${scale})`,
            width: laneWidth * 0.78 * e.widthUnits,
            height: 76,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter:
              e.hitFx > 0
                ? "drop-shadow(0 14px 16px rgba(95, 183, 255, 0.5))"
                : "drop-shadow(0 14px 16px rgba(0,0,0,0.35))",
            pointerEvents: "none",
          }}
        >
          {/* 바닥 그림자 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              width: laneWidth * 0.78 * e.widthUnits,
              height: 10,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.0) 70%)",
              filter: "blur(2px)",
            }}
          />

          {e.hitFx > 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: "0%",
                fontSize: 12,
                rotate: "40deg",
                fontWeight: 1000,
                padding: "2px 6px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                opacity: Math.min(1, e.hitFx / 0.18),
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 20,
              }}
            >
              {e.hitText}
            </div>
          )}
          {/* hp bar */}
          <div
            style={{
              position: "absolute",
              top: -10,
              left: 10,
              right: 10,
              height: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,0.22)",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: `${hpPct * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #93c5fd, #60a5fa)",
              }}
            />
          </div>

          <div className={ENEMY_SPECS[e.kind].cssClass} />
        </div>
      );
    }

    // ✅ default enemy
    return (
      <div
        key={e.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) translateY(${hitOffsetPx}px) scale(${scale})`,
          width: laneWidth * 0.78 * e.widthUnits,
          height: 76,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter:
            e.hitFx > 0
              ? "drop-shadow(0 14px 16px rgba(95, 255, 95, 0.5))"
              : "drop-shadow(0 14px 16px rgba(0,0,0,0.35))",
        }}
      >
        {/* 바닥 그림자 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            transform: "translateX(-50%)",
            width: laneWidth * 0.78 * e.widthUnits,
            height: 10,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.0) 70%)",
            filter: "blur(2px)",
          }}
        />

        {e.hitFx > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: "0%",
              fontSize: 12,
              rotate: "40deg",
              fontWeight: 1000,
              padding: "2px 6px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              opacity: Math.min(1, e.hitFx / 0.18),
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 20,
            }}
          >
            {e.hitText}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: -10,
            left: 10,
            right: 10,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.22)",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: `${hpPct * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #fb7185, #f97316)",
            }}
          />
        </div>

        <div className={ENEMY_SPECS[e.kind].cssClass} />
      </div>
    );
  };

  const renderEnemyShot = (s: EnemyShot) => {
    const ypx = projectYpx(s.y, farYRef.current);
    const { scale, spread } = getPerspective(s.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(s.x);
    const x = centerX + (baseX - centerX) * spread;

    const size = 22;

    return (
      <div
        key={s.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: size,
          height: size,
          pointerEvents: "none",
        }}
      >
        {/* ✅ 바닥 그림자 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -6,
            transform: "translateX(-50%)",
            width: size * 0.9,
            height: size * 0.28,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.0) 70%)",
            filter: "blur(2px)",
          }}
        />

        {/* ✅ 눈 본체 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 45%, rgba(200,200,200,1) 100%)",
            boxShadow:
              "inset -6px -8px 10px rgba(0,0,0,0.18), inset 6px 6px 10px rgba(255,255,255,0.4)",
          }}
        />
      </div>
    );
  };

  const renderBullet = (b: Bullet) => {
    const ypx = projectYpx(b.y, farYRef.current);
    const { scale, spread } = getPerspective(b.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(b.x);
    const x = centerX + (baseX - centerX) * spread;

    let beemHeight = 10;
    if (b.pierce) beemHeight = 24;

    return (
      <div
        key={b.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: 10,
          height: beemHeight,
          borderRadius: 8,
          background:
            b.weaponId === "shotgun"
              ? "linear-gradient(180deg, #b0d4ff, #60a5fa)"
              : "linear-gradient(180deg, #facc15, #f97316)",
          boxShadow: "0 10px 16px rgba(0,0,0,0.35)",
        }}
        className={BULLET_CLASS[b.weaponId]}
      />
    );
  };

  const renderItem = (it: Item) => {
    const ypx = projectYpx(it.y, farYRef.current);
    const { scale, spread } = getPerspective(it.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(it.x);
    const x = centerX + (baseX - centerX) * spread;

    const label =
      it.kind === "addClone"
        ? `+${it.count}`
        : it.kind === "weapon"
        ? it.weaponId === "rapid"
          ? "⚡"
          : it.weaponId === "pierce"
          ? "🟣"
          : "💥"
        : it.kind === "fireRateMul"
        ? "⏱️"
        : it.kind === "damageAdd"
        ? "🔺"
        : "🧿";

    let gunsName = "guns01";
    if (it.kind === "weapon") {
      if (it.weaponId === "rapid") gunsName = "guns02";
      else if (it.weaponId === "pierce") gunsName = "guns03";
      else if (it.weaponId === "shotgun") gunsName = "guns04";
      else gunsName = "guns01";
    }

    const bg = it.kind === "addClone" ? "#fff" : "unset";
    const color = it.kind === "addClone" ? "#07222e" : "#111";

    if (it.kind !== "weapon")
      return (
        <div
          key={it.id}
          style={{
            position: "absolute",
            left: x,
            top: ypx,
            transform: `translate(-50%, -50%) scale(${scale})`,
            width: 44,
            height: 44,
            borderRadius: 14,
            background: bg,
            boxShadow: "0 12px 18px rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: it.kind === "addClone" ? 18 : 22,
            fontWeight: it.kind === "addClone" ? 1000 : 700,
            color,
          }}
        >
          {label}
        </div>
      );

    return (
      <div
        key={it.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: 44,
          height: 44,
          borderRadius: 14,
          background: bg,
          boxShadow: "0 12px 18px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color,
        }}
      >
        <span className={`gunsCollect ${gunsName}`} />
      </div>
    );
  };

  // ✅ ItemBox render
  const renderBox = (bx: ItemBox) => {
    const ypx = projectYpx(bx.y, farYRef.current);
    const { scale, spread } = getPerspective(bx.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(bx.x);
    const x = centerX + (baseX - centerX) * spread;

    const hpPct = bx.maxHp > 0 ? clamp01(bx.hp / bx.maxHp) : 0;

    return (
      <div
        key={bx.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: laneWidth * 0.7 * bx.widthUnits,
          height: 64,
          borderRadius: 16,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 14px 18px rgba(0,0,0,0.34)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 1000,
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 10,
            right: 10,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${hpPct * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #60a5fa, #34d399)",
            }}
          />
        </div>

        <div style={{ fontSize: 20 }}>{`+${bx.reward}`}</div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            fontSize: 11,
            opacity: 0.85,
          }}
        >
          HIT {bx.hp}/{bx.maxHp}
        </div>
      </div>
    );
  };

  const isWeaponBlinking =
    world.combat.tempWeapon && world.combat.tempWeapon.timeLeft <= 1;

  const fireRate = 1 / activeWeapon.fireIntervalSec;
  const FIRE_RATE_LEVELS = [1.5, 2.2, 3.0, 3.8, 4.6];
  const speedLevel = valueToLevel(fireRate, FIRE_RATE_LEVELS);
  const powerLevel = valueToLevel(activeWeapon.damage, POWER_LEVELS);
  const playerWeaponClass = PLAYER_WEAPON_CLASS[activeWeapon.id];

  const StatBlocks = ({
    level,
    max = 5,
    color,
  }: {
    level: number;
    max?: number;
    color: string;
  }) => (
    <div style={{ display: "flex", gap: 1, flexDirection: "column-reverse" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 4,
            background: i < level ? color : "rgba(255,255,255,0.25)",
          }}
        />
      ))}
    </div>
  );

  let stageBg = "stagebg01";
  if (world.stage > 10) stageBg = "stagebg02";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        margin: "0 auto",
        overflow: "hidden",
        background: "#0b1020",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <style>{`
        .bg {
          position:absolute; inset:0;
          background-image: url("/bg/bg.jpg");
          background-repeat:no-repeat;
          background-position: center center;
          background-size: cover;
          filter: saturate(1.05) contrast(1.05);
          transform: scale(1.02);
        }
        .vignette {
          position:absolute; inset:0;
          background: radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 58%, rgba(0,0,0,0.62) 100%);
          pointer-events:none;
        }
      `}</style>
      <BackButton onExit={onExit} />
      <div className={`${stageBg}`} />
      <div className="vignette" />
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontWeight: 900,
          fontSize: 28,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        }}
      >
        STAGE {world.stage}
      </div>
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          color: "#35c6ffff",
          fontWeight: 900,
          fontSize: 18,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
          textAlign: "right",
        }}
      >
        총점수 {world.totalScore}
      </div>
      <div
        style={{
          position: "absolute",
          top: 34,
          right: 12,
          color: "rgba(255,255,255,0.9)",
          fontWeight: 900,
          fontSize: 12,
          textAlign: "right",
        }}
      >
        목표: {world.stageScore} / {target}
      </div>
      {/* currentBullet */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          width: 48,
          height: 48,
          borderRadius: 8,
          border: "2px solid #fff",
          backgroundColor: "#ffffff63",
        }}
      >
        <div className={isWeaponBlinking ? "weapon-blink" : ""}>
          {activeWeapon.name === "Pistol" && (
            <div className="gunsCollect guns01" />
          )}
          {activeWeapon.name === "Rapid" && (
            <div className="gunsCollect guns02" />
          )}
          {activeWeapon.name === "Pierce" && (
            <div className="gunsCollect guns03" />
          )}
          {activeWeapon.name === "Shotgun" && (
            <div className="gunsCollect guns04" />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            position: "absolute",
            left: -14,
            bottom: 4,
          }}
        >
          <StatBlocks level={speedLevel} max={5} color="#60a5fa" />
          <StatBlocks level={powerLevel} max={5} color="#29ffb8" />
        </div>
      </div>
      {/* entities */}
      {world.items.map(renderItem)}
      {world.bullets.map(renderBullet)}
      {world.enemyShots.map(renderEnemyShot)} {/* ✅ */}
      {world.boxes.map(renderBox)}
      {world.enemies.map(renderEnemy)}
      {/* players (leader + clones) */}
      <div
        style={{
          position: "absolute",
          left: xUnitsToPx(player.x),
          top: PLAYER_Y * HEIGHT,
          transform: "translate(-50%, -50%)",
          width: laneWidth * player.widthUnits,
          height: 100,
          zIndex: 120, // ✅ 플레이어 전체 레이어
          pointerEvents: "none",
          isolation: "isolate", // ✅ 내부 z-index 안정화
        }}
      >
        {/* ✅ HP BAR : 항상 최상단 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 56,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.2)",
            overflow: "hidden",
            boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
            zIndex: 999, // ✅ wrapper 내부 최상단
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: `${playerHpPct * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: "#57aeff",
            }}
          />
        </div>

        {units.map((u) => {
          const offsetX =
            u.id === 0 ? 0 : xUnitsToPx(u.x) - xUnitsToPx(player.x); // ✅ wrapper 기준 좌우 오프셋

          const offsetY = (u.y - PLAYER_Y) * HEIGHT;

          const isLeader = u.id === 0;
          const isHit = isLeader && hurtCooldownRef.current > 0;

          return (
            <div
              key={u.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${offsetX}px)`,
                top: `calc(50% + ${offsetY}px)`,
                transform: "translate(-50%, -50%)",
                width: laneWidth * player.widthUnits,
                height: 86,
                zIndex: isLeader ? 20 : 10, // 클론은 아래
                pointerEvents: "none",
              }}
            >
              {/* 바닥 그림자 */}
              <div className="player-shadow" />

              {/* 본체 */}
              <div
                className={`game_player ${playerWeaponClass} ${
                  isHit ? "player-hit" : ""
                }`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 0,
                  transform: "translateX(-50%)",
                  zIndex: 20,
                }}
              />

              {/* 피격 이펙트 (리더만) */}
              {isHit && (
                <div className="hit-blood">
                  <span className="b1" />
                  <span className="b2" />
                  <span className="b3" />
                  <span className="b4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* dialogs */}
      {world.mode !== "playing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            padding: 24,
            gap: 10,
            zIndex: 300,
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 6 }}>
            {world.mode === "gameover" ? "💀" : "🎉"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>
            {world.mode === "gameover" ? "GAME OVER" : "STAGE CLEAR"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.92 }}>
            STAGE {world.stage} · STAGE SCORE {world.stageScore} / {target}
          </div>
          <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 10 }}>
            TOTAL SCORE: {world.totalScore}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleRetry}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: 16,
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 14px 24px rgba(0,0,0,0.35)",
              }}
            >
              다시 시작
            </button>

            {world.mode === "cleared" && world.stage < MAX_STAGE && (
              <button
                onClick={handleNextStage}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 1000,
                  fontSize: 16,
                  background: "linear-gradient(180deg, #34d399, #059669)",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 14px 24px rgba(0,0,0,0.35)",
                }}
              >
                다음 STAGE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoombieGame;
