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
const NEXT_STAGE_STEP = 10;
const MAX_STAGE = 10;

// ===== Stacking enemies =====
const ANCHOR_Y = PLAYER_Y - 0.08;
const ANCHORED_ATTACK_INTERVAL = 0.65;
const PLAYER_GLOBAL_HURT_COOLDOWN = 0.18;

// ===== Drops (enemy) =====
// ✅ 적 드랍: 무기/버프만 (클론은 박스에서만)
const ENEMY_DROP_CHANCE = 0.28;

// ===== ItemBox =====
// ✅ 박스는 따로 스폰, 맞을 때마다 hp 감소, 0이면 +N 아이템 생성
const BOX_SPAWN_INTERVAL = 6.2; // 평균 스폰 간격(스테이지별로 바꾸고 싶으면 STAGES에 넣어도 됨)
const BOX_MAX_ALIVE = 2;
const BOX_SPEED = 0.12;
const BOX_STOP_Y = 0.26; // 이 위치에 도달하면 멈춰서 맞추기 쉽게
const BOX_WIDTH_UNITS = 1.1;
const BOX_HEIGHT_HIT_EPS_Y = 0.05; // 박스 피격 y 판정 폭(조금 넉넉히)

// 메인 포함 최대 20명 => 클론은 19명
const MAX_UNITS = 20;
const MAX_CLONES = MAX_UNITS - 1;

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
  //    - x는 0.25 단위로 커지고
  //    - y는 0.03 단위로 커짐
  //    - 조합을 쌓아가며 군집이 커짐
  const dxStep = 0.25;
  const dyStep = 0.03;

  // 레벨이 커질수록 바깥으로 확장 (level=1이면 기존 0.25~0.5 근처, level=2면 그 바깥...)
  for (let level = 2; slots.length < maxClones; level++) {
    const xs = [dxStep * level, dxStep * (level + 1)]; // 0.5,0.75 / 0.75,1.0 ...
    const ys = [0, dyStep, dyStep * 2, dyStep * 3]; // 0,0.03,0.06,0.09 (필요시 더 늘려도 됨)

    // 같은 느낌 유지: 좌우 대칭 + 위/아래 미세한 dy
    // 우선순위: 가운데에 가까운 조합부터 채워서 자연스럽게 커지게 함
    const candidates: Array<{ dx: number; dy: number }> = [];

    for (const x of xs) {
      for (const y of ys) {
        // y=0일 때는 (x,0)만
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

    // ✅ 중복 제거(안전)
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
};

const BOSS_MISSION = {
  stage: 10, // 10스테이지에서만
  kind: "king" as EnemyKind, // "king" | "queen" 등
  hp: 580, // ✅ 보스 체력
  speedMul: 0.65, // ✅ 이동 속도( BASE_ZOMBIE_SPEED * speedMul * stageSpeedMul )
  damage: 4, // ✅ 맞을 때 데미지
  widthUnits: 4.2, // ✅ 히트박스/크기
  attackInterval: 0.45, // ✅ 앵커 도착 후 공격 주기(기존 0.65보다 빠르게 가능)
  dropOnKill: true, // 필요하면 보상 드랍
};

type EnemyKind = "normal" | "teddy" | "fat" | "king" | "queen";

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
  hitFx: number; // 피격 연출 남은 시간(초)
  hitText: string; // 표시할 텍스트 (기본 "HIT")
  kind: EnemyKind; // ✅ 추가
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

const SPEED_LEVELS = [
  0.6, // 1단계
  0.7, // 2단계
  0.8, // 3단계
  0.9, // 4단계
];

const POWER_LEVELS = [
  1, // 1단계
  2, // 2단계
  3, // 3단계
  4, // 4단계
];

type ItemKind = "weapon" | "fireRateMul" | "damageAdd" | "pierce" | "addClone";

type BuffKind = "fireRateMul" | "damageAdd" | "pierce";
type Buff = { id: string; kind: BuffKind; value: number; timeLeft: number };

type CombatState = {
  baseWeaponId: WeaponId;
  tempWeapon?: { weaponId: WeaponId; timeLeft: number };
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
  hp: number; // 남은 타격 횟수
  maxHp: number;
  reward: 1 | 2 | 3; // +N
  widthUnits: number;
};

type BossState = {
  active: boolean; // 보스전인지
  spawned: boolean; // 보스 생성했는지
  bossId?: number; // 보스 enemy id
  kind: EnemyKind; // king/queen 등
};

type World = {
  stage: number;
  totalScore: number;
  stageScore: number;
  mode: Mode;
  enemies: Enemy[];
  bullets: Bullet[];
  items: Item[];
  boxes: ItemBox[]; // ✅ 추가
  combat: CombatState;

  boss?: BossState; // ✅ 추가
};

type CloneUnit = { id: number; slotIndex: number };

let enemyIdSeed = 1;
let bulletIdSeed = 1;
let itemIdSeed = 1;
let boxIdSeed = 1;
let cloneIdSeed = 1;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));

