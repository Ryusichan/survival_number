import React, { useEffect, useMemo, useRef, useState } from "react";
import BackButton from "components/item/BackButton";
import {
  JetpackSvg,
  JetpackFlameSvg,
  ScoutUfo,
  FighterUfo,
  BomberUfo,
  CarrierUfo,
  EliteUfo,
  SpaceBossSvg,
  FireScoutUfo,
  FireFighterUfo,
  FireBomberUfo,
  FireCarrierUfo,
  FireEliteUfo,
  FireBossSvg,
  DarkScoutUfo,
  DarkFighterUfo,
  DarkBomberUfo,
  DarkCarrierUfo,
  DarkEliteUfo,
  DarkBossSvg,
  EnemyBulletSvg,
  ItemWeaponSvg,
  ItemShotgunSvg,
  ItemLaserSvg,
  ItemPierceSvg,
  ItemHealPillSvg,
} from "./spaceSvgAssets";

/* =========================================================
   Types
   ========================================================= */
type WeaponId = "pistol" | "laser" | "pierce" | "shotgun";
type Weapon = {
  id: WeaponId;
  fireIntervalSec: number;
  bulletSpeed: number;
  pierce: boolean;
  pellets: number;
  damage: number;
  spreadUnits?: number;
};
type CombatState = {
  weaponId: WeaponId;
  weaponLevel: 1 | 2 | 3;
};
type Item =
  | { id: number; x: number; y: number; kind: "weapon"; weaponId: WeaponId }
  | { id: number; x: number; y: number; kind: "heal" }
  | { id: number; x: number; y: number; kind: "bomb" };

type BombProjectile = {
  x: number;
  y: number;
  speed: number;
  targetY: number;
};
type ActiveNuke = {
  x: number;
  y: number;
  t: number;
  duration: number;
  dps: number;
  radiusUnits: number;
  dmgAcc: number;
};

type Mode = "playing" | "paused" | "cleared" | "gameover" | "chapter";

type SpaceEnemyKind =
  | "scout"
  | "fighter"
  | "bomber"
  | "carrier"
  | "elite"
  | "spaceBoss"
  | "fireScout"
  | "fireFighter"
  | "fireBomber"
  | "fireCarrier"
  | "fireElite"
  | "fireBoss"
  | "darkScout"
  | "darkFighter"
  | "darkBomber"
  | "darkCarrier"
  | "darkElite"
  | "darkBoss";

type SpaceEnemy = {
  id: number;
  kind: SpaceEnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  widthUnits: number;
  damage: number;
  hitFx: number;
  pattern: "straight" | "zigzag" | "swoop" | "hover";
  patternPhase: number;
  patternAmp: number;
  patternFreq: number;
  fireAcc: number;
  fireInterval: number;
  // boss
  bossPhase?: number;
  bossPatternIdx?: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  size: number;
  t: number; // elapsed time
  duration: number; // total lifetime
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: boolean;
  weaponId: WeaponId;
};

type EnemyBullet = {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
};

type Player = {
  x: number;
  y: number;
  widthUnits: number;
  hp: number;
  maxHp: number;
};
type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
};

/* =========================================================
   Constants
   ========================================================= */
const LANE_COUNT = 5;
const MAX_WIDTH = 480;
const PLAYER_WIDTH = 0.9;
/** 플레이어 피격 반지름 (총알 판정, 게임 유닛) */
const PLAYER_HIT_R = 0.03;
/** 플레이어 피격 범위 — 적 몸체 y축 거리 */
const PLAYER_HIT_BODY_Y = 0.03;
const PLAYER_Y_MIN = 0.25;
const PLAYER_Y_MAX = 0.92;
const FIRST_STAGE_TARGET = 20;
const NEXT_STAGE_STEP = 3;
const MAX_STAGE = 30;
const ENEMY_DROP_CHANCE = 0.1;
const ITEM_SPEED = 0.18;

const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol",
    fireIntervalSec: 0.5,
    bulletSpeed: 1.2,
    pierce: false,
    pellets: 1,
    damage: 1,
  },
  laser: {
    id: "laser",
    fireIntervalSec: 0.05,
    bulletSpeed: 0,
    pierce: false,
    pellets: 0,
    damage: 2,
  },
  pierce: {
    id: "pierce",
    fireIntervalSec: 0.6,
    bulletSpeed: 1.3,
    pierce: true,
    pellets: 1,
    damage: 1,
  },
  shotgun: {
    id: "shotgun",
    fireIntervalSec: 0.55,
    bulletSpeed: 1.1,
    pierce: false,
    pellets: 5,
    damage: 1,
    spreadUnits: 1.2,
  },
};

type SpaceEnemySpec = {
  hp: number;
  speed: number;
  damage: number;
  widthUnits: number;
  fireInterval: number;
  pattern: SpaceEnemy["pattern"];
};

const ENEMY_SPECS: Record<SpaceEnemyKind, SpaceEnemySpec> = {
  scout: {
    hp: 1,
    speed: 0.15,
    damage: 1,
    widthUnits: 0.8,
    fireInterval: 0,
    pattern: "straight",
  },
  fighter: {
    hp: 4,
    speed: 0.11,
    damage: 1,
    widthUnits: 1.0,
    fireInterval: 2.5,
    pattern: "zigzag",
  },
  bomber: {
    hp: 10,
    speed: 0.08,
    damage: 1,
    widthUnits: 1.4,
    fireInterval: 3.0,
    pattern: "straight",
  },
  carrier: {
    hp: 15,
    speed: 0.06,
    damage: 1,
    widthUnits: 1.8,
    fireInterval: 3.5,
    pattern: "hover",
  },
  elite: {
    hp: 5,
    speed: 0.13,
    damage: 1,
    widthUnits: 1.0,
    fireInterval: 2.0,
    pattern: "zigzag",
  },
  spaceBoss: {
    hp: 500,
    speed: 0.04,
    damage: 2,
    widthUnits: 3.2,
    fireInterval: 0.6,
    pattern: "hover",
  },
  // === Chapter 2: Fire (빠르고 공격적) ===
  fireScout: {
    hp: 2,
    speed: 0.2,
    damage: 1,
    widthUnits: 0.8,
    fireInterval: 0,
    pattern: "straight",
  },
  fireFighter: {
    hp: 6,
    speed: 0.14,
    damage: 1,
    widthUnits: 1.0,
    fireInterval: 2.0,
    pattern: "zigzag",
  },
  fireBomber: {
    hp: 9,
    speed: 0.1,
    damage: 2,
    widthUnits: 1.4,
    fireInterval: 2.5,
    pattern: "straight",
  },
  fireCarrier: {
    hp: 18,
    speed: 0.07,
    damage: 1,
    widthUnits: 1.8,
    fireInterval: 3.0,
    pattern: "hover",
  },
  fireElite: {
    hp: 6,
    speed: 0.16,
    damage: 2,
    widthUnits: 1.0,
    fireInterval: 1.6,
    pattern: "zigzag",
  },
  fireBoss: {
    hp: 800,
    speed: 0.04,
    damage: 2,
    widthUnits: 3.4,
    fireInterval: 0.6,
    pattern: "hover",
  },
  // === Chapter 3: Dark (탱키, 고데미지) ===
  darkScout: {
    hp: 4,
    speed: 0.12,
    damage: 1,
    widthUnits: 0.9,
    fireInterval: 0,
    pattern: "straight",
  },
  darkFighter: {
    hp: 8,
    speed: 0.1,
    damage: 1,
    widthUnits: 1.1,
    fireInterval: 2.2,
    pattern: "zigzag",
  },
  darkBomber: {
    hp: 16,
    speed: 0.07,
    damage: 2,
    widthUnits: 1.5,
    fireInterval: 2.8,
    pattern: "straight",
  },
  darkCarrier: {
    hp: 20,
    speed: 0.05,
    damage: 1,
    widthUnits: 2.0,
    fireInterval: 3.2,
    pattern: "hover",
  },
  darkElite: {
    hp: 10,
    speed: 0.11,
    damage: 2,
    widthUnits: 1.1,
    fireInterval: 1.8,
    pattern: "zigzag",
  },
  darkBoss: {
    hp: 1200,
    speed: 0.035,
    damage: 3,
    widthUnits: 3.6,
    fireInterval: 0.55,
    pattern: "hover",
  },
};

type StageRule = {
  spawnInterval: number;
  maxAlive: number;
  batchMin: number;
  batchMax: number;
  kindWeights: Partial<Record<SpaceEnemyKind, number>>;
  hpMul: number;
  speedMul: number;
  isBoss?: boolean;
};

