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
  EnemyBulletSvg,
  ItemWeaponSvg,
  ItemFireRateSvg,
  ItemDamageUpSvg,
  ItemPierceSvg,
  ItemCloneSvg,
  ItemHealPillSvg,
} from "./spaceSvgAssets";

/* =========================================================
   Types
   ========================================================= */
type WeaponId = "pistol" | "rapid" | "pierce" | "shotgun";
type Weapon = {
  id: WeaponId;
  fireIntervalSec: number;
  bulletSpeed: number;
  pierce: boolean;
  pellets: number;
  damage: number;
  durationSec?: number;
  spreadUnits?: number;
};
type Buff = { id: string; kind: "pierce"; value: number; timeLeft: number };
type CombatState = {
  baseWeaponId: WeaponId;
  tempWeapon?: { weaponId: WeaponId; timeLeft: number };
  permFireMul: number;
  permDamageAdd: number;
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
  | { id: number; x: number; y: number; kind: "addClone"; count: 1 | 2 | 3 }
  | { id: number; x: number; y: number; kind: "heal" };

type Mode = "playing" | "paused" | "cleared" | "gameover" | "chapter";

type SpaceEnemyKind =
  | "scout"
  | "fighter"
  | "bomber"
  | "carrier"
  | "elite"
  | "spaceBoss";

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
type CloneUnit = { id: number; dx: number; dy: number };

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
const PLAYER_WIDTH = 1.0;
const PLAYER_Y_MIN = 0.25;
const PLAYER_Y_MAX = 0.92;
const FIRST_STAGE_TARGET = 20;
const NEXT_STAGE_STEP = 3;
const MAX_STAGE = 10;
const MAX_CLONES = 12;
const ENEMY_DROP_CHANCE = 0.3;
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
  rapid: {
    id: "rapid",
    fireIntervalSec: 0.22,
    bulletSpeed: 1.4,
    pierce: false,
    pellets: 1,
    damage: 1,
    durationSec: 8,
  },
  pierce: {
    id: "pierce",
    fireIntervalSec: 0.5,
    bulletSpeed: 1.3,
    pierce: true,
    pellets: 1,
    damage: 1,
    durationSec: 8,
  },
  shotgun: {
    id: "shotgun",
    fireIntervalSec: 0.55,
    bulletSpeed: 1.1,
    pierce: false,
    pellets: 5,
    damage: 1,
    durationSec: 8,
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
    hp: 2,
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
    hp: 14,
    speed: 0.08,
    damage: 2,
    widthUnits: 1.4,
    fireInterval: 3.0,
    pattern: "straight",
  },
  carrier: {
    hp: 22,
    speed: 0.06,
    damage: 1,
    widthUnits: 1.8,
    fireInterval: 3.5,
    pattern: "hover",
  },
  elite: {
    hp: 6,
    speed: 0.13,
    damage: 2,
    widthUnits: 1.0,
    fireInterval: 2.0,
    pattern: "zigzag",
  },
  spaceBoss: {
    hp: 100,
    speed: 0.04,
    damage: 3,
    widthUnits: 3.2,
    fireInterval: 0.6,
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
];

/* =========================================================
   Utilities
   ========================================================= */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));
const randFloat = (a: number, b: number) => a + Math.random() * (b - a);

function stageTarget(stage: number) {
  if (stage >= MAX_STAGE) return 1; // boss: kill 1
  const idx = (stage - 1) % 10;
  return FIRST_STAGE_TARGET + idx * NEXT_STAGE_STEP;
}

function getActiveWeapon(combat: CombatState): Weapon {
  const base = combat.tempWeapon
    ? WEAPONS[combat.tempWeapon.weaponId]
    : WEAPONS[combat.baseWeaponId];
  const hasPierce =
    base.pierce ||
    combat.buffs.some((b) => b.kind === "pierce" && b.timeLeft > 0);
  return {
    ...base,
    fireIntervalSec: Math.max(
      0.06,
      base.fireIntervalSec * (combat.permFireMul ?? 1),
    ),
    damage: Math.max(1, base.damage + (combat.permDamageAdd ?? 0)),
    pierce: hasPierce,
  };
}