function stageTarget(stage: number) {
  return FIRST_STAGE_TARGET + (stage - 1) * NEXT_STAGE_STEP;
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

  const fireMul = combat.buffs
    .filter((b) => b.kind === "fireRateMul")
    .reduce((acc, b) => acc * b.value, 1);
  const damageAdd = combat.buffs
    .filter((b) => b.kind === "damageAdd")
    .reduce((acc, b) => acc + b.value, 0);
  const hasPierce =
    base.pierce ||
    combat.buffs.some((b) => b.kind === "pierce" && b.timeLeft > 0);

  return {
    ...base,
    fireIntervalSec: Math.max(0.06, base.fireIntervalSec * fireMul),
    damage: Math.max(1, base.damage + damageAdd),
    pierce: hasPierce,
  };
}

function applyItem(combat: CombatState, item: Item): CombatState {
  if (item.kind === "weapon") {
    const w = WEAPONS[item.weaponId];
    const dur = w.durationSec ?? 6;
    return {
      ...combat,
      tempWeapon: { weaponId: item.weaponId, timeLeft: dur },
    };
  }
  if (item.kind === "fireRateMul") {
    return {
      ...combat,
      buffs: [
        ...combat.buffs,
        {
          id: crypto.randomUUID(),
          kind: "fireRateMul",
          value: item.mul,
          timeLeft: item.durationSec,
        },
      ],
    };
  }
  if (item.kind === "damageAdd") {
    return {
      ...combat,
      buffs: [
        ...combat.buffs,
        {
          id: crypto.randomUUID(),
          kind: "damageAdd",
          value: item.add,
          timeLeft: item.durationSec,
        },
      ],
    };
  }
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
  const hp = reward; // 예: +3 박스면 3번 맞추면 변환
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
    boxes: [], // ✅
    combat: { baseWeaponId: "pistol", buffs: [] },

    boss: { active: false, spawned: false, kind: "king" }, // ✅
  }));
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  const lastTimeRef = useRef<number | null>(null);
  const spawnAccRef = useRef(0);
  const fireAccRef = useRef(0);

  const boxSpawnAccRef = useRef(0); // ✅ 박스 스폰 타이머

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
    STAGES[
      Math.max(0, Math.min(STAGES.length - 1, worldRef.current.stage - 1))
    ];

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

    // (선택) 스테이지 속도만 반영하고 싶으면 cfg.speedMul 같이 곱하면 됨
    const speed = BASE_ZOMBIE_SPEED * spec.speedMul * cfg.speedMul;

    const widthUnits = spec.widthUnits;
    const halfW = widthUnits / 2;
    const x = halfW + Math.random() * (LANE_COUNT - 2 * halfW);

    return {
      id: enemyIdSeed++,
      kind,
      tier: 1, // 이제 tier 의미가 약해지면 지워도 됨(원하면 유지)
      x,
      y: farYRef.current,
      hp: spec.hp,
      maxHp: spec.hp,
      speed,
      widthUnits,
      damage: spec.damage,
      anchored: false,
      attackAcc: 0,
      hitFx: 0,
      hitText: "HIT",
    };
  };

  const makeBoss = (): Enemy => {
    const cfg = currentStageCfg();

    const halfW = BOSS_MISSION.widthUnits / 2;
    const x = halfW + Math.random() * (LANE_COUNT - 2 * halfW);

    return {
      id: enemyIdSeed++,
      kind: BOSS_MISSION.kind,
      tier: 3,
      x,
      y: farYRef.current,
      hp: BOSS_MISSION.hp,
      maxHp: BOSS_MISSION.hp,
      speed: BASE_ZOMBIE_SPEED * BOSS_MISSION.speedMul * cfg.speedMul,
      widthUnits: BOSS_MISSION.widthUnits,
      damage: BOSS_MISSION.damage,
      anchored: false,
      attackAcc: 0,
      hitFx: 0,
      hitText: "BOSS",
    };
  };

  const spawnEnemies = (dt: number) => {
    if (worldRef.current.boss?.active) return; // ✅ 추가
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
    if (worldRef.current.boss?.active) return; // ✅ 추가
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
      spawnBoxes(dt); // ✅ 박스 스폰
      fireIfReady(dt);

      setWorld((prev) => {
        if (prev.mode !== "playing") return prev;

        // enemies move (anchored stack)
        let enemies = prev.enemies.map((e) => {
          const nextHitFx = Math.max(0, (e.hitFx ?? 0) - dt);

          if (!e.anchored) {
            const ny = e.y + e.speed * dt;
            if (ny >= ANCHOR_Y)
              return {
                ...e,
                y: ANCHOR_Y,
                anchored: true,
                attackAcc: 0,
                hitFx: nextHitFx,
              };
            return { ...e, y: ny, hitFx: nextHitFx };
          }

          return {
            ...e,
            y: ANCHOR_Y,
            attackAcc: e.attackAcc + dt,
            hitFx: nextHitFx,
          };
        });

        let boxes = prev.boxes.map((b) => ({
          ...b,
          y: b.y + BOX_SPEED * dt,
        }));

        // bullets move up
        let bullets = prev.bullets.map((b) => ({
          ...b,
          y: b.y - b.speed * dt,
        }));
        bullets = bullets.filter(
          (b) => b.y > FAR_Y_DEFAULT - 0.35 && b.y < DESPAWN_Y
        );

        // items fall down slowly
        let items = prev.items.map((it) => ({ ...it, y: it.y + 0.16 * dt }));

        const deadEnemyIds = new Set<number>();
        const deadBulletIds = new Set<number>();
        const deadBoxIds = new Set<number>();

        // ✅ 보스전이면 보스 1회 생성 (딱 1마리)
        if (prev.boss?.active && !prev.boss.spawned) {
          const boss = makeBoss();
          enemies = [...enemies, boss];
          boxes = []; // 보스전은 박스 제거(원하면 유지 가능)

          return {
            ...prev,
            enemies,
            boxes,
            bullets,
            items,
            boss: { ...prev.boss, spawned: true, bossId: boss.id },
          };
        }

        const spawnedFromBox: Item[] = [];

        // ===== bullet -> box collision (먼저 처리해도 되고, 적 먼저 처리해도 됨) =====
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
              // 박스 hp 감소 (1방당 -1)
              box.hp -= 1;

              if (!b.pierce) deadBulletIds.add(b.id);

              // hp 0되면 +N 아이템으로 변환
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

        // ===== bullet -> enemy collision =====
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

              // ✅ 피격 연출 ON
              e.hitFx = 0.25;
              e.hitText = "HIT"; // 원하면 `-${b.damage}` 같은 것도 가능

              if (!b.pierce) deadBulletIds.add(b.id);
              if (e.hp <= 0) deadEnemyIds.add(e.id);
              if (!b.pierce) break;
            }
          }
        }

        // kills + enemy drops(클론 제외)
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

        // ===== item pickup (player) =====
        const pickedItemIds = new Set<number>();
        let nextCombat = prev.combat;

        // ✅ 보스가 죽었으면 최종 클리어
        const bossId = prev.boss?.bossId;
        const bossDied =
          prev.boss?.active && bossId != null && deadEnemyIds.has(bossId);

        if (bossDied) {
          return {
            ...prev,
            mode: "cleared",
            enemies: [],
            bullets: [],
            boxes: [],
            items,
            combat: nextCombat,
            totalScore: prev.totalScore + kills,
            stageScore: prev.stageScore + kills,
            boss: { ...prev.boss!, active: false },
          };
        }

        const units = getAllPlayerUnitsRef();

        // 아이템 하나를 어떤 유닛이든 먹으면 사라지게
        for (const it of items) {
          // y 먼저 체크해서 연산 줄이기
          if (Math.abs(it.y - PLAYER_Y) >= 0.06) continue;

          let picked = false;

          for (const u of units) {
            const dx = Math.abs(it.x - u.x);
            const dy = Math.abs(it.y - u.y);

            // ✅ 유닛 중심 기준 픽업 판정
            const inX = dx < playerRef.current.widthUnits * 0.7;
            const inY = dy < 0.07;

            if (inX && inY) {
              picked = true;
              break;
            }
          }

          if (!picked) continue;

          // ✅ addClone 먹으면: 적용 + 아이템 제거
          if (it.kind === "addClone") {
            if (!consumedCloneItemIdsRef.current.has(it.id)) {
              consumedCloneItemIdsRef.current.add(it.id);
              addClones(it.count);
            }
            pickedItemIds.add(it.id);
            continue;
          }

          // ✅ 나머지 아이템도 먹으면 제거
          pickedItemIds.add(it.id);
          nextCombat = applyItem(nextCombat, it);
        }

        // ✅ 먹은 아이템은 화면에서 제거
        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        // ===== anchored enemies attack =====
        let totalDamage = 0;

        const setPlayerHp = (nextHp: number) => {
          // ✅ ref를 먼저 최신으로 만들어서, 같은 프레임 계산이 꼬이지 않게
          playerRef.current = { ...playerRef.current, hp: nextHp };
          setPlayer((p) => ({ ...p, hp: nextHp }));
        };

        if (hurtCooldownRef.current <= 0) {
          for (const e of enemies) {
            const interval =
              prev.boss?.active && prev.boss.bossId === e.id
                ? BOSS_MISSION.attackInterval
                : ANCHORED_ATTACK_INTERVAL;

            if (!e.anchored) continue;

            if (e.attackAcc >= interval) {
              const times = Math.floor(e.attackAcc / interval);
              totalDamage += times * e.damage;
              e.attackAcc = e.attackAcc - times * interval;
            }
          }

          if (totalDamage > 0) {
            const nextHp = Math.max(0, playerRef.current.hp - totalDamage);
            setPlayerHp(nextHp);

            if (nextHp <= 0) {
              return {
                ...prev,
                mode: "gameover",
                enemies,
                bullets,
                items,
                boxes,
                combat: nextCombat,
                totalScore: prev.totalScore + kills,
                stageScore: prev.stageScore + kills,
              };
            }
          }
        }

        const nextStageScore = prev.stageScore + kills;
        const nextTotalScore = prev.totalScore + kills;

        const target = stageTarget(prev.stage);
        // ✅ 보스전 중에는 stageTarget으로 클리어 처리하면 안 됨
        if (!prev.boss?.active && nextStageScore >= target) {
          // ✅ 10스테이지면 보스전으로 전환(클리어 아님)
          if (prev.stage === BOSS_MISSION.stage && !prev.boss?.active) {
            return {
              ...prev,
              mode: "playing",
              totalScore: nextTotalScore,

              // ✅ 중요: 보스전 들어갈 때 stageScore를 0으로 리셋(권장)
              stageScore: 0,

              enemies: [],
              boxes: [],
              bullets,
              items,

              boss: { active: true, spawned: false, kind: BOSS_MISSION.kind },
            };
          }

          // ✅ 그 외 스테이지는 기존처럼 클리어
          return {
            ...prev,
            mode: "cleared",
            enemies,
            bullets,
            items,
            boxes,
            combat: nextCombat,
            totalScore: nextTotalScore,
            stageScore: nextStageScore,
          };
        }

        return {
          ...prev,
          enemies,
          bullets,
          items,
          boxes,
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
      combat: { baseWeaponId: "pistol", buffs: [] },

      boss: { active: false, spawned: false, kind: BOSS_MISSION.kind }, // ✅ 추가
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

    const hitOffsetPx = e.hitFx > 0 ? -5 : 0; // 1px 뒤로(위로) 살짝

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

  const renderBullet = (b: Bullet) => {
    const ypx = projectYpx(b.y, farYRef.current);
    const { scale, spread } = getPerspective(b.y, farYRef.current);
    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(b.x);
    const x = centerX + (baseX - centerX) * spread;
    let beemHeight = 10;
    if (b.pierce) {
      beemHeight = 24;
    }

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
      if (it.weaponId === "rapid") {
        gunsName = "guns02";
      } else if (it.weaponId === "pierce") {
        gunsName = "guns03";
      } else if (it.weaponId === "shotgun") {
        gunsName = "guns04";
      } else {
        gunsName = "guns01";
      }
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

    if (it.kind === "weapon") {
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
    }
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

  const fireRate = 1 / activeWeapon.fireIntervalSec; // shots per sec

  const FIRE_RATE_LEVELS = [1.5, 2.2, 3.0, 3.8, 4.6]; // 원하는 기준으로 조절
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
      <div className="bg" />
      <div className="vignette" />
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          color: "#fff",
          fontWeight: 900,
          fontSize: 14,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        }}
      >
        STAGE {world.stage} / {MAX_STAGE}
      </div>
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          color: "#fff",
          fontWeight: 900,
          fontSize: 14,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
          textAlign: "right",
        }}
      >
        TOTAL {world.totalScore}
      </div>
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 12,
          color: "rgba(255,255,255,0.9)",
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        WEAPON: {activeWeapon.name} {activeWeapon.pierce ? "· PIERCE" : ""}{" "}
        {activeWeapon.id === "shotgun"
          ? `· SPREAD ${activeWeapon.spreadUnits}`
          : ""}
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
        STAGE SCORE: {world.stageScore} / {target}
      </div>
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 12,
          color: "rgba(255,255,255,0.9)",
          fontWeight: 900,
          fontSize: 12,
        }}
      >
        SQUAD: {1 + clones.length}
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

        {/* 스탯 블록 */}
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
          {/* SPEED */}
          <StatBlocks level={speedLevel} max={5} color="#60a5fa" />

          {/* POWER */}
          <StatBlocks level={powerLevel} max={5} color="#29ffb8" />
        </div>
      </div>
      {/* entities */}
      {world.items.map(renderItem)}
      {world.bullets.map(renderBullet)}
      {world.boxes.map(renderBox)} {/* ✅ */}
      {world.enemies.map(renderEnemy)}
      {/* players (leader + clones) */}
      {units.map((u) => {
        const xpx = xUnitsToPx(u.x);
        const ypx = u.y * HEIGHT;
        const BASE_PLAYER_Z = 100;
        const zIndex =
          u.id === 0
            ? BASE_PLAYER_Z
            : BASE_PLAYER_Z +
              1 +
              (clones.find((c) => c.id === u.id)?.slotIndex ?? 0);

        return (
          <div
            key={u.id}
            style={{
              position: "absolute",
              left: xpx,
              top: ypx,
              transform: "translate(-50%, -50%)",
              width: laneWidth * player.widthUnits,
              height: 86,
              zIndex,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {/* HP over head */}
            <div
              style={{
                position: "absolute",
                bottom: 62,
                width: 56,
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.2)",
                overflow: "hidden",
                boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
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

            <div
              style={{
                outline:
                  hurtCooldownRef.current > 0
                    ? "2px solid rgba(248,113,113,0.9)"
                    : "none",
              }}
              className={`game_player ${playerWeaponClass}`}
            />
          </div>
        );
      })}
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