const STAGE_RULES: StageRule[] = [
  /* 1  */ {
    spawnInterval: 1.8,
    maxAlive: 8,
    batchMin: 2,
    batchMax: 3,
    kindWeights: { scout: 0.9, fighter: 0.1 },
    hpMul: 1.0,
    speedMul: 1.0,
  },
  /* 2  */ {
    spawnInterval: 1.5,
    maxAlive: 10,
    batchMin: 2,
    batchMax: 4,
    kindWeights: { scout: 0.6, fighter: 0.4 },
    hpMul: 1.1,
    speedMul: 1.02,
  },
  /* 3  */ {
    spawnInterval: 1.4,
    maxAlive: 10,
    batchMin: 2,
    batchMax: 4,
    kindWeights: { scout: 0.4, fighter: 0.35, bomber: 0.25 },
    hpMul: 1.2,
    speedMul: 1.04,
  },
  /* 4  */ {
    spawnInterval: 1.3,
    maxAlive: 12,
    batchMin: 3,
    batchMax: 5,
    kindWeights: { scout: 0.3, fighter: 0.3, bomber: 0.2, carrier: 0.2 },
    hpMul: 1.3,
    speedMul: 1.06,
  },
  /* 5  */ {
    spawnInterval: 1.2,
    maxAlive: 12,
    batchMin: 3,
    batchMax: 5,
    kindWeights: { scout: 0.2, fighter: 0.3, bomber: 0.2, elite: 0.3 },
    hpMul: 1.4,
    speedMul: 1.08,
  },
  /* 6  */ {
    spawnInterval: 1.1,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      scout: 0.15,
      fighter: 0.3,
      bomber: 0.2,
      carrier: 0.15,
      elite: 0.2,
    },
    hpMul: 1.5,
    speedMul: 1.1,
  },
  /* 7  */ {
    spawnInterval: 1.0,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 6,
    kindWeights: { fighter: 0.3, bomber: 0.25, carrier: 0.2, elite: 0.25 },
    hpMul: 1.6,
    speedMul: 1.12,
  },
  /* 8  */ {
    spawnInterval: 0.9,
    maxAlive: 16,
    batchMin: 4,
    batchMax: 6,
    kindWeights: { fighter: 0.25, bomber: 0.25, carrier: 0.2, elite: 0.3 },
    hpMul: 1.7,
    speedMul: 1.14,
  },
  /* 9  */ {
    spawnInterval: 0.8,
    maxAlive: 16,
    batchMin: 4,
    batchMax: 7,
    kindWeights: { fighter: 0.2, bomber: 0.3, carrier: 0.2, elite: 0.3 },
    hpMul: 1.8,
    speedMul: 1.16,
  },
  /* 10 */ {
    spawnInterval: 0.3,
    maxAlive: 1,
    batchMin: 1,
    batchMax: 1,
    kindWeights: { spaceBoss: 1 },
    hpMul: 1.0,
    speedMul: 1.0,
    isBoss: true,
  },
  // === CHAPTER 2: FIRE (stages 11-20) ===
  /* 11 */ {
    spawnInterval: 1.6,
    maxAlive: 10,
    batchMin: 2,
    batchMax: 4,
    kindWeights: { fireScout: 0.8, fireFighter: 0.2 },
    hpMul: 1.0,
    speedMul: 1.0,
  },
  /* 12 */ {
    spawnInterval: 1.4,
    maxAlive: 12,
    batchMin: 2,
    batchMax: 4,
    kindWeights: { fireScout: 0.5, fireFighter: 0.4, fireBomber: 0.1 },
    hpMul: 1.1,
    speedMul: 1.03,
  },
  /* 13 */ {
    spawnInterval: 1.3,
    maxAlive: 12,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      fireScout: 0.3,
      fireFighter: 0.35,
      fireBomber: 0.25,
      fireCarrier: 0.1,
    },
    hpMul: 1.2,
    speedMul: 1.06,
  },
  /* 14 */ {
    spawnInterval: 1.2,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      fireScout: 0.2,
      fireFighter: 0.3,
      fireBomber: 0.2,
      fireCarrier: 0.2,
      fireElite: 0.1,
    },
    hpMul: 1.3,
    speedMul: 1.08,
  },
  /* 15 */ {
    spawnInterval: 1.1,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      fireScout: 0.15,
      fireFighter: 0.25,
      fireBomber: 0.2,
      fireCarrier: 0.15,
      fireElite: 0.25,
    },
    hpMul: 1.4,
    speedMul: 1.1,
  },
  /* 16 */ {
    spawnInterval: 1.0,
    maxAlive: 16,
    batchMin: 3,
    batchMax: 6,
    kindWeights: {
      fireFighter: 0.25,
      fireBomber: 0.25,
      fireCarrier: 0.2,
      fireElite: 0.3,
    },
    hpMul: 1.5,
    speedMul: 1.12,
  },
  /* 17 */ {
    spawnInterval: 0.9,
    maxAlive: 16,
    batchMin: 4,
    batchMax: 6,
    kindWeights: {
      fireFighter: 0.2,
      fireBomber: 0.25,
      fireCarrier: 0.2,
      fireElite: 0.35,
    },
    hpMul: 1.6,
    speedMul: 1.14,
  },
  /* 18 */ {
    spawnInterval: 0.8,
    maxAlive: 18,
    batchMin: 4,
    batchMax: 7,
    kindWeights: {
      fireFighter: 0.15,
      fireBomber: 0.3,
      fireCarrier: 0.2,
      fireElite: 0.35,
    },
    hpMul: 1.7,
    speedMul: 1.16,
  },
  /* 19 */ {
    spawnInterval: 0.7,
    maxAlive: 18,
    batchMin: 4,
    batchMax: 7,
    kindWeights: { fireBomber: 0.25, fireCarrier: 0.25, fireElite: 0.5 },
    hpMul: 1.85,
    speedMul: 1.18,
  },
  /* 20 */ {
    spawnInterval: 0.3,
    maxAlive: 1,
    batchMin: 1,
    batchMax: 1,
    kindWeights: { fireBoss: 1 },
    hpMul: 1.0,
    speedMul: 1.0,
    isBoss: true,
  },
  // === CHAPTER 3: DARK (stages 21-30) ===
  /* 21 */ {
    spawnInterval: 1.5,
    maxAlive: 10,
    batchMin: 2,
    batchMax: 4,
    kindWeights: { darkScout: 0.7, darkFighter: 0.3 },
    hpMul: 1.0,
    speedMul: 1.0,
  },
  /* 22 */ {
    spawnInterval: 1.3,
    maxAlive: 12,
    batchMin: 3,
    batchMax: 4,
    kindWeights: { darkScout: 0.4, darkFighter: 0.4, darkBomber: 0.2 },
    hpMul: 1.1,
    speedMul: 1.03,
  },
  /* 23 */ {
    spawnInterval: 1.2,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      darkScout: 0.25,
      darkFighter: 0.3,
      darkBomber: 0.25,
      darkCarrier: 0.2,
    },
    hpMul: 1.2,
    speedMul: 1.06,
  },
  /* 24 */ {
    spawnInterval: 1.1,
    maxAlive: 14,
    batchMin: 3,
    batchMax: 5,
    kindWeights: {
      darkScout: 0.15,
      darkFighter: 0.25,
      darkBomber: 0.2,
      darkCarrier: 0.2,
      darkElite: 0.2,
    },
    hpMul: 1.3,
    speedMul: 1.08,
  },
  /* 25 */ {
    spawnInterval: 1.0,
    maxAlive: 16,
    batchMin: 3,
    batchMax: 6,
    kindWeights: {
      darkScout: 0.1,
      darkFighter: 0.2,
      darkBomber: 0.2,
      darkCarrier: 0.2,
      darkElite: 0.3,
    },
    hpMul: 1.45,
    speedMul: 1.1,
  },
  /* 26 */ {
    spawnInterval: 0.9,
    maxAlive: 16,
    batchMin: 4,
    batchMax: 6,
    kindWeights: {
      darkFighter: 0.2,
      darkBomber: 0.25,
      darkCarrier: 0.2,
      darkElite: 0.35,
    },
    hpMul: 1.6,
    speedMul: 1.12,
  },
  /* 27 */ {
    spawnInterval: 0.85,
    maxAlive: 18,
    batchMin: 4,
    batchMax: 7,
    kindWeights: {
      darkFighter: 0.15,
      darkBomber: 0.25,
      darkCarrier: 0.25,
      darkElite: 0.35,
    },
    hpMul: 1.75,
    speedMul: 1.14,
  },
  /* 28 */ {
    spawnInterval: 0.75,
    maxAlive: 18,
    batchMin: 4,
    batchMax: 7,
    kindWeights: { darkBomber: 0.2, darkCarrier: 0.25, darkElite: 0.55 },
    hpMul: 1.9,
    speedMul: 1.16,
  },
  /* 29 */ {
    spawnInterval: 0.65,
    maxAlive: 20,
    batchMin: 5,
    batchMax: 8,
    kindWeights: { darkBomber: 0.2, darkCarrier: 0.3, darkElite: 0.5 },
    hpMul: 2.1,
    speedMul: 1.18,
  },
  /* 30 */ {
    spawnInterval: 0.3,
    maxAlive: 1,
    batchMin: 1,
    batchMax: 1,
    kindWeights: { darkBoss: 1 },
    hpMul: 1.0,
    speedMul: 1.0,
    isBoss: true,
  },
];

/* =========================================================
   Utilities
   ========================================================= */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));
const randFloat = (a: number, b: number) => a + Math.random() * (b - a);

const BOSS_KINDS = new Set<SpaceEnemyKind>([
  "spaceBoss",
  "fireBoss",
  "darkBoss",
]);
const ELITE_KINDS = new Set<SpaceEnemyKind>([
  "elite",
  "fireElite",
  "darkElite",
]);
function isBossKind(kind: SpaceEnemyKind) {
  return BOSS_KINDS.has(kind);
}
function isBossStage(stage: number) {
  return stage === 10 || stage === 20 || stage === 30;
}
function getChapter(stage: number): 1 | 2 | 3 {
  return stage <= 10 ? 1 : stage <= 20 ? 2 : 3;
}
function getChapterInfo(stage: number) {
  const ch = getChapter(stage);
  if (ch === 1)
    return {
      name: "SPACE ZONE",
      subtitle: "우주의 외계인들",
      color: "#60a5fa",
      glowColor: "rgba(100,150,255,0.5)",
    };
  if (ch === 2)
    return {
      name: "FIRE ZONE",
      subtitle: "불의 외계인들",
      color: "#f97316",
      glowColor: "rgba(255,120,30,0.5)",
    };
  return {
    name: "DARK ZONE",
    subtitle: "어둠의 외계인들",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.5)",
  };
}

function stageTarget(stage: number) {
  if (isBossStage(stage)) return 1;
  const idx = (stage - 1) % 10;
  return FIRST_STAGE_TARGET + idx * NEXT_STAGE_STEP;
}

function getActiveWeapon(combat: CombatState): Weapon {
  const base = WEAPONS[combat.weaponId];
  const lv = combat.weaponLevel;
  return {
    ...base,
    damage: base.damage + (lv - 1),
  };
}

function applyItem(combat: CombatState, item: Item): CombatState {
  if (item.kind === "weapon") {
    if (item.weaponId === combat.weaponId) {
      // 같은 무기 → 레벨업 (최대 3)
      return {
        ...combat,
        weaponLevel: Math.min(3, combat.weaponLevel + 1) as 1 | 2 | 3,
      };
    }
    // 다른 무기 → 교체 (레벨 1)
    return { ...combat, weaponId: item.weaponId, weaponLevel: 1 };
  }
  return combat;
}