function applyItem(combat: CombatState, item: Item): CombatState {
  if (item.kind === "weapon") {
    const dur = WEAPONS[item.weaponId].durationSec ?? 6;
    return {
      ...combat,
      tempWeapon: { weaponId: item.weaponId, timeLeft: dur },
    };
  }
  if (item.kind === "fireRateMul") {
    return {
      ...combat,
      permFireMul: Math.max(0.35, (combat.permFireMul ?? 1) * item.mul),
    };
  }
  if (item.kind === "damageAdd") {
    return { ...combat, permDamageAdd: (combat.permDamageAdd ?? 0) + item.add };
  }
  if (item.kind === "pierce") {
    return {
      ...combat,
      buffs: [
        ...combat.buffs,
        {
          id: String(Date.now()),
          kind: "pierce",
          value: 1,
          timeLeft: item.durationSec,
        },
      ],
    };
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

function makeEnemy(kind: SpaceEnemyKind, rule: StageRule): SpaceEnemy {
  const spec = ENEMY_SPECS[kind];
  const hw = spec.widthUnits / 2;
  return {
    id: _eid++,
    kind,
    x: randFloat(hw, LANE_COUNT - hw),
    y: kind === "spaceBoss" ? -0.3 : randFloat(-0.15, -0.05),
    hp: Math.ceil(spec.hp * rule.hpMul),
    maxHp: Math.ceil(spec.hp * rule.hpMul),
    speed: spec.speed * rule.speedMul,
    widthUnits: spec.widthUnits,
    damage: spec.damage,
    hitFx: 0,
    pattern: spec.pattern,
    patternPhase: Math.random() * Math.PI * 2,
    patternAmp: spec.pattern === "zigzag" || kind === "elite" ? 0.6 : 0,
    patternFreq: kind === "elite" ? 3.0 : 2.0,
    fireAcc: 0,
    fireInterval: spec.fireInterval,
    bossPhase: kind === "spaceBoss" ? 0 : undefined,
    bossPatternIdx: kind === "spaceBoss" ? 0 : undefined,
  };
}

function maybeDropItem(x: number, y: number): Item | null {
  if (Math.random() > ENEMY_DROP_CHANCE) return null;
  const r = Math.random();
  // 10% heal pill
  if (r < 0.3) return { id: _iid++, x, y, kind: "heal" };
  // 35% weapon
  if (r < 0.45) {
    const w: WeaponId = (["rapid", "pierce", "shotgun"] as WeaponId[])[
      randInt(0, 2)
    ];
    return { id: _iid++, x, y, kind: "weapon", weaponId: w };
  }
  // 25% fire rate
  if (r < 0.7)
    return { id: _iid++, x, y, kind: "fireRateMul", mul: 0.7, durationSec: 6 };
  // 30% damage up
  return { id: _iid++, x, y, kind: "damageAdd", add: 1, durationSec: 6 };
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
   Clone Slots
   ========================================================= */
const CLONE_SLOTS: { dx: number; dy: number }[] = [
  { dx: -0.35, dy: 0.04 },
  { dx: 0.35, dy: 0.04 },
  { dx: -0.35, dy: -0.04 },
  { dx: 0.35, dy: -0.04 },
  { dx: -0.7, dy: 0 },
  { dx: 0.7, dy: 0 },
  { dx: -0.7, dy: 0.06 },
  { dx: 0.7, dy: 0.06 },
  { dx: -1.05, dy: 0.02 },
  { dx: 1.05, dy: 0.02 },
  { dx: -1.05, dy: -0.04 },
  { dx: 1.05, dy: -0.04 },
];

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
  clones: CloneUnit[];
  score: number;
  totalScore: number;
  fireAcc: number;
  spawnAcc: number;
  hurtCd: number;
  bossSpawned: boolean;
  stageBannerT: number;
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
      baseWeaponId: "pistol",
      permFireMul: 1,
      permDamageAdd: 0,
      buffs: [],
    },
    clones: [],
    score: 0,
    totalScore: 0,
    fireAcc: 0,
    spawnAcc: 0,
    hurtCd: 0,
    bossSpawned: false,
    stageBannerT: 0,
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
    const t = setTimeout(() => setMode("playing"), 2200);
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

  /* ---- coordinate helpers ---- */
  const xToPx = (xu: number) => (xu / LANE_COUNT) * WIDTH;
  const yToPx = (yu: number) => yu * HEIGHT;

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
      s.fireAcc += dt;
      if (s.fireAcc >= weapon.fireIntervalSec) {
        s.fireAcc = 0;
        const shooters = [{ x: p.x, y: p.y }];
        for (let i = 0; i < s.clones.length; i++) {
          const slot = CLONE_SLOTS[i];
          if (slot)
            shooters.push({
              x: clamp(p.x + slot.dx, 0, LANE_COUNT),
              y: clamp(p.y + slot.dy, PLAYER_Y_MIN, PLAYER_Y_MAX),
            });
        }
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
                ? ("spaceBoss" as SpaceEnemyKind)
                : pickKind(rule.kindWeights);
            if (kind === "spaceBoss") s.bossSpawned = true;
            s.enemies.push(makeEnemy(kind, rule));
          }
        }
      }

      /* -- move enemies + fire -- */
      for (const e of s.enemies) {
        e.patternPhase += dt;
        e.hitFx = Math.max(0, e.hitFx - dt);
        e.y += e.speed * dt;

        if (e.pattern === "zigzag") {
          e.x +=
            Math.sin(e.patternPhase * e.patternFreq) * e.patternAmp * dt * 2;
          e.x = clamp(e.x, e.widthUnits / 2, LANE_COUNT - e.widthUnits / 2);
        }
        if (e.pattern === "hover" && e.y > 0.2) {
          e.y = Math.max(e.y - e.speed * dt * 0.9, 0.2);
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
          if (e.kind === "spaceBoss") {
            for (const off of [-0.3, 0.3]) {
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
              const drop = maybeDropItem(e.x, e.y);
              if (drop) s.items.push(drop);
            } else if (e.kind === "spaceBoss" && Math.random() < 0.1) {
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

      /* -- collision: enemy bullets vs player -- */
      if (s.hurtCd > 0) {
        s.hurtCd -= dt;
      } else {
        const aliveEB: EnemyBullet[] = [];
        let dmg = 0;
        for (const b of s.enemyBullets) {
          if (
            segmentCircleHit(b.px, b.py, b.x, b.y, p.x, p.y, 0.03 + b.radius)
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
      if (s.hurtCd <= 0) {
        for (const e of s.enemies) {
          const dist = (e.widthUnits + p.widthUnits) * 0.3;
          if (Math.abs(e.x - p.x) < dist && Math.abs(e.y - p.y) < 0.07) {
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
          if (it.kind === "heal") {
            p.hp = p.maxHp;
          } else if (it.kind === "addClone") {
            for (let i = 0; i < it.count && s.clones.length < MAX_CLONES; i++) {
              s.clones.push({ id: Date.now() + i, dx: 0, dy: 0 });
            }
          } else {
            s.combat = applyItem(s.combat, it);
          }
        } else {
          remainItems.push(it);
        }
      }
      s.items = remainItems;

      /* -- combat tick -- */
      if (s.combat.tempWeapon) {
        s.combat.tempWeapon.timeLeft -= dt;
        if (s.combat.tempWeapon.timeLeft <= 0)
          s.combat = { ...s.combat, tempWeapon: undefined };
      }
      s.combat.buffs = s.combat.buffs.filter((b) => {
        b.timeLeft -= dt;
        return b.timeLeft > 0;
      });

      /* -- stage clear check -- */
      if (s.score >= target && s.stageBannerT <= 0) {
        if (curStage >= MAX_STAGE) {
          setMode("cleared");
          forceRender((t) => t + 1);
          return;
        } else {
          s.stageBannerT = 1.5;
        }
      }

      forceRender((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ---- handlers ---- */
  const handleRetry = () => {
    g.current = initGameState();
    lastTimeRef.current = null;
    setStage(1);
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
    clones,
    hurtCd,
    stageBannerT,
  } = g.current;
  const target = stageTarget(stage);
  const playerHpPct = player.hp / player.maxHp;
  const isHurt = hurtCd > 0;

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
          "linear-gradient(180deg, #050510 0%, #0a0a2e 50%, #050510 100%)",
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
      <div
        style={{
          position: "absolute",
          left: "20%",
          top: "30%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(100,50,180,0.06) 0%, transparent 70%)",
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
          background:
            "radial-gradient(circle, rgba(50,100,200,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <BackButton onExit={onExit} />

      {/* ===== HUD ===== */}
      <div
        style={{
          position: "absolute",
          top: "max(8px, env(safe-area-inset-top))",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "clamp(20px, 5vw, 28px)",
          fontFamily: "Fredoka",
          fontWeight: 600,
          color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          zIndex: 10,
        }}
      >
        STAGE {stage}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 34px)",
          left: 12,
          fontSize: "clamp(11px, 3vw, 13px)",
          color: "#aaa",
          fontWeight: 700,
          zIndex: 10,
        }}
      >
        {score}/{target}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 34px)",
          right: 12,
          fontSize: "clamp(11px, 3vw, 13px)",
          color: "#aaa",
          fontWeight: 700,
          zIndex: 10,
        }}
      >
        TOTAL: {totalScore}
      </div>

      {/* ===== HP bar (bottom, mobile-friendly) ===== */}
      <div
        style={{
          position: "absolute",
          bottom: "max(12px, env(safe-area-inset-bottom))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          maxWidth: 200,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.15)",
          overflow: "hidden",
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: `${playerHpPct * 100}%`,
            height: "100%",
            borderRadius: 999,
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
                : "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
          }}
        >
          {it.kind === "weapon" && <ItemWeaponSvg size={26} />}
          {it.kind === "fireRateMul" && <ItemFireRateSvg size={26} />}
          {it.kind === "damageAdd" && <ItemDamageUpSvg size={26} />}
          {it.kind === "pierce" && <ItemPierceSvg size={26} />}
          {it.kind === "addClone" && <ItemCloneSvg size={26} />}
          {it.kind === "heal" && <ItemHealPillSvg size={30} />}
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
        const Svg =
          e.kind === "scout"
            ? ScoutUfo
            : e.kind === "fighter"
              ? FighterUfo
              : e.kind === "bomber"
                ? BomberUfo
                : e.kind === "carrier"
                  ? CarrierUfo
                  : e.kind === "elite"
                    ? EliteUfo
                    : null;

        return (
          <div
            key={e.id}
            style={{
              position: "absolute",
              left: px,
              top: py,
              transform: "translate(-50%, -50%)",
              zIndex: e.kind === "spaceBoss" ? 18 : 14,
            }}
          >
            {e.kind === "spaceBoss" ? (
              <SpaceBossSvg size={w} hpRatio={e.hp / e.maxHp} hit={isHit} />
            ) : Svg ? (
              <Svg size={w} hit={isHit} />
            ) : null}
            {/* HP bar */}
            {e.kind !== "spaceBoss" && e.hp < e.maxHp && (
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
            {/* Boss HP bar */}
            {e.kind === "spaceBoss" && (
              <div
                style={{
                  position: "absolute",
                  bottom: -16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: w * 0.8,
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(e.hp / e.maxHp) * 100}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "linear-gradient(90deg, #ef4444, #f59e0b)",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* ===== Player Bullets ===== */}
      {bullets.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: xToPx(b.x),
            top: yToPx(b.y),
            transform: "translate(-50%, -50%)",
            width: 6,
            height: b.pierce ? 18 : 10,
            borderRadius: 4,
            background:
              b.weaponId === "shotgun"
                ? "linear-gradient(180deg, #b0d4ff, #60a5fa)"
                : "linear-gradient(180deg, #facc15, #f97316)",
            boxShadow: "0 0 6px rgba(255,200,50,0.4)",
            zIndex: 11,
          }}
        />
      ))}

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

      {/* ===== Clones ===== */}
      {clones.map((c, i) => {
        const slot = CLONE_SLOTS[i];
        if (!slot) return null;
        const cx = clamp(player.x + slot.dx, 0, LANE_COUNT);
        const cy = clamp(player.y + slot.dy, PLAYER_Y_MIN, PLAYER_Y_MAX);
        return (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: xToPx(cx),
              top: yToPx(cy),
              transform: "translate(-50%, -50%)",
              zIndex: 19,
              opacity: 0.7,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "18%",
                transform: "translate(-50%, 0%)",
                zIndex: 0,
                opacity: 0.75,
              }}
            >
              <JetpackSvg size={32} />
            </div>
            <div
              className="game_player player_pistol"
              style={{
                position: "relative",
                zIndex: 1,
                transform: "scale(0.8)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 0,
                transform: "translate(-50%, 80%)",
                zIndex: 0,
                opacity: 0.7,
              }}
            >
              <JetpackFlameSvg size={36} />
            </div>
          </div>
        );
      })}

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
            borderRadius: 16,
            padding: "16px 32px",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 2.5vw, 12px)",
              letterSpacing: 4,
              opacity: 0.6,
              marginBottom: 4,
            }}
          >
            SPACE SHOOTER
          </div>
          <div
            style={{
              fontSize: "clamp(20px, 5.5vw, 28px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
              textShadow: "0 0 20px rgba(100,150,255,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {stage === MAX_STAGE ? "F I N A L" : `S T A G E  ${stage}`}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: "clamp(10px, 2.5vw, 12px)",
              opacity: 0.5,
            }}
          >
            {stage === MAX_STAGE
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
            {mode === "gameover" ? "💀" : "🏆"}
          </div>
          <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 1000 }}>
            {mode === "gameover" ? "GAME OVER" : "ALL CLEAR!"}
          </div>
          <div style={{ fontSize: "clamp(12px, 3vw, 14px)", opacity: 0.92 }}>
            STAGE {stage} · SCORE {score} / {target}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              opacity: 0.92,
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
              onClick={handleRetry}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 14px 24px rgba(0,0,0,0.35)",
              }}
            >
              처음부터
            </button>
            <button
              onClick={onExit}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                background: "linear-gradient(180deg, #6b7280, #374151)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 14px 24px rgba(0,0,0,0.35)",
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