function segmentCircleHit(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
) {
  const abx = bx - ax,
    aby = by - ay;
  const acx = cx - ax,
    acy = cy - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 <= 0 ? 0 : clamp((acx * abx + acy * aby) / len2, 0, 1);
  const hx = ax + abx * t,
    hy = ay + aby * t;
  const dx = cx - hx,
    dy = cy - hy;
  return dx * dx + dy * dy <= r * r;
}

function pickKind(
  weights: Partial<Record<SpaceEnemyKind, number>>,
): SpaceEnemyKind {
  const entries = Object.entries(weights) as [SpaceEnemyKind, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

let _eid = 0;
let _bid = 0;
let _iid = 0;

function makeEnemy(
  kind: SpaceEnemyKind,
  rule: StageRule,
  stage = 1,
): SpaceEnemy {
  const spec = ENEMY_SPECS[kind];
  const hw = spec.widthUnits / 2;
  const tierMul = stage >= 30 ? 2 : stage >= 20 ? 1.5 : 1;
  const finalHp = Math.ceil(spec.hp * rule.hpMul * tierMul);
  return {
    id: _eid++,
    kind,
    x: randFloat(hw, LANE_COUNT - hw),
    y: isBossKind(kind) ? 0.12 : randFloat(-0.15, -0.05),
    hp: finalHp,
    maxHp: finalHp,
    speed: spec.speed * rule.speedMul,
    widthUnits: spec.widthUnits,
    damage: spec.damage,
    hitFx: 0,
    pattern: spec.pattern,
    patternPhase: Math.random() * Math.PI * 2,
    patternAmp: spec.pattern === "zigzag" || ELITE_KINDS.has(kind) ? 0.6 : 0,
    patternFreq: ELITE_KINDS.has(kind) ? 3.0 : 2.0,
    fireAcc: 0,
    fireInterval: spec.fireInterval,
    bossPhase: isBossKind(kind) ? 0 : undefined,
    bossPatternIdx: isBossKind(kind) ? 0 : undefined,
  };
}

let _explId = 0;
function spawnExplosion(s: GameState, x: number, y: number, size: number) {
  s.explosions.push({ id: _explId++, x, y, size, t: 0, duration: 0.35 });
}

function maybeDropItem(x: number, y: number): Item | null {
  if (Math.random() > ENEMY_DROP_CHANCE) return null;
  const r = Math.random();
  // 25% heal
  if (r < 0.25) return { id: _iid++, x, y, kind: "heal" };
  // 55% weapon
  if (r < 0.8) {
    const w: WeaponId = (["laser", "pierce", "shotgun"] as WeaponId[])[
      randInt(0, 2)
    ];
    return { id: _iid++, x, y, kind: "weapon", weaponId: w };
  }
  // 20% bomb
  return { id: _iid++, x, y, kind: "bomb" };
}

function generateStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 45; i++)
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 1,
      speed: 0.02 + Math.random() * 0.01,
      brightness: 0.3 + Math.random() * 0.3,
    });
  for (let i = 0; i < 20; i++)
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 2,
      speed: 0.04 + Math.random() * 0.02,
      brightness: 0.5 + Math.random() * 0.3,
    });
  for (let i = 0; i < 8; i++)
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 3,
      speed: 0.07 + Math.random() * 0.03,
      brightness: 0.7 + Math.random() * 0.3,
    });
  return stars;
}

/* =========================================================
   Component
   ========================================================= */
interface Props {
  onExit: () => void;
}

type GameState = {
  player: Player;
  enemies: SpaceEnemy[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  items: Item[];
  combat: CombatState;
  score: number;
  totalScore: number;
  fireAcc: number;
  spawnAcc: number;
  hurtCd: number;
  bossSpawned: boolean;
  stageBannerT: number;
  laserOn: boolean;
  laserHitY: number;
  laserHitEnemyId: number | null;
  explosions: Explosion[];
  bombCount: number;
  bombProjectile: BombProjectile | null;
  activeNuke: ActiveNuke | null;
  bombShieldT: number; // seconds remaining of invincibility
};

function initGameState(): GameState {
  return {
    player: {
      x: LANE_COUNT / 2,
      y: 0.82,
      widthUnits: PLAYER_WIDTH,
      hp: 12,
      maxHp: 12,
    },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    items: [],
    combat: {
      weaponId: "pistol",
      weaponLevel: 1,
    },
    score: 0,
    totalScore: 0,
    fireAcc: 0,
    spawnAcc: 0,
    hurtCd: 0,
    bossSpawned: false,
    stageBannerT: 0,
    laserOn: false,
    laserHitY: 0,
    laserHitEnemyId: null,
    explosions: [],
    bombCount: 2,
    bombProjectile: null,
    activeNuke: null,
    bombShieldT: 0,
  };
}

const SpaceShooterMode: React.FC<Props> = ({ onExit }) => {
  /* ---- viewport ---- */
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      setViewport({
        width: Math.floor(vv?.width ?? window.innerWidth),
        height: Math.floor(vv?.height ?? window.innerHeight),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  const WIDTH = Math.min(viewport.width || 360, MAX_WIDTH);
  const HEIGHT = viewport.height || 780;
  const laneWidth = WIDTH / LANE_COUNT;

  /* ---- stage & mode (React state for lifecycle) ---- */
  const [stage, setStage] = useState(1);
  const [mode, setMode] = useState<Mode>("chapter");
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  /* ---- mutable game state (ref for synchronous game loop) ---- */
  const g = useRef<GameState>(initGameState());
  const [, forceRender] = useState(0);

  const stars = useMemo(generateStars, []);
  const starsRef = useRef(stars);
  const lastTimeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ---- chapter banner auto-start ---- */
  useEffect(() => {
    if (mode !== "chapter") return;
    const t = setTimeout(() => setMode("playing"), 1200);
    return () => clearTimeout(t);
  }, [mode]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const STEP = 0.45;
    const held = new Set<string>();
    const onDown = (e: KeyboardEvent) => held.add(e.key);
    const onUp = (e: KeyboardEvent) => held.delete(e.key);
    const iv = setInterval(() => {
      const p = g.current.player;
      if (held.has("ArrowLeft")) p.x -= STEP * 0.016 * 60;
      if (held.has("ArrowRight")) p.x += STEP * 0.016 * 60;
      if (held.has("ArrowUp")) p.y -= STEP * 0.5 * 0.016 * 60;
      if (held.has("ArrowDown")) p.y += STEP * 0.5 * 0.016 * 60;
      p.x = clamp(p.x, 0, LANE_COUNT);
      p.y = clamp(p.y, PLAYER_Y_MIN, PLAYER_Y_MAX);
    }, 16);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      clearInterval(iv);
    };
  }, []);

  /* ---- touch (relative drag) ---- */
  const touchRef = useRef<{
    tx: number;
    ty: number;
    px: number;
    py: number;
  } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = {
      tx: t.clientX,
      ty: t.clientY,
      px: g.current.player.x,
      py: g.current.player.y,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || !containerRef.current) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const sens = 1.3;
    const dx =
      ((t.clientX - touchRef.current.tx) / rect.width) * LANE_COUNT * sens;
    const dy = ((t.clientY - touchRef.current.ty) / rect.height) * sens;
    g.current.player.x = clamp(touchRef.current.px + dx, 0, LANE_COUNT);
    g.current.player.y = clamp(
      touchRef.current.py + dy,
      PLAYER_Y_MIN,
      PLAYER_Y_MAX,
    );
  };
  const onTouchEnd = () => {
    touchRef.current = null;
  };

  const fireBomb = () => {
    const s = g.current;
    if (s.bombCount <= 0 || s.bombProjectile || s.activeNuke) return;
    s.bombCount--;
    s.bombProjectile = {
      x: s.player.x,
      y: s.player.y,
      speed: 0.8,
      targetY: s.player.y - 0.3,
    };
  };

  /* ---- coordinate helpers ---- */
  const xToPx = (xu: number) => (xu / LANE_COUNT) * WIDTH;
  const yToPx = (yu: number) => yu * HEIGHT;

  const togglePause = () => {
    setMode((m) => {
      if (m === "playing") return "paused";
      if (m === "paused") {
        lastTimeRef.current = null;
        return "playing";
      }
      return m;
    });
  };

  /* =========================================================
     GAME LOOP (all mutations on g.current, then forceRender)
     ========================================================= */
  useEffect(() => {
    if (mode !== "playing") return;
    let raf: number;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = time;

      const s = g.current;
      const p = s.player;
      const weapon = getActiveWeapon(s.combat);
      const curStage = stageRef.current;
      const ruleIdx = clamp(curStage - 1, 0, STAGE_RULES.length - 1);
      const rule = STAGE_RULES[ruleIdx];
      const target = stageTarget(curStage);

      /* -- stars scroll -- */
      for (const st of starsRef.current) st.y = (st.y + st.speed * dt) % 1.0;

      /* -- stage transition banner countdown -- */
      if (s.stageBannerT > 0) {
        s.stageBannerT -= dt;
        if (s.stageBannerT <= 0) {
          s.stageBannerT = 0;
          s.enemies = [];
          s.bullets = [];
          s.enemyBullets = [];
          s.items = [];
          s.score = 0;
          s.fireAcc = 0;
          s.spawnAcc = 0;
          s.hurtCd = 0;
          s.bossSpawned = false;
          lastTimeRef.current = null;
          setStage((prev) => prev + 1);
          setMode("chapter");
          forceRender((t) => t + 1);
          return;
        }
        // during banner: skip spawning but keep game running
      }

      /* -- auto fire -- */
      if (weapon.id === "laser") {
        /* Laser: continuous DPS beam — hits first enemy in line */
        s.laserOn = true;
        s.laserHitY = 0;
        s.laserHitEnemyId = null;
        s.fireAcc += dt;

        // find closest enemy directly above player (within beam width)
        const BEAM_HALF_W = 0.15;
        let closestE: SpaceEnemy | null = null;
        let closestDist = Infinity;
        for (const e of s.enemies) {
          if (
            e.hp > 0 &&
            e.y < p.y &&
            e.y > 0 &&
            Math.abs(e.x - p.x) < BEAM_HALF_W + e.widthUnits * 0.3
          ) {
            const d = p.y - e.y;
            if (d < closestDist) {
              closestDist = d;
              closestE = e;
            }
          }
        }

        if (closestE) {
          s.laserHitY = closestE.y;
          s.laserHitEnemyId = closestE.id;
          // apply DPS
          if (s.fireAcc >= weapon.fireIntervalSec) {
            s.fireAcc = 0;
            closestE.hp -= weapon.damage;
            closestE.hitFx = 0.08;
            if (closestE.hp <= 0) {
              s.score++;
              s.totalScore++;
              spawnExplosion(s, closestE.x, closestE.y, closestE.widthUnits);
              const drop = maybeDropItem(closestE.x, closestE.y);
              if (drop) s.items.push(drop);
            }
          }
        }
      } else {
        s.laserOn = false;
        s.fireAcc += dt;
        if (s.fireAcc >= weapon.fireIntervalSec) {
          s.fireAcc = 0;
          const shooters = [{ x: p.x, y: p.y }];
          for (const sh of shooters) {
            if (weapon.pellets === 1) {
              s.bullets.push({
                id: _bid++,
                x: sh.x,
                y: sh.y,
                vx: 0,
                vy: -weapon.bulletSpeed,
                damage: weapon.damage,
                pierce: weapon.pierce,
                weaponId: weapon.id,
              });
            } else {
              for (let i = 0; i < weapon.pellets; i++) {
                const spread = weapon.spreadUnits ?? 1;
                const ox = (i / (weapon.pellets - 1) - 0.5) * spread;
                s.bullets.push({
                  id: _bid++,
                  x: sh.x + ox,
                  y: sh.y,
                  vx: ox * 0.3,
                  vy: -weapon.bulletSpeed,
                  damage: weapon.damage,
                  pierce: weapon.pierce,
                  weaponId: weapon.id,
                });
              }
            }
          }
        }
      }

      /* -- spawn enemies (skip during stage transition) -- */
      if (s.stageBannerT <= 0) {
        s.spawnAcc += dt;
        if (
          s.spawnAcc >= rule.spawnInterval &&
          s.enemies.length < rule.maxAlive
        ) {
          s.spawnAcc = 0;
          const batch = randInt(rule.batchMin, rule.batchMax);
          for (let i = 0; i < batch && s.enemies.length < rule.maxAlive; i++) {
            const kind =
              rule.isBoss && !s.bossSpawned
                ? (Object.keys(rule.kindWeights)[0] as SpaceEnemyKind)
                : pickKind(rule.kindWeights);
            if (isBossKind(kind)) s.bossSpawned = true;
            s.enemies.push(makeEnemy(kind, rule, curStage));
          }
        }
      }

      /* -- move enemies + fire -- */
      for (const e of s.enemies) {
        e.patternPhase += dt;
        e.hitFx = Math.max(0, e.hitFx - dt);
        if (isBossKind(e.kind)) {
          // Boss stays fixed at top, only sways horizontally
          e.x += Math.sin(e.patternPhase * 1.2) * 0.3 * dt;
          e.x = clamp(e.x, e.widthUnits / 2, LANE_COUNT - e.widthUnits / 2);
          e.y = 0.12;
        } else {
          e.y += e.speed * dt;

          if (e.pattern === "zigzag") {
            e.x +=
              Math.sin(e.patternPhase * e.patternFreq) * e.patternAmp * dt * 2;
            e.x = clamp(e.x, e.widthUnits / 2, LANE_COUNT - e.widthUnits / 2);
          }
          if (e.pattern === "hover" && e.y > 0.2) {
            e.y = Math.max(e.y - e.speed * dt * 0.9, 0.2);
          }
        }

        e.fireAcc += dt;
        if (
          e.fireInterval > 0 &&
          e.fireAcc >= e.fireInterval &&
          e.y > 0.02 &&
          e.y < 0.85
        ) {
          e.fireAcc = 0;
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          const spd = 0.25;
          s.enemyBullets.push({
            id: _bid++,
            x: e.x,
            y: e.y,
            px: e.x,
            py: e.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 0.08,
            damage: e.damage,
          });
          if (isBossKind(e.kind)) {
            const offsets =
              e.kind === "fireBoss"
                ? [-0.4, -0.2, 0.2, 0.4]
                : e.kind === "darkBoss"
                  ? [-0.5, -0.25, 0.25, 0.5]
                  : [-0.3, 0.3];
            for (const off of offsets) {
              s.enemyBullets.push({
                id: _bid++,
                x: e.x,
                y: e.y,
                px: e.x,
                py: e.y,
                vx: Math.cos(angle + off) * spd,
                vy: Math.sin(angle + off) * spd,
                radius: 0.06,
                damage: e.damage,
              });
            }
          }
        }
      }
      s.enemies = s.enemies.filter((e) => e.y < 1.3);

      /* -- move bullets -- */
      for (const b of s.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      s.bullets = s.bullets.filter(
        (b) => b.y > -0.1 && b.y < 1.2 && b.x > -0.5 && b.x < LANE_COUNT + 0.5,
      );

      /* -- move enemy bullets -- */
      for (const b of s.enemyBullets) {
        b.px = b.x;
        b.py = b.y;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      s.enemyBullets = s.enemyBullets.filter(
        (b) => b.y > -0.2 && b.y < 1.3 && b.x > -0.5 && b.x < LANE_COUNT + 0.5,
      );

      /* -- move items -- */
      for (const it of s.items) it.y += ITEM_SPEED * dt;
      s.items = s.items.filter((it) => it.y < 1.2);

      /* -- collision: player bullets vs enemies -- */
      const survivingBullets: Bullet[] = [];
      for (const b of s.bullets) {
        let consumed = false;
        for (const e of s.enemies) {
          if (e.hp <= 0) continue;
          const hw = e.widthUnits / 2;
          if (Math.abs(b.x - e.x) < hw + 0.12 && Math.abs(b.y - e.y) < 0.06) {
            e.hp -= b.damage;
            e.hitFx = 0.12;
            if (e.hp <= 0) {
              s.score++;
              s.totalScore++;
              spawnExplosion(s, e.x, e.y, e.widthUnits);
              const drop = maybeDropItem(e.x, e.y);
              if (drop) s.items.push(drop);
            } else if (isBossKind(e.kind) && Math.random() < 0.1) {
              const bossDrop = maybeDropItem(e.x, e.y + 0.05);
              if (bossDrop) s.items.push(bossDrop);
            }
            if (!b.pierce) {
              consumed = true;
              break;
            }
          }
        }
        if (!consumed) survivingBullets.push(b);
      }
      s.bullets = survivingBullets;
      s.enemies = s.enemies.filter((e) => e.hp > 0);

      /* -- tick explosions -- */
      for (const ex of s.explosions) ex.t += dt;
      s.explosions = s.explosions.filter((ex) => ex.t < ex.duration);

      /* -- bomb projectile -- */
      if (s.bombProjectile) {
        const bp = s.bombProjectile;
        bp.y -= bp.speed * dt;
        if (bp.y <= bp.targetY) {
          // detonate nuke
          const halfScreenUnits = LANE_COUNT * 0.5;
          s.activeNuke = {
            x: bp.x,
            y: bp.targetY,
            t: 0,
            duration: 3,
            dps: 10,
            radiusUnits: halfScreenUnits,
            dmgAcc: 0,
          };
          s.bombShieldT = 3;
          s.bombProjectile = null;
        }
      }

      /* -- active nuke -- */
      if (s.activeNuke) {
        const nk = s.activeNuke;
        nk.t += dt;
        nk.dmgAcc += dt;
        const dmgInterval = 0.1; // damage every 0.1s
        while (nk.dmgAcc >= dmgInterval) {
          nk.dmgAcc -= dmgInterval;
          const dmgPerTick = nk.dps * dmgInterval;
          for (const e of s.enemies) {
            if (e.hp <= 0) continue;
            const dx = e.x - nk.x;
            const dy = (e.y - nk.y) * LANE_COUNT; // scale y to match x units
            if (dx * dx + dy * dy < nk.radiusUnits * nk.radiusUnits) {
              e.hp -= dmgPerTick;
              e.hitFx = 0.06;
              if (e.hp <= 0) {
                s.score++;
                s.totalScore++;
                spawnExplosion(s, e.x, e.y, e.widthUnits);
                const drop = maybeDropItem(e.x, e.y);
                if (drop) s.items.push(drop);
              }
            }
          }
        }
        if (nk.t >= nk.duration) s.activeNuke = null;
      }

      /* -- bomb shield tick -- */
      if (s.bombShieldT > 0) s.bombShieldT -= dt;

      /* -- collision: enemy bullets vs player -- */
      const shielded = s.bombShieldT > 0;
      if (s.hurtCd > 0) {
        s.hurtCd -= dt;
      } else if (!shielded) {
        const aliveEB: EnemyBullet[] = [];
        let dmg = 0;
        for (const b of s.enemyBullets) {
          if (
            segmentCircleHit(
              b.px,
              b.py,
              b.x,
              b.y,
              p.x,
              p.y,
              PLAYER_HIT_R + b.radius,
            )
          ) {
            dmg += b.damage;
          } else {
            aliveEB.push(b);
          }
        }
        if (dmg > 0) {
          s.hurtCd = 0.2;
          p.hp = Math.max(0, p.hp - dmg);
          if (p.hp <= 0) {
            setMode("gameover");
            forceRender((t) => t + 1);
            return;
          }
        }
        s.enemyBullets = aliveEB;
      }

      /* -- collision: enemy body vs player -- */
      if (s.hurtCd <= 0 && !shielded) {
        for (const e of s.enemies) {
          const dist = (e.widthUnits + p.widthUnits) * 0.3;
          if (
            Math.abs(e.x - p.x) < dist &&
            Math.abs(e.y - p.y) < PLAYER_HIT_BODY_Y
          ) {
            p.hp = Math.max(0, p.hp - e.damage);
            s.hurtCd = 0.5;
            e.hitFx = 0.12;
            if (p.hp <= 0) {
              setMode("gameover");
              forceRender((t) => t + 1);
              return;
            }
            break;
          }
        }
      }

      /* -- item pickup -- */
      const remainItems: Item[] = [];
      for (const it of s.items) {
        if (Math.abs(it.x - p.x) < 0.6 && Math.abs(it.y - p.y) < 0.08) {
          if (it.kind === "bomb") {
            s.bombCount = Math.min(5, s.bombCount + 1);
          } else if (it.kind === "heal") {
            p.hp = p.maxHp;
          } else {
            s.combat = applyItem(s.combat, it);
          }
        } else {
          remainItems.push(it);
        }
      }
      s.items = remainItems;

      /* -- stage clear check -- */
      if (s.score >= target && s.stageBannerT <= 0) {
        if (curStage >= MAX_STAGE) {
          setMode("cleared");
          forceRender((t) => t + 1);
          return;
        } else {
          s.stageBannerT = 0.8;
        }
      }

      forceRender((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ---- render-only loop for non-playing modes (so touch/keyboard still moves player) ---- */
  useEffect(() => {
    if (mode === "playing") return;
    let raf: number;
    const renderLoop = () => {
      forceRender((t) => t + 1);
      raf = requestAnimationFrame(renderLoop);
    };
    raf = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  /* ---- handlers ---- */
  const handleRetrySameStage = () => {
    const prevCombat = { ...g.current.combat };
    g.current = initGameState();
    g.current.combat = prevCombat;
    lastTimeRef.current = null;
    setMode("chapter");
  };

  /* ---- read from ref for render ---- */
  const {
    player,
    enemies,
    bullets,
    enemyBullets,
    items,
    score,
    totalScore,
    hurtCd,
    stageBannerT,
    laserOn,
    laserHitY,
    explosions,
    bombCount,
    bombProjectile,
    activeNuke,
    bombShieldT,
  } = g.current;
  const target = stageTarget(stage);
  const playerHpPct = player.hp / player.maxHp;
  const isHurt = hurtCd > 0;
  const activeWeapon = getActiveWeapon(g.current.combat);
  const { combat } = g.current;

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        maxWidth: MAX_WIDTH,
        margin: "0 auto",
        overflow: "hidden",
        touchAction: "none",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
        background:
          getChapter(stage) === 1
            ? "linear-gradient(180deg, #050510 0%, #0a0a2e 50%, #050510 100%)"
            : getChapter(stage) === 2
              ? "linear-gradient(180deg, #150505 0%, #2e0a0a 50%, #150505 100%)"
              : "linear-gradient(180deg, #0a0510 0%, #150a2e 50%, #0a0510 100%)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* ===== Stars ===== */}
      {starsRef.current.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x * WIDTH,
            top: s.y * HEIGHT,
            width: s.size,
            height: s.size,
            borderRadius: 999,
            background: `rgba(255,255,255,${s.brightness})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ===== Nebula effects ===== */}
      {(() => {
        const ch = getChapter(stage);
        const n1 =
          ch === 1
            ? "rgba(100,50,180,0.06)"
            : ch === 2
              ? "rgba(200,80,30,0.08)"
              : "rgba(120,40,200,0.08)";
        const n2 =
          ch === 1
            ? "rgba(50,100,200,0.05)"
            : ch === 2
              ? "rgba(180,50,20,0.06)"
              : "rgba(80,20,160,0.06)";
        return (
          <>
            <div
              style={{
                position: "absolute",
                left: "20%",
                top: "30%",
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${n1} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "10%",
                top: "60%",
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${n2} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          </>
        );
      })()}

      <BackButton
        onExit={onExit}
        onPause={togglePause}
        isPaused={mode === "paused"}
      />

      {/* ===== HUD ===== */}
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontFamily: "Fredoka",
          fontWeight: 600,
          color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          zIndex: 10,
        }}
      >
        STAGE {stage}{" "}
        <span
          style={{
            fontSize: "clamp(10px, 2.5vw, 11px)",
            opacity: 0.6,
            color: getChapterInfo(stage).color,
          }}
        >
          CH{getChapter(stage)}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 40px)",
          left: 12,
          fontSize: "clamp(11px, 3vw, 13px)",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 700,
          fontFamily: "Fredoka",
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        {score}/{target}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 40px)",
          right: 12,
          fontSize: "clamp(11px, 3vw, 13px)",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 700,
          fontFamily: "Fredoka",
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        TOTAL: {totalScore}
      </div>

      {/* ===== Bottom-left HUD (bomb + weapon) ===== */}
      {(() => {
        const wid = combat.weaponId;
        const lv = combat.weaponLevel;
        const borderColor =
          wid === "shotgun"
            ? "#f59e0b"
            : wid === "laser"
              ? "#00e5ff"
              : wid === "pierce"
                ? "#c084fc"
                : "rgba(255,255,255,0.3)";
        const lvGlow =
          lv >= 3
            ? `0 0 14px ${borderColor}, 0 0 28px ${borderColor}60`
            : lv >= 2
              ? `0 0 10px ${borderColor}80`
              : wid !== "pistol"
                ? `0 0 6px ${borderColor}40`
                : "none";
        const hasBomb = bombCount > 0 && !bombProjectile && !activeNuke;
        return (
          <div
            style={{
              position: "absolute",
              bottom: "max(28px, calc(env(safe-area-inset-bottom) + 16px))",
              left: 10,
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            {/* ---- Bomb Slot ---- */}
            <button
              onClick={fireBomb}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: `2.5px solid ${hasBomb ? "#00aaff" : "rgba(255,255,255,0.15)"}`,
                background: hasBomb ? "rgba(0,140,255,0.12)" : "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: hasBomb ? "0 0 10px rgba(0,140,255,0.4)" : "none",
                position: "relative",
                cursor: hasBomb ? "pointer" : "default",
                pointerEvents: "auto",
                padding: 0,
              }}
            >
              {/* Bomb icon SVG */}
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={14} r={8} fill={hasBomb ? "#00aaff" : "#555"} opacity={0.8} />
                <circle cx={12} cy={14} r={5.5} fill={hasBomb ? "#0088dd" : "#444"} />
                <circle cx={12} cy={14} r={2.5} fill={hasBomb ? "#aaddff" : "#666"} />
                <line x1={12} y1={6} x2={12} y2={2} stroke={hasBomb ? "#66ccff" : "#555"} strokeWidth={2} strokeLinecap="round" />
                {hasBomb && <circle cx={12} cy={2} r={2} fill="#66ccff" opacity={0.9}>
                  <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.6s" repeatCount="indefinite" />
                </circle>}
              </svg>
              {/* Count badge */}
              <span
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  fontSize: 9,
                  fontWeight: 900,
                  fontFamily: "Fredoka",
                  color: "#fff",
                  background: hasBomb ? "#0077cc" : "#333",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid rgba(0,0,0,0.4)",
                }}
              >
                {bombCount}
              </span>
            </button>

            {/* ---- Weapon Slot ---- */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: `${lv >= 3 ? 3 : 2.5}px solid ${borderColor}`,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: lvGlow,
                position: "relative",
              }}
            >
              {wid === "pistol" && <ItemWeaponSvg size={24} />}
              {wid === "shotgun" && <ItemShotgunSvg size={24} />}
              {wid === "laser" && <ItemLaserSvg size={24} />}
              {wid === "pierce" && <ItemPierceSvg size={24} />}
            </div>
            {/* Level stars */}
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      i <= lv ? borderColor : "rgba(255,255,255,0.15)",
                    boxShadow:
                      i <= lv && lv >= 2 ? `0 0 4px ${borderColor}` : "none",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                fontFamily: "Fredoka",
                color: borderColor,
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              {wid.toUpperCase()}
            </span>
          </div>
        );
      })()}

      {/* ===== HP bar (above player head) ===== */}

      {/* ===== Boss HP bar (fixed top) ===== */}
      {(() => {
        const boss = enemies.find((e) => isBossKind(e.kind));
        if (!boss) return null;
        const ratio = boss.hp / boss.maxHp;
        const gradient =
          boss.kind === "fireBoss"
            ? "linear-gradient(90deg, #ef4444, #f97316)"
            : boss.kind === "darkBoss"
              ? "linear-gradient(90deg, #7c3aed, #a855f7)"
              : "linear-gradient(90deg, #ef4444, #f59e0b)";
        return (
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 0,
              right: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "4px 16px",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                fontFamily: "Fredoka",
                color: "#fff",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                marginBottom: 2,
              }}
            >
              BOSS
            </span>
            <div
              style={{
                width: "80%",
                maxWidth: 260,
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.15)",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: `${ratio * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: gradient,
                  transition: "width 0.1s",
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* ===== Items ===== */}
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            position: "absolute",
            left: xToPx(it.x),
            top: yToPx(it.y),
            transform: "translate(-50%, -50%)",
            zIndex: 15,
            filter:
              it.kind === "heal"
                ? "drop-shadow(0 0 6px rgba(255,80,80,0.7))"
                : it.kind === "bomb"
                  ? "drop-shadow(0 0 6px rgba(0,140,255,0.7))"
                  : "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
          }}
        >
          {it.kind === "weapon" && it.weaponId === "laser" && (
            <ItemLaserSvg size={26} />
          )}
          {it.kind === "weapon" && it.weaponId === "pierce" && (
            <ItemPierceSvg size={26} />
          )}
          {it.kind === "weapon" && it.weaponId === "shotgun" && (
            <ItemShotgunSvg size={26} />
          )}
          {it.kind === "weapon" && it.weaponId === "pistol" && (
            <ItemWeaponSvg size={26} />
          )}
          {it.kind === "heal" && <ItemHealPillSvg size={30} />}
          {it.kind === "bomb" && (
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <circle cx={12} cy={14} r={8} fill="#00aaff" opacity={0.7} />
              <circle cx={12} cy={14} r={5} fill="#0088dd" />
              <circle cx={12} cy={14} r={2} fill="#aaddff" />
              <line x1={12} y1={6} x2={12} y2={2} stroke="#66ccff" strokeWidth={2} strokeLinecap="round" />
              <circle cx={12} cy={2} r={2} fill="#66ccff" opacity={0.9} />
            </svg>
          )}
        </div>
      ))}

      {/* ===== Enemy Bullets ===== */}
      {enemyBullets.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: xToPx(b.x),
            top: yToPx(b.y),
            transform: "translate(-50%, -50%)",
            zIndex: 12,
          }}
        >
          <EnemyBulletSvg
            size={Math.round(b.radius * 2 * (WIDTH / LANE_COUNT))}
          />
        </div>
      ))}

      {/* ===== Enemies ===== */}
      {enemies.map((e) => {
        const px = xToPx(e.x);
        const py = yToPx(e.y);
        const w = e.widthUnits * laneWidth;
        const isHit = e.hitFx > 0;
        const ENEMY_SVG: Record<
          string,
          React.FC<{ size?: number; hit?: boolean }> | null
        > = {
          scout: ScoutUfo,
          fighter: FighterUfo,
          bomber: BomberUfo,
          carrier: CarrierUfo,
          elite: EliteUfo,
          fireScout: FireScoutUfo,
          fireFighter: FireFighterUfo,
          fireBomber: FireBomberUfo,
          fireCarrier: FireCarrierUfo,
          fireElite: FireEliteUfo,
          darkScout: DarkScoutUfo,
          darkFighter: DarkFighterUfo,
          darkBomber: DarkBomberUfo,
          darkCarrier: DarkCarrierUfo,
          darkElite: DarkEliteUfo,
        };
        const Svg = ENEMY_SVG[e.kind] ?? null;
        const boss = isBossKind(e.kind);

        return (
          <div
            key={e.id}
            style={{
              position: "absolute",
              left: px,
              top: py,
              transform: "translate(-50%, -50%)",
              zIndex: boss ? 18 : 14,
            }}
          >
            {boss ? (
              e.kind === "fireBoss" ? (
                <FireBossSvg size={w} hpRatio={e.hp / e.maxHp} hit={isHit} />
              ) : e.kind === "darkBoss" ? (
                <DarkBossSvg size={w} hpRatio={e.hp / e.maxHp} hit={isHit} />
              ) : (
                <SpaceBossSvg size={w} hpRatio={e.hp / e.maxHp} hit={isHit} />
              )
            ) : Svg ? (
              <Svg size={w} hit={isHit} />
            ) : null}
            {/* HP bar */}
            {!boss && e.hp < e.maxHp && (
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 30,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(e.hp / e.maxHp) * 100}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: "#ef4444",
                  }}
                />
              </div>
            )}
            {/* Boss HP bar moved to fixed top bar */}
          </div>
        );
      })}

      {/* ===== Explosions ===== */}
      {explosions.map((ex) => {
        const px = xToPx(ex.x);
        const py = yToPx(ex.y);
        const p = ex.t / ex.duration; // 0→1
        const baseSize = ex.size * laneWidth * 0.8;
        // fast expand then hold
        const scale = p < 0.25 ? 0.3 + p * 2.8 : 1.0 + p * 0.15;
        const opacity = p < 0.15 ? 1 : Math.max(0, 1 - (p - 0.15) * 1.3);
        return (
          <div
            key={ex.id}
            style={{
              position: "absolute",
              left: px,
              top: py,
              transform: `translate(-50%, -50%) scale(${scale})`,
              width: baseSize,
              height: baseSize,
              opacity,
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              width={baseSize}
              height={baseSize}
              style={{ overflow: "visible" }}
            >
              <defs>
                <radialGradient id={`exCore-${ex.id}`}>
                  <stop offset="0%" stopColor="#fff" />
                  <stop offset="20%" stopColor="#ffe066" />
                  <stop offset="50%" stopColor="#ff6600" />
                  <stop offset="80%" stopColor="#cc2200" />
                  <stop offset="100%" stopColor="#441100" stopOpacity={0} />
                </radialGradient>
                <radialGradient id={`exSmoke-${ex.id}`}>
                  <stop offset="0%" stopColor="#664400" stopOpacity={0.6} />
                  <stop offset="60%" stopColor="#332200" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#111" stopOpacity={0} />
                </radialGradient>
              </defs>
              {/* dark smoke layer (expands & fades) */}
              <circle
                cx={50}
                cy={50}
                r={38 + p * 12}
                fill={`url(#exSmoke-${ex.id})`}
                opacity={0.6 * (1 - p)}
              />
              {/* main fireball */}
              <circle
                cx={50}
                cy={50}
                r={30 - p * 8}
                fill={`url(#exCore-${ex.id})`}
              />
              {/* hot white flash (only at start) */}
              {p < 0.2 && (
                <circle
                  cx={50}
                  cy={50}
                  r={14 - p * 50}
                  fill="#fff"
                  opacity={1 - p * 5}
                />
              )}
              {/* flame tongues — irregular blobs expanding outward */}
              {[0, 60, 130, 200, 280, 340].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const dist = 12 + p * 22;
                const bx = 50 + Math.cos(rad) * dist;
                const by = 50 + Math.sin(rad) * dist;
                const r = 8 - p * 5;
                const colors = [
                  "#ff8800",
                  "#ff5500",
                  "#ff3300",
                  "#ee6600",
                  "#ff7700",
                  "#dd4400",
                ];
                return (
                  <ellipse
                    key={i}
                    cx={bx}
                    cy={by}
                    rx={Math.max(1, r * (1 + (i % 2) * 0.4))}
                    ry={Math.max(1, r * (1 - (i % 2) * 0.2))}
                    fill={colors[i]}
                    opacity={Math.max(0, 0.9 - p * 1.1)}
                  />
                );
              })}
              {/* small ember sparks */}
              {[20, 85, 150, 220, 310].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const dist = 18 + p * 30;
                const sx = 50 + Math.cos(rad) * dist;
                const sy = 50 + Math.sin(rad) * dist;
                return (
                  <circle
                    key={i}
                    cx={sx}
                    cy={sy}
                    r={Math.max(0.3, 2.5 - p * 2.5)}
                    fill={i % 2 === 0 ? "#ffcc00" : "#ff6600"}
                    opacity={Math.max(0, 1 - p * 1.5)}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}

      {/* ===== Bomb Projectile ===== */}
      {bombProjectile && (() => {
        const bpx = xToPx(bombProjectile.x);
        const bpy = yToPx(bombProjectile.y);
        return (
          <div style={{ position: "absolute", left: bpx, top: bpy, transform: "translate(-50%, -50%)", zIndex: 32, pointerEvents: "none" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
              <circle cx={12} cy={12} r={8} fill="#00aaff" opacity={0.9} />
              <circle cx={12} cy={12} r={5} fill="#0088dd" />
              <circle cx={12} cy={12} r={2} fill="#fff" opacity={0.8} />
              <circle cx={12} cy={12} r={10} fill="none" stroke="#00aaff" strokeWidth={1} opacity={0.5}>
                <animate attributeName="r" values="10;14;10" dur="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="0.3s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        );
      })()}

      {/* ===== Active Nuke (blue atomic storm + lightning) ===== */}
      {activeNuke && (() => {
        const nk = activeNuke;
        const nx = xToPx(nk.x);
        const ny = yToPx(nk.y);
        const radiusPx = (nk.radiusUnits / LANE_COUNT) * WIDTH;
        const p = nk.t / nk.duration;
        const expand = p < 0.08 ? p / 0.08 : 1;
        const fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
        const pulse = 1 + Math.sin(nk.t * 12) * 0.03;
        const sz = radiusPx * 2 * expand * pulse;
        // pseudo-random lightning seed from time
        const lt = Math.floor(nk.t * 12);
        return (
          <div
            style={{
              position: "absolute",
              left: nx,
              top: ny,
              transform: `translate(-50%, -50%)`,
              width: sz,
              height: sz,
              opacity: fade,
              zIndex: 28,
              pointerEvents: "none",
            }}
          >
            <svg viewBox="0 0 200 200" width={sz} height={sz} style={{ overflow: "visible" }}>
              <defs>
                <radialGradient id="nuke-core">
                  <stop offset="0%" stopColor="#fff" />
                  <stop offset="12%" stopColor="#bbddff" />
                  <stop offset="30%" stopColor="#4499ff" />
                  <stop offset="50%" stopColor="#2266dd" />
                  <stop offset="70%" stopColor="#1133aa" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#050520" stopOpacity={0} />
                </radialGradient>
                <radialGradient id="nuke-field">
                  <stop offset="0%" stopColor="#00aaff" stopOpacity={0} />
                  <stop offset="55%" stopColor="#0088ff" stopOpacity={0} />
                  <stop offset="75%" stopColor="#0099ff" stopOpacity={0.12} />
                  <stop offset="88%" stopColor="#00bbff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ddff" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#00eeff" stopOpacity={0} />
                </radialGradient>
                <radialGradient id="nuke-plasma">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                  <stop offset="35%" stopColor="#aaddff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0066cc" stopOpacity={0} />
                </radialGradient>
              </defs>
              {/* outer energy field */}
              <circle cx={100} cy={100} r={98} fill="url(#nuke-field)" />
              <circle cx={100} cy={100} r={96} fill="none" stroke="#00ccff" strokeWidth={1.5} opacity={0.35 + Math.sin(nk.t * 20) * 0.15} />
              <circle cx={100} cy={100} r={92} fill="none" stroke="#0088ff" strokeWidth={0.8} opacity={0.25 + Math.sin(nk.t * 15 + 1) * 0.1} />
              {/* blue atomic core */}
              <circle cx={100} cy={100} r={55} fill="url(#nuke-core)" />
              {/* plasma center */}
              <circle cx={100} cy={100} r={22} fill="url(#nuke-plasma)" />
              {/* swirling storm clouds */}
              {[0, 50, 100, 150, 200, 250, 300, 350].map((deg, i) => {
                const rad = ((deg + nk.t * 50) * Math.PI) / 180;
                const dist = 30 + Math.sin(nk.t * 6 + i * 1.7) * 14;
                const bx = 100 + Math.cos(rad) * dist;
                const by = 100 + Math.sin(rad) * dist;
                const colors = ["#2277ff", "#3399ff", "#1155dd", "#44aaff", "#2266cc", "#55bbff", "#1144bb", "#3388ee"];
                return (
                  <ellipse key={i} cx={bx} cy={by}
                    rx={10 + Math.sin(nk.t * 10 + i) * 4}
                    ry={7 + Math.cos(nk.t * 8 + i) * 3}
                    fill={colors[i]} opacity={0.5 + Math.sin(nk.t * 12 + i) * 0.15}
                  />
                );
              })}
              {/* lightning bolts — zigzag paths from center outward */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const baseAngle = ((lt * 47 + i * 137) % 360) * Math.PI / 180;
                const segments = 5;
                let pts = `${100 + Math.cos(baseAngle) * 8},${100 + Math.sin(baseAngle) * 8}`;
                for (let s = 1; s <= segments; s++) {
                  const r = 8 + s * 16;
                  const jitter = ((lt * 13 + i * 7 + s * 31) % 40 - 20) * Math.PI / 180;
                  const a = baseAngle + jitter;
                  pts += ` ${100 + Math.cos(a) * r},${100 + Math.sin(a) * r}`;
                }
                const visible = ((lt + i * 3) % 4) < 2;
                return visible ? (
                  <polyline key={i} points={pts} fill="none"
                    stroke="#aaddff" strokeWidth={2.5} opacity={0.8}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 0 4px #00ccff)" }}
                  />
                ) : null;
              })}
              {/* bright flash lightning forks (thinner, more branches) */}
              {[0, 1, 2, 3].map((i) => {
                const baseAngle = ((lt * 29 + i * 89 + 45) % 360) * Math.PI / 180;
                let pts = `${100},${100}`;
                for (let s = 1; s <= 4; s++) {
                  const r = s * 22;
                  const jitter = ((lt * 17 + i * 11 + s * 23) % 30 - 15) * Math.PI / 180;
                  pts += ` ${100 + Math.cos(baseAngle + jitter) * r},${100 + Math.sin(baseAngle + jitter) * r}`;
                }
                const visible = ((lt + i * 2 + 1) % 3) < 1;
                return visible ? (
                  <polyline key={`f${i}`} points={pts} fill="none"
                    stroke="#fff" strokeWidth={1.5} opacity={0.9}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 0 6px #66ccff)" }}
                  />
                ) : null;
              })}
              {/* electric sparks at field edge */}
              {[30, 85, 140, 200, 260, 320].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const dist = 80 + Math.sin(nk.t * 18 + i * 3) * 12;
                return (
                  <circle key={i}
                    cx={100 + Math.cos(rad) * dist}
                    cy={100 + Math.sin(rad) * dist}
                    r={Math.max(0.5, 3 - p * 2)}
                    fill="#aaeeff" opacity={((lt + i) % 3) < 2 ? 0.9 : 0.2}
                    style={{ filter: "drop-shadow(0 0 3px #00ccff)" }}
                  />
                );
              })}
              {/* white flash at start */}
              {p < 0.12 && (
                <circle cx={100} cy={100} r={45 - p * 300} fill="#fff" opacity={1 - p * 8} />
              )}
            </svg>
          </div>
        );
      })()}

      {/* ===== Bomb Shield (blue energy field around player) ===== */}
      {bombShieldT > 0 && (() => {
        const shieldPx = xToPx(player.x);
        const shieldPy = yToPx(player.y);
        const shieldR = laneWidth * 0.8;
        const pulse = 1 + Math.sin(Date.now() * 0.015) * 0.06;
        const fade = bombShieldT < 0.5 ? bombShieldT / 0.5 : 1;
        const slt = Math.floor(Date.now() * 0.008);
        return (
          <div style={{
            position: "absolute",
            left: shieldPx,
            top: shieldPy,
            transform: "translate(-50%, -50%)",
            zIndex: 25,
            pointerEvents: "none",
            opacity: fade * 0.75,
          }}>
            <svg width={shieldR * 2 * pulse} height={shieldR * 2 * pulse} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
              <defs>
                <radialGradient id="shield-grd">
                  <stop offset="0%" stopColor="#0088ff" stopOpacity={0} />
                  <stop offset="65%" stopColor="#0088ff" stopOpacity={0.04} />
                  <stop offset="85%" stopColor="#00aaff" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#00ccff" stopOpacity={0} />
                </radialGradient>
              </defs>
              <circle cx={50} cy={50} r={46} fill="url(#shield-grd)" />
              <circle cx={50} cy={50} r={46} fill="none" stroke="#00bbff" strokeWidth={2} opacity={0.5} />
              <circle cx={50} cy={50} r={42} fill="none" stroke="#0099ff" strokeWidth={0.8} opacity={0.3} strokeDasharray="6 4" />
              {/* mini lightning arcs on shield */}
              {[0, 1, 2, 3].map((i) => {
                const a = ((slt * 37 + i * 90) % 360) * Math.PI / 180;
                const r1 = 38;
                const r2 = 46;
                const mx = 50 + Math.cos(a + 0.15) * (r1 + r2) * 0.5;
                const my = 50 + Math.sin(a + 0.15) * (r1 + r2) * 0.5;
                const visible = ((slt + i) % 3) < 2;
                return visible ? (
                  <polyline key={i}
                    points={`${50 + Math.cos(a) * r1},${50 + Math.sin(a) * r1} ${mx},${my} ${50 + Math.cos(a + 0.3) * r2},${50 + Math.sin(a + 0.3) * r2}`}
                    fill="none" stroke="#aaddff" strokeWidth={1.5} opacity={0.7}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                ) : null;
              })}
            </svg>
          </div>
        );
      })()}

      {/* ===== Laser Beam ===== */}
      {laserOn &&
        (() => {
          const lv = combat.weaponLevel;
          const beamX = xToPx(player.x);
          const beamTopY = laserHitY > 0 ? yToPx(laserHitY) : 0;
          const beamBottomY = yToPx(player.y) - 16;
          const beamH = beamBottomY - beamTopY;
          if (beamH <= 0) return null;
          const t = Date.now();
          const flicker = 0.85 + Math.sin(t * 0.03) * 0.15;
          const lvScale = 0.7 + lv * 0.3;
          const coreW = (3 + Math.sin(t * 0.02) * 1) * lvScale;
          return (
            <>
              {/* Widest ambient glow */}
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamTopY,
                  width: 40 * lvScale,
                  height: beamH,
                  transform: "translateX(-50%)",
                  background: `linear-gradient(180deg, rgba(0,229,255,${0.06 * flicker * lvScale}), rgba(0,100,255,${0.03 * flicker * lvScale}))`,
                  borderRadius: 20,
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />
              {/* Outer glow */}
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamTopY,
                  width: 18 * lvScale,
                  height: beamH,
                  transform: "translateX(-50%)",
                  background: `linear-gradient(180deg, rgba(0,229,255,${0.18 * flicker * lvScale}), rgba(0,176,255,${0.1 * flicker * lvScale}))`,
                  borderRadius: 8,
                  zIndex: 11,
                  pointerEvents: "none",
                }}
              />
              {/* Middle beam */}
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamTopY,
                  width: 8 * lvScale,
                  height: beamH,
                  transform: "translateX(-50%)",
                  background: `linear-gradient(180deg, rgba(100,230,255,${0.5 * flicker * lvScale}), rgba(0,200,255,${0.35 * flicker * lvScale}))`,
                  boxShadow: `0 0 ${12 * lvScale}px ${3 * lvScale}px rgba(0,229,255,${0.4 * flicker * lvScale})`,
                  zIndex: 12,
                  pointerEvents: "none",
                }}
              />
              {/* Core beam (bright white-cyan) */}
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamTopY,
                  width: coreW,
                  height: beamH,
                  transform: "translateX(-50%)",
                  background: "linear-gradient(180deg, #fff, #80deea, #00e5ff)",
                  boxShadow:
                    "0 0 6px 2px rgba(255,255,255,0.5), 0 0 16px 4px rgba(0,229,255,0.6)",
                  zIndex: 13,
                  pointerEvents: "none",
                }}
              />
              {/* Electric arcs along beam */}
              <svg
                style={{
                  position: "absolute",
                  left: beamX - 16,
                  top: beamTopY,
                  width: 32,
                  height: beamH,
                  zIndex: 14,
                  pointerEvents: "none",
                  overflow: "visible",
                }}
              >
                {[0, 1, 2].map((i) => {
                  const seed = t * 0.005 + i * 2.1;
                  const points = Array.from({ length: 6 }, (_, j) => {
                    const py = (j / 5) * beamH;
                    const px =
                      16 +
                      Math.sin(seed + j * 1.7) *
                        (6 + Math.sin(seed * 2 + j) * 4);
                    return `${px},${py}`;
                  }).join(" ");
                  return (
                    <polyline
                      key={i}
                      points={points}
                      fill="none"
                      stroke={`rgba(150,240,255,${0.3 + Math.sin(seed) * 0.2})`}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              {/* Impact: spark burst at hit point */}
              {laserHitY > 0 && (
                <>
                  {/* Central flash */}
                  <div
                    style={{
                      position: "absolute",
                      left: beamX,
                      top: beamTopY,
                      width: 32 * flicker * lvScale,
                      height: 32 * flicker * lvScale,
                      transform: "translate(-50%, -50%)",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(0,229,255,0.6) 30%, rgba(0,229,255,0.15) 60%, transparent 80%)",
                      zIndex: 15,
                      pointerEvents: "none",
                    }}
                  />
                  {/* Spark lines */}
                  <svg
                    style={{
                      position: "absolute",
                      left: beamX - 24,
                      top: beamTopY - 24,
                      width: 48,
                      height: 48,
                      zIndex: 16,
                      pointerEvents: "none",
                      overflow: "visible",
                    }}
                  >
                    {Array.from({ length: 8 }, (_, i) => {
                      const angle =
                        (i / 8) * Math.PI * 2 + Math.sin(t * 0.01 + i) * 0.4;
                      const len = 8 + Math.sin(t * 0.02 + i * 1.3) * 6;
                      const x1 = 24 + Math.cos(angle) * 4;
                      const y1 = 24 + Math.sin(angle) * 4;
                      const x2 = 24 + Math.cos(angle) * len;
                      const y2 = 24 + Math.sin(angle) * len;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#fff"
                          strokeWidth={1 + Math.sin(t * 0.03 + i) * 0.5}
                          strokeLinecap="round"
                          opacity={0.5 + Math.sin(t * 0.025 + i * 0.7) * 0.4}
                        />
                      );
                    })}
                    {/* Small spark dots */}
                    {Array.from({ length: 5 }, (_, i) => {
                      const angle = (i / 5) * Math.PI * 2 + t * 0.008;
                      const dist = 10 + Math.sin(t * 0.015 + i * 2) * 8;
                      return (
                        <circle
                          key={`d${i}`}
                          cx={24 + Math.cos(angle) * dist}
                          cy={24 + Math.sin(angle) * dist}
                          r={1.2}
                          fill="#b3e5fc"
                          opacity={0.4 + Math.sin(t * 0.02 + i) * 0.4}
                        />
                      );
                    })}
                  </svg>
                </>
              )}
              {/* Muzzle glow + ring at player */}
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamBottomY,
                  width: 28 * flicker,
                  height: 28 * flicker,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(0,229,255,0.4) 35%, transparent 70%)",
                  zIndex: 14,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: beamX,
                  top: beamBottomY,
                  width: 20,
                  height: 20,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `2px solid rgba(0,229,255,${0.3 * flicker})`,
                  zIndex: 14,
                  pointerEvents: "none",
                }}
              />
            </>
          );
        })()}

      {/* ===== Player Bullets ===== */}
      {(() => {
        const lv = combat.weaponLevel;
        return bullets.map((b) =>
          b.pierce ? (
            /* Pierce bullet — 보라색 에너지탄 */
            <div
              key={b.id}
              style={{
                position: "absolute",
                left: xToPx(b.x),
                top: yToPx(b.y),
                transform: "translate(-50%, -50%)",
                zIndex: 12,
                pointerEvents: "none",
              }}
            >
              {/* Outer glow — 레벨에 따라 커짐 */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 14 + lv * 4,
                  height: 28 + lv * 6,
                  transform: "translate(-50%, -40%)",
                  background: `radial-gradient(ellipse at center, rgba(192,132,252,${0.2 + lv * 0.1}) 0%, transparent 70%)`,
                  borderRadius: "50%",
                }}
              />
              {/* Core energy bolt */}
              <svg
                width={10 + lv * 2}
                height={20 + lv * 4}
                viewBox="0 0 12 24"
                style={{ display: "block" }}
              >
                <defs>
                  <linearGradient id={`pg${b.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={lv >= 3 ? "#fff" : "#e9d5ff"}
                    />
                    <stop
                      offset="40%"
                      stopColor={lv >= 3 ? "#d8b4fe" : "#c084fc"}
                    />
                    <stop
                      offset="100%"
                      stopColor={lv >= 2 ? "#6d28d9" : "#7c3aed"}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M6,0 L9,8 L7.5,7 L7.5,22 L6,24 L4.5,22 L4.5,7 L3,8Z"
                  fill={`url(#pg${b.id})`}
                />
                <path
                  d="M6,2 L7,7 L6.5,6.5 L6.5,20 L6,22 L5.5,20 L5.5,6.5 L5,7Z"
                  fill="#fff"
                  opacity={0.5 + lv * 0.15}
                />
              </svg>
              {/* Trail — lv2+ 이중 트레일 */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -4,
                  width: 3 + lv,
                  height: 3 + lv,
                  transform: "translateX(-50%)",
                  borderRadius: "50%",
                  background: "#c084fc",
                  boxShadow: `0 0 ${4 + lv * 2}px ${lv}px rgba(192,132,252,0.6)`,
                }}
              />
              {lv >= 2 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: -10,
                    width: 2,
                    height: 2,
                    transform: "translateX(-50%)",
                    borderRadius: "50%",
                    background: "#a78bfa",
                    boxShadow: "0 0 4px rgba(167,139,250,0.5)",
                  }}
                />
              )}
            </div>
          ) : b.weaponId === "shotgun" ? (
            /* Shotgun pellet — 오렌지 산탄 */
            <div
              key={b.id}
              style={{
                position: "absolute",
                left: xToPx(b.x),
                top: yToPx(b.y),
                transform: "translate(-50%, -50%)",
                zIndex: 12,
                pointerEvents: "none",
              }}
            >
              {/* Outer glow */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 12 + lv * 4,
                  height: 12 + lv * 4,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(245,158,11,${0.3 + lv * 0.1}) 0%, transparent 70%)`,
                }}
              />
              {/* Core pellet */}
              <div
                style={{
                  width: 4 + lv * 1.5,
                  height: 4 + lv * 1.5,
                  borderRadius: "50%",
                  background:
                    lv >= 3
                      ? "radial-gradient(circle at 35% 35%, #fff, #fbbf24, #d97706)"
                      : lv >= 2
                        ? "radial-gradient(circle at 35% 35%, #fef3c7, #f59e0b, #b45309)"
                        : "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #d97706)",
                  boxShadow: `0 0 ${3 + lv * 2}px ${lv}px rgba(245,158,11,${0.4 + lv * 0.15})`,
                }}
              />
              {/* lv3 fire trail */}
              {lv >= 3 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: -3,
                    width: 3,
                    height: 6,
                    transform: "translateX(-50%)",
                    borderRadius: 2,
                    background: "linear-gradient(180deg, #fbbf24, transparent)",
                    opacity: 0.6,
                  }}
                />
              )}
            </div>
          ) : (
            /* Pistol bullet */
            <div
              key={b.id}
              style={{
                position: "absolute",
                left: xToPx(b.x),
                top: yToPx(b.y),
                transform: "translate(-50%, -50%)",
                width: 4 + lv,
                height: 8 + lv * 2,
                borderRadius: 3,
                background:
                  lv >= 3
                    ? "linear-gradient(180deg, #fff, #facc15, #ea580c)"
                    : lv >= 2
                      ? "linear-gradient(180deg, #fef08a, #f59e0b)"
                      : "linear-gradient(180deg, #facc15, #f97316)",
                boxShadow: `0 0 ${4 + lv * 2}px rgba(255,200,50,${0.3 + lv * 0.15})`,
                zIndex: 11,
              }}
            />
          ),
        );
      })()}

      {/* ===== Player ===== */}
      <div
        style={{
          position: "absolute",
          left: xToPx(player.x),
          top: yToPx(player.y),
          transform: "translate(-50%, -50%)",
          zIndex: 20,
        }}
      >
        {/* Jetpack (on character's back, behind sprite) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, 0%)",
            zIndex: 22,
            opacity: 1,
          }}
        >
          <JetpackSvg size={40} />
        </div>
        {/* HP bar above head */}
        <div
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
            overflow: "hidden",
            zIndex: 25,
          }}
        >
          <div
            style={{
              width: `${playerHpPct * 100}%`,
              height: "100%",
              borderRadius: 2,
              background:
                playerHpPct > 0.5
                  ? "#57aeff"
                  : playerHpPct > 0.25
                    ? "#f59e0b"
                    : "#ef4444",
              transition: "width 0.1s",
            }}
          />
        </div>
        {/* Character sprite */}
        <div
          className={`game_player player_pistol ${isHurt ? "player-hit" : ""}`}
          style={{ position: "relative", zIndex: 1 }}
        />
        {/* Flame (from jetpack nozzles, below character) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -15,
            transform: "translate(-50%, 80%)",
            zIndex: 21,
          }}
        >
          <JetpackFlameSvg size={44} />
        </div>
      </div>

      {/* ===== Pause overlay ===== */}
      {mode === "paused" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
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
          <div style={{ fontSize: 48, marginBottom: 8 }}>⏸️</div>
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
            }}
          >
            PAUSED
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              opacity: 0.9,
              fontFamily: "Fredoka",
            }}
          >
            STAGE {stage} · TOTAL: {totalScore}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 6,
            }}
          >
            <button
              onClick={togglePause}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #34d399, #059669)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              계속하기
            </button>
            <button
              onClick={handleRetrySameStage}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              다시 시작
            </button>
          </div>
        </div>
      )}

      {/* ===== Chapter Banner (start of stage) ===== */}
      {mode === "chapter" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            borderRadius: 16,
            padding: "18px 36px",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 2.5vw, 12px)",
              letterSpacing: 4,
              opacity: 0.7,
              marginBottom: 4,
              fontFamily: "Fredoka",
              color: getChapterInfo(stage).color,
            }}
          >
            {getChapterInfo(stage).name}
          </div>
          {(stage === 1 || stage === 11 || stage === 21) && (
            <div
              style={{
                fontSize: "clamp(9px, 2vw, 11px)",
                opacity: 0.5,
                marginBottom: 6,
                fontFamily: "Fredoka",
              }}
            >
              {getChapterInfo(stage).subtitle}
            </div>
          )}
          <div
            style={{
              fontSize: "clamp(20px, 5.5vw, 28px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
              textShadow: `0 0 20px ${getChapterInfo(stage).glowColor}`,
              whiteSpace: "nowrap",
            }}
          >
            {stage === MAX_STAGE
              ? "F I N A L  B O S S"
              : isBossStage(stage)
                ? "B O S S"
                : `S T A G E  ${stage}`}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: "clamp(10px, 2.5vw, 12px)",
              opacity: 0.5,
              fontFamily: "Fredoka",
            }}
          >
            {isBossStage(stage)
              ? "BOSS BATTLE"
              : `목표: ${stageTarget(stage)} KILL`}
          </div>
        </div>
      )}

      {/* ===== Stage Transition Banner (brief, small, centered) ===== */}
      {stageBannerT > 0 && mode === "playing" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            borderRadius: 16,
            padding: "14px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              fontWeight: 900,
              color: "#fff",
              fontFamily: "Fredoka",
              whiteSpace: "nowrap",
            }}
          >
            STAGE {stage} CLEAR!
          </div>
        </div>
      )}

      {/* ===== Dialogs (gameover / ALL CLEAR only) ===== */}
      {(mode === "cleared" || mode === "gameover") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
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
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {mode === "gameover" ? "💀" : "🏆"}
          </div>
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
            }}
          >
            {mode === "gameover" ? "GAME OVER" : "ALL CLEAR!"}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              opacity: 0.9,
              fontFamily: "Fredoka",
            }}
          >
            STAGE {stage} · {score} / {target}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              opacity: 0.9,
              fontFamily: "Fredoka",
              marginBottom: 10,
            }}
          >
            TOTAL: {totalScore}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleRetrySameStage}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              다시하기
            </button>
            <button
              onClick={onExit}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #6b7280, #374151)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceShooterMode;
