import React, { useEffect, useMemo, useRef, useState } from "react";
import BackButton from "components/item/BackButton";
import {
  JetpackSvg,
  ScoutUfo,
  FighterUfo,
  BomberUfo,
  CarrierUfo,
  EliteUfo,
  SpaceBossSvg,
  EnemyBulletSvg,
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
  | { id: number; x: number; y: number; kind: "fireRateMul"; mul: number; durationSec: number }
  | { id: number; x: number; y: number; kind: "damageAdd"; add: number; durationSec: number }
  | { id: number; x: number; y: number; kind: "pierce"; durationSec: number }
  | { id: number; x: number; y: number; kind: "addClone"; count: 1 | 2 | 3 };

type Mode = "playing" | "paused" | "cleared" | "gameover" | "chapter";

type SpaceEnemyKind = "scout" | "fighter" | "bomber" | "carrier" | "elite" | "spaceBoss";

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

type Player = { x: number; y: number; widthUnits: number; hp: number; maxHp: number };
type CloneUnit = { id: number; dx: number; dy: number };

type Star = { x: number; y: number; size: number; speed: number; brightness: number };

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
const ENEMY_DROP_CHANCE = 0.28;
const ITEM_SPEED = 0.18;

const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: { id: "pistol", fireIntervalSec: 0.5, bulletSpeed: 1.2, pierce: false, pellets: 1, damage: 1 },
  rapid: { id: "rapid", fireIntervalSec: 0.22, bulletSpeed: 1.4, pierce: false, pellets: 1, damage: 1, durationSec: 8 },
  pierce: { id: "pierce", fireIntervalSec: 0.5, bulletSpeed: 1.3, pierce: true, pellets: 1, damage: 1, durationSec: 8 },
  shotgun: { id: "shotgun", fireIntervalSec: 0.55, bulletSpeed: 1.1, pierce: false, pellets: 5, damage: 1, durationSec: 8, spreadUnits: 1.2 },
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
  scout:     { hp: 2,  speed: 0.28, damage: 1, widthUnits: 0.8,  fireInterval: 0,   pattern: "straight" },
  fighter:   { hp: 4,  speed: 0.20, damage: 1, widthUnits: 1.0,  fireInterval: 2.0, pattern: "zigzag" },
  bomber:    { hp: 8,  speed: 0.14, damage: 2, widthUnits: 1.4,  fireInterval: 2.5, pattern: "straight" },
  carrier:   { hp: 12, speed: 0.10, damage: 1, widthUnits: 1.8,  fireInterval: 3.0, pattern: "hover" },
  elite:     { hp: 6,  speed: 0.24, damage: 2, widthUnits: 1.0,  fireInterval: 1.5, pattern: "zigzag" },
  spaceBoss: { hp: 100, speed: 0.08, damage: 3, widthUnits: 3.2, fireInterval: 0.5, pattern: "hover" },
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
  /* 1  */ { spawnInterval: 1.8, maxAlive: 8,  batchMin: 2, batchMax: 3, kindWeights: { scout: 0.9, fighter: 0.1 }, hpMul: 1.0, speedMul: 1.0 },
  /* 2  */ { spawnInterval: 1.5, maxAlive: 10, batchMin: 2, batchMax: 4, kindWeights: { scout: 0.6, fighter: 0.4 }, hpMul: 1.1, speedMul: 1.02 },
  /* 3  */ { spawnInterval: 1.4, maxAlive: 10, batchMin: 2, batchMax: 4, kindWeights: { scout: 0.4, fighter: 0.35, bomber: 0.25 }, hpMul: 1.2, speedMul: 1.04 },
  /* 4  */ { spawnInterval: 1.3, maxAlive: 12, batchMin: 3, batchMax: 5, kindWeights: { scout: 0.3, fighter: 0.3, bomber: 0.2, carrier: 0.2 }, hpMul: 1.3, speedMul: 1.06 },
  /* 5  */ { spawnInterval: 1.2, maxAlive: 12, batchMin: 3, batchMax: 5, kindWeights: { scout: 0.2, fighter: 0.3, bomber: 0.2, elite: 0.3 }, hpMul: 1.4, speedMul: 1.08 },
  /* 6  */ { spawnInterval: 1.1, maxAlive: 14, batchMin: 3, batchMax: 5, kindWeights: { scout: 0.15, fighter: 0.3, bomber: 0.2, carrier: 0.15, elite: 0.2 }, hpMul: 1.5, speedMul: 1.10 },
  /* 7  */ { spawnInterval: 1.0, maxAlive: 14, batchMin: 3, batchMax: 6, kindWeights: { fighter: 0.3, bomber: 0.25, carrier: 0.2, elite: 0.25 }, hpMul: 1.6, speedMul: 1.12 },
  /* 8  */ { spawnInterval: 0.9, maxAlive: 16, batchMin: 4, batchMax: 6, kindWeights: { fighter: 0.25, bomber: 0.25, carrier: 0.2, elite: 0.3 }, hpMul: 1.7, speedMul: 1.14 },
  /* 9  */ { spawnInterval: 0.8, maxAlive: 16, batchMin: 4, batchMax: 7, kindWeights: { fighter: 0.2, bomber: 0.3, carrier: 0.2, elite: 0.3 }, hpMul: 1.8, speedMul: 1.16 },
  /* 10 */ { spawnInterval: 999, maxAlive: 1,  batchMin: 1, batchMax: 1, kindWeights: { spaceBoss: 1 }, hpMul: 1.0, speedMul: 1.0, isBoss: true },
];

/* =========================================================
   Utilities
   ========================================================= */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
const randFloat = (a: number, b: number) => a + Math.random() * (b - a);

function stageTarget(stage: number) {
  const idx = (stage - 1) % 10;
  return FIRST_STAGE_TARGET + idx * NEXT_STAGE_STEP;
}

function getActiveWeapon(combat: CombatState): Weapon {
  const base = combat.tempWeapon ? WEAPONS[combat.tempWeapon.weaponId] : WEAPONS[combat.baseWeaponId];
  const hasPierce = base.pierce || combat.buffs.some((b) => b.kind === "pierce" && b.timeLeft > 0);
  return {
    ...base,
    fireIntervalSec: Math.max(0.06, base.fireIntervalSec * (combat.permFireMul ?? 1)),
    damage: Math.max(1, base.damage + (combat.permDamageAdd ?? 0)),
    pierce: hasPierce,
  };
}

function applyItem(combat: CombatState, item: Item): CombatState {
  if (item.kind === "weapon") {
    const dur = WEAPONS[item.weaponId].durationSec ?? 6;
    return { ...combat, tempWeapon: { weaponId: item.weaponId, timeLeft: dur } };
  }
  if (item.kind === "fireRateMul") {
    return { ...combat, permFireMul: Math.max(0.35, (combat.permFireMul ?? 1) * item.mul) };
  }
  if (item.kind === "damageAdd") {
    return { ...combat, permDamageAdd: (combat.permDamageAdd ?? 0) + item.add };
  }
  if (item.kind === "pierce") {
    return { ...combat, buffs: [...combat.buffs, { id: String(Date.now()), kind: "pierce", value: 1, timeLeft: item.durationSec }] };
  }
  return combat;
}

function segmentCircleHit(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number) {
  const abx = bx - ax, aby = by - ay;
  const acx = cx - ax, acy = cy - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 <= 0 ? 0 : clamp((acx * abx + acy * aby) / len2, 0, 1);
  const hx = ax + abx * t, hy = ay + aby * t;
  const dx = cx - hx, dy = cy - hy;
  return dx * dx + dy * dy <= r * r;
}

function pickKind(weights: Partial<Record<SpaceEnemyKind, number>>): SpaceEnemyKind {
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
  if (r < 0.42) {
    const w: WeaponId = (["rapid", "pierce", "shotgun"] as WeaponId[])[randInt(0, 2)];
    return { id: _iid++, x, y, kind: "weapon", weaponId: w };
  }
  if (r < 0.72) return { id: _iid++, x, y, kind: "fireRateMul", mul: 0.7, durationSec: 6 };
  return { id: _iid++, x, y, kind: "damageAdd", add: 1, durationSec: 6 };
}

function generateStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 45; i++) stars.push({ x: Math.random(), y: Math.random(), size: 1, speed: 0.02 + Math.random() * 0.01, brightness: 0.3 + Math.random() * 0.3 });
  for (let i = 0; i < 20; i++) stars.push({ x: Math.random(), y: Math.random(), size: 2, speed: 0.04 + Math.random() * 0.02, brightness: 0.5 + Math.random() * 0.3 });
  for (let i = 0; i < 8; i++) stars.push({ x: Math.random(), y: Math.random(), size: 3, speed: 0.07 + Math.random() * 0.03, brightness: 0.7 + Math.random() * 0.3 });
  return stars;
}

/* =========================================================
   Clone Slots
   ========================================================= */
const CLONE_SLOTS: { dx: number; dy: number }[] = [
  { dx: -0.35, dy: 0.04 }, { dx: 0.35, dy: 0.04 },
  { dx: -0.35, dy: -0.04 }, { dx: 0.35, dy: -0.04 },
  { dx: -0.7, dy: 0 }, { dx: 0.7, dy: 0 },
  { dx: -0.7, dy: 0.06 }, { dx: 0.7, dy: 0.06 },
  { dx: -1.05, dy: 0.02 }, { dx: 1.05, dy: 0.02 },
  { dx: -1.05, dy: -0.04 }, { dx: 1.05, dy: -0.04 },
];

/* =========================================================
   Component
   ========================================================= */
interface Props {
  onExit: () => void;
}

const SpaceShooterMode: React.FC<Props> = ({ onExit }) => {
  /* ---- viewport ---- */
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      setViewport({ width: Math.floor(vv?.width ?? window.innerWidth), height: Math.floor(vv?.height ?? window.innerHeight) });
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

  /* ---- game state ---- */
  const [stage, setStage] = useState(1);
  const ruleIdx = clamp(stage - 1, 0, STAGE_RULES.length - 1);
  const rule = STAGE_RULES[ruleIdx];
  const target = stageTarget(stage);

  const [mode, setMode] = useState<Mode>("chapter");
  const [player, setPlayer] = useState<Player>({ x: LANE_COUNT / 2, y: 0.82, widthUnits: PLAYER_WIDTH, hp: 12, maxHp: 12 });
  const [enemies, setEnemies] = useState<SpaceEnemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [combat, setCombat] = useState<CombatState>({ baseWeaponId: "pistol", permFireMul: 1, permDamageAdd: 0, buffs: [] });
  const [clones, setClones] = useState<CloneUnit[]>([]);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const stars = useMemo(generateStars, []);
  const starsRef = useRef(stars);

  const lastTimeRef = useRef<number | null>(null);
  const fireAccRef = useRef(0);
  const spawnAccRef = useRef(0);
  const hurtCdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef(player);
  const combatRef = useRef(combat);
  const bossSpawnedRef = useRef(false);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { combatRef.current = combat; }, [combat]);

  /* ---- chapter banner ---- */
  useEffect(() => {
    if (mode !== "chapter") return;
    const t = setTimeout(() => setMode("playing"), 2200);
    return () => clearTimeout(t);
  }, [mode]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const STEP = 0.45;
    const held = new Set<string>();
    const onDown = (e: KeyboardEvent) => { held.add(e.key); };
    const onUp = (e: KeyboardEvent) => { held.delete(e.key); };
    const iv = setInterval(() => {
      setPlayer(p => {
        let { x, y } = p;
        if (held.has("ArrowLeft")) x -= STEP * 0.016 * 60;
        if (held.has("ArrowRight")) x += STEP * 0.016 * 60;
        if (held.has("ArrowUp")) y -= STEP * 0.5 * 0.016 * 60;
        if (held.has("ArrowDown")) y += STEP * 0.5 * 0.016 * 60;
        return { ...p, x: clamp(x, 0, LANE_COUNT), y: clamp(y, PLAYER_Y_MIN, PLAYER_Y_MAX) };
      });
    }, 16);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); clearInterval(iv); };
  }, []);

  /* ---- touch (relative drag) ---- */
  const touchRef = useRef<{ tx: number; ty: number; px: number; py: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { tx: t.clientX, ty: t.clientY, px: playerRef.current.x, py: playerRef.current.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || !containerRef.current) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const sens = 1.3;
    const dx = ((t.clientX - touchRef.current.tx) / rect.width) * LANE_COUNT * sens;
    const dy = ((t.clientY - touchRef.current.ty) / rect.height) * sens;
    setPlayer(p => ({
      ...p,
      x: clamp(touchRef.current!.px + dx, 0, LANE_COUNT),
      y: clamp(touchRef.current!.py + dy, PLAYER_Y_MIN, PLAYER_Y_MAX),
    }));
  };
  const onTouchEnd = () => { touchRef.current = null; };

  /* ---- coordinate helpers ---- */
  const xToPx = (xu: number) => (xu / LANE_COUNT) * WIDTH;
  const yToPx = (yu: number) => yu * HEIGHT;

  /* =========================================================
     GAME LOOP
     ========================================================= */
  useEffect(() => {
    if (mode !== "playing") return;
    let raf: number;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = time;

      const p = playerRef.current;
      const cmb = combatRef.current;
      const weapon = getActiveWeapon(cmb);

      /* -- stars scroll -- */
      for (const s of starsRef.current) {
        s.y = (s.y + s.speed * dt) % 1.0;
      }

      /* -- auto fire -- */
      fireAccRef.current += dt;
      let newBullets: Bullet[] = [];
      if (fireAccRef.current >= weapon.fireIntervalSec) {
        fireAccRef.current = 0;
        const shooters = [{ x: p.x, y: p.y }];
        for (const c of clones) {
          const slot = CLONE_SLOTS[c.dx !== undefined ? clones.indexOf(c) : 0];
          if (slot) shooters.push({ x: clamp(p.x + slot.dx, 0, LANE_COUNT), y: clamp(p.y + slot.dy, PLAYER_Y_MIN, PLAYER_Y_MAX) });
        }
        for (const sh of shooters) {
          if (weapon.pellets === 1) {
            newBullets.push({ id: _bid++, x: sh.x, y: sh.y, vx: 0, vy: -weapon.bulletSpeed, damage: weapon.damage, pierce: weapon.pierce, weaponId: weapon.id });
          } else {
            for (let i = 0; i < weapon.pellets; i++) {
              const spread = weapon.spreadUnits ?? 1;
              const ox = (i / (weapon.pellets - 1) - 0.5) * spread;
              newBullets.push({ id: _bid++, x: sh.x + ox, y: sh.y, vx: ox * 0.3, vy: -weapon.bulletSpeed, damage: weapon.damage, pierce: weapon.pierce, weaponId: weapon.id });
            }
          }
        }
      }

      /* -- spawn enemies -- */
      let newEnemies: SpaceEnemy[] = [];
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= rule.spawnInterval) {
        spawnAccRef.current = 0;
        setEnemies(prev => {
          if (prev.length >= rule.maxAlive) return prev;
          const batch = randInt(rule.batchMin, rule.batchMax);
          const spawned: SpaceEnemy[] = [];
          for (let i = 0; i < batch && prev.length + spawned.length < rule.maxAlive; i++) {
            const kind = rule.isBoss && !bossSpawnedRef.current ? "spaceBoss" as SpaceEnemyKind : pickKind(rule.kindWeights);
            if (kind === "spaceBoss") bossSpawnedRef.current = true;
            spawned.push(makeEnemy(kind, rule));
          }
          return [...prev, ...spawned];
        });
      }

      /* -- update all entities -- */
      setEnemies(prev => {
        let updated = prev.map(e => {
          let { x, y, patternPhase, hitFx, fireAcc } = e;
          patternPhase += dt;
          hitFx = Math.max(0, hitFx - dt);
          y += e.speed * dt;

          // patterns
          if (e.pattern === "zigzag") {
            x += Math.sin(patternPhase * e.patternFreq) * e.patternAmp * dt * 2;
            x = clamp(x, e.widthUnits / 2, LANE_COUNT - e.widthUnits / 2);
          }
          if (e.pattern === "hover" && y > 0.2) {
            y = Math.max(y - e.speed * dt * 0.9, 0.2);
          }

          // enemy fire
          fireAcc += dt;
          if (e.fireInterval > 0 && fireAcc >= e.fireInterval && y > 0.02 && y < 0.85) {
            fireAcc = 0;
            const px = playerRef.current.x;
            const py = playerRef.current.y;
            const angle = Math.atan2(py - y, px - x);
            const spd = 0.25;
            setEnemyBullets(eb => [
              ...eb,
              { id: _bid++, x, y, px: x, py: y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, radius: 0.08, damage: e.damage },
            ]);
            // boss spread
            if (e.kind === "spaceBoss") {
              for (const off of [-0.3, 0.3]) {
                setEnemyBullets(eb => [
                  ...eb,
                  { id: _bid++, x, y, px: x, py: y, vx: Math.cos(angle + off) * spd, vy: Math.sin(angle + off) * spd, radius: 0.06, damage: e.damage },
                ]);
              }
            }
          }

          return { ...e, x, y, patternPhase, hitFx, fireAcc };
        });
        // remove off-screen
        updated = updated.filter(e => e.y < 1.3);
        return updated;
      });

      // move bullets
      setBullets(prev => {
        const all = [...prev, ...newBullets];
        return all.map(b => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt })).filter(b => b.y > -0.1 && b.y < 1.2 && b.x > -0.5 && b.x < LANE_COUNT + 0.5);
      });

      // move enemy bullets
      setEnemyBullets(prev =>
        prev.map(b => ({ ...b, px: b.x, py: b.y, x: b.x + b.vx * dt, y: b.y + b.vy * dt })).filter(b => b.y > -0.2 && b.y < 1.3 && b.x > -0.5 && b.x < LANE_COUNT + 0.5)
      );

      // move items
      setItems(prev => prev.map(it => ({ ...it, y: it.y + ITEM_SPEED * dt })).filter(it => it.y < 1.2));

      /* -- collisions: bullets vs enemies -- */
      setBullets(prevB => {
        setEnemies(prevE => {
          const aliveE = [...prevE];
          const aliveB: Bullet[] = [];
          const drops: Item[] = [];
          let kills = 0;

          for (const b of prevB) {
            let consumed = false;
            for (const e of aliveE) {
              if (e.hp <= 0) continue;
              const hw = e.widthUnits / 2;
              if (Math.abs(b.x - e.x) < hw + 0.12 && Math.abs(b.y - e.y) < 0.05) {
                e.hp -= b.damage;
                e.hitFx = 0.12;
                if (e.hp <= 0) {
                  kills++;
                  const drop = maybeDropItem(e.x, e.y);
                  if (drop) drops.push(drop);
                }
                if (!b.pierce) { consumed = true; break; }
              }
            }
            if (!consumed) aliveB.push(b);
          }

          if (kills > 0) {
            setScore(s => s + kills);
            setTotalScore(s => s + kills);
          }
          if (drops.length > 0) setItems(prev => [...prev, ...drops]);

          return aliveE.filter(e => e.hp > 0);
        });
        return prevB; // will be overwritten by the map above
      });

      /* -- collisions: enemy bullets vs player -- */
      setEnemyBullets(prev => {
        if (hurtCdRef.current > 0) { hurtCdRef.current -= dt; return prev; }
        const pp = playerRef.current;
        const alive: EnemyBullet[] = [];
        let dmg = 0;
        for (const b of prev) {
          if (segmentCircleHit(b.px, b.py, b.x, b.y, pp.x, pp.y, 0.03 + b.radius)) {
            dmg += b.damage;
          } else {
            alive.push(b);
          }
        }
        if (dmg > 0) {
          hurtCdRef.current = 0.2;
          setPlayer(p => {
            const newHp = p.hp - dmg;
            if (newHp <= 0) setMode("gameover");
            return { ...p, hp: Math.max(0, newHp) };
          });
        }
        return alive;
      });

      /* -- item pickup -- */
      setItems(prev => {
        const pp = playerRef.current;
        const remain: Item[] = [];
        for (const it of prev) {
          if (Math.abs(it.x - pp.x) < 0.6 && Math.abs(it.y - pp.y) < 0.08) {
            if (it.kind === "addClone") {
              setClones(c => {
                const next = [...c];
                for (let i = 0; i < it.count && next.length < MAX_CLONES; i++) {
                  next.push({ id: Date.now() + i, dx: 0, dy: 0 });
                }
                return next;
              });
            } else {
              setCombat(c => applyItem(c, it));
            }
          } else {
            remain.push(it);
          }
        }
        return remain;
      });

      /* -- combat tick (temp weapon / buffs) -- */
      setCombat(c => {
        let next = { ...c };
        if (next.tempWeapon) {
          next.tempWeapon = { ...next.tempWeapon, timeLeft: next.tempWeapon.timeLeft - dt };
          if (next.tempWeapon.timeLeft <= 0) next.tempWeapon = undefined;
        }
        next.buffs = next.buffs.map(b => ({ ...b, timeLeft: b.timeLeft - dt })).filter(b => b.timeLeft > 0);
        return next;
      });

      /* -- stage clear check -- */
      setScore(s => {
        if (s >= target && mode === "playing") {
          setMode("cleared");
        }
        return s;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, rule, target]);

  /* ---- handlers ---- */
  const resetStageState = () => {
    lastTimeRef.current = null;
    fireAccRef.current = 0;
    spawnAccRef.current = 0;
    hurtCdRef.current = 0;
    bossSpawnedRef.current = false;
    setEnemies([]);
    setBullets([]);
    setEnemyBullets([]);
    setItems([]);
    setScore(0);
  };

  const handleRetry = () => {
    resetStageState();
    setStage(1);
    setTotalScore(0);
    setPlayer({ x: LANE_COUNT / 2, y: 0.82, widthUnits: PLAYER_WIDTH, hp: 12, maxHp: 12 });
    setClones([]);
    setCombat({ baseWeaponId: "pistol", permFireMul: 1, permDamageAdd: 0, buffs: [] });
    setMode("chapter");
  };

  const handleNextStage = () => {
    if (stage >= MAX_STAGE) return;
    resetStageState();
    setStage(s => s + 1);
    setMode("chapter");
  };

  const playerHpPct = player.hp / player.maxHp;
  const isHurt = hurtCdRef.current > 0;

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
        margin: "0 auto",
        overflow: "hidden",
        touchAction: "none",
        background: "linear-gradient(180deg, #050510 0%, #0a0a2e 50%, #050510 100%)",
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
      <div style={{ position: "absolute", left: "20%", top: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,50,180,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: "10%", top: "60%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(50,100,200,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <BackButton onExit={onExit} />

      {/* ===== HUD ===== */}
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", fontSize: 28, fontFamily: "Fredoka", fontWeight: 600, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)", zIndex: 10 }}>
        STAGE {stage}
      </div>
      <div style={{ position: "absolute", top: 42, left: 12, fontSize: 13, color: "#aaa", fontWeight: 700, zIndex: 10 }}>
        {score}/{target}
      </div>
      <div style={{ position: "absolute", top: 42, right: 12, fontSize: 13, color: "#aaa", fontWeight: 700, zIndex: 10 }}>
        TOTAL: {totalScore}
      </div>

      {/* ===== Items ===== */}
      {items.map(it => (
        <div
          key={it.id}
          style={{
            position: "absolute",
            left: xToPx(it.x),
            top: yToPx(it.y),
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: 6,
            background: it.kind === "weapon" ? "#f59e0b" : it.kind === "fireRateMul" ? "#3b82f6" : "#10b981",
            boxShadow: "0 0 8px rgba(255,255,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#fff",
            fontWeight: 900,
            zIndex: 15,
          }}
        >
          {it.kind === "weapon" ? "W" : it.kind === "fireRateMul" ? "F" : it.kind === "damageAdd" ? "D" : "P"}
        </div>
      ))}

      {/* ===== Enemy Bullets ===== */}
      {enemyBullets.map(b => (
        <div key={b.id} style={{ position: "absolute", left: xToPx(b.x), top: yToPx(b.y), transform: "translate(-50%, -50%)", zIndex: 12 }}>
          <EnemyBulletSvg size={Math.round(b.radius * 2 * (WIDTH / LANE_COUNT))} />
        </div>
      ))}

      {/* ===== Enemies ===== */}
      {enemies.map(e => {
        const px = xToPx(e.x);
        const py = yToPx(e.y);
        const w = e.widthUnits * laneWidth;
        const isHit = e.hitFx > 0;
        const Svg = e.kind === "scout" ? ScoutUfo
          : e.kind === "fighter" ? FighterUfo
          : e.kind === "bomber" ? BomberUfo
          : e.kind === "carrier" ? CarrierUfo
          : e.kind === "elite" ? EliteUfo
          : null;

        return (
          <div key={e.id} style={{ position: "absolute", left: px, top: py, transform: "translate(-50%, -50%)", zIndex: e.kind === "spaceBoss" ? 18 : 14 }}>
            {e.kind === "spaceBoss" ? (
              <SpaceBossSvg size={w} hpRatio={e.hp / e.maxHp} hit={isHit} />
            ) : Svg ? (
              <Svg size={w} hit={isHit} />
            ) : null}
            {/* HP bar */}
            {e.kind !== "spaceBoss" && e.hp < e.maxHp && (
              <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                <div style={{ width: `${(e.hp / e.maxHp) * 100}%`, height: "100%", borderRadius: 2, background: "#ef4444" }} />
              </div>
            )}
            {/* Boss HP bar */}
            {e.kind === "spaceBoss" && (
              <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", width: w * 0.8, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                <div style={{ width: `${(e.hp / e.maxHp) * 100}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #ef4444, #f59e0b)" }} />
              </div>
            )}
          </div>
        );
      })}

      {/* ===== Player Bullets ===== */}
      {bullets.map(b => (
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
            background: b.weaponId === "shotgun"
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
        {/* HP bar */}
        <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 56, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden", zIndex: 999 }}>
          <div style={{ width: `${playerHpPct * 100}%`, height: "100%", borderRadius: 999, background: "#57aeff" }} />
        </div>
        {/* Jetpack (behind character) */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -30%)", zIndex: 0, opacity: 0.85 }}>
          <JetpackSvg size={40} />
        </div>
        {/* Character sprite */}
        <div
          className={`game_player player_pistol ${isHurt ? "player-hit" : ""}`}
          style={{ position: "relative", zIndex: 1 }}
        />
      </div>

      {/* ===== Clones ===== */}
      {clones.map((c, i) => {
        const slot = CLONE_SLOTS[i];
        if (!slot) return null;
        const cx = clamp(player.x + slot.dx, 0, LANE_COUNT);
        const cy = clamp(player.y + slot.dy, PLAYER_Y_MIN, PLAYER_Y_MAX);
        return (
          <div key={c.id} style={{ position: "absolute", left: xToPx(cx), top: yToPx(cy), transform: "translate(-50%, -50%)", zIndex: 19, opacity: 0.7 }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -30%)", zIndex: 0, opacity: 0.7 }}>
              <JetpackSvg size={32} />
            </div>
            <div className="game_player player_pistol" style={{ position: "relative", zIndex: 1, transform: "scale(0.8)" }} />
          </div>
        );
      })}

      {/* ===== Chapter Banner ===== */}
      {mode === "chapter" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200,
          background: "rgba(0,0,0,0.85)", color: "#fff",
        }}>
          <div style={{ fontSize: 14, letterSpacing: 6, opacity: 0.6, marginBottom: 8 }}>SPACE SHOOTER</div>
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "Fredoka", textShadow: "0 0 20px rgba(100,150,255,0.5)" }}>
            {stage === MAX_STAGE ? "F I N A L" : `S T A G E  ${stage}`}
          </div>
          <div style={{ marginTop: 16, fontSize: 13, opacity: 0.5 }}>
            {stage === MAX_STAGE ? "BOSS BATTLE" : `목표: ${stageTarget(stage)} KILL`}
          </div>
        </div>
      )}

      {/* ===== Dialogs ===== */}
      {(mode === "cleared" || mode === "gameover") && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 24, gap: 10, zIndex: 300,
        }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>
            {mode === "gameover" ? "💀" : stage >= MAX_STAGE ? "🏆" : "🎉"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>
            {mode === "gameover" ? "GAME OVER" : stage >= MAX_STAGE ? "ALL CLEAR!" : "STAGE CLEAR"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.92 }}>
            STAGE {stage} · SCORE {score} / {target}
          </div>
          <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 10 }}>
            TOTAL: {totalScore}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleRetry} style={{ padding: "12px 18px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 16, background: "linear-gradient(180deg, #60a5fa, #2563eb)", color: "#fff", cursor: "pointer", boxShadow: "0 14px 24px rgba(0,0,0,0.35)" }}>
              처음부터
            </button>
            {mode === "cleared" && stage < MAX_STAGE && (
              <button onClick={handleNextStage} style={{ padding: "12px 18px", borderRadius: 12, border: "none", fontWeight: 1000, fontSize: 16, background: "linear-gradient(180deg, #34d399, #059669)", color: "#fff", cursor: "pointer", boxShadow: "0 14px 24px rgba(0,0,0,0.35)" }}>
                다음 STAGE
              </button>
            )}
            <button onClick={onExit} style={{ padding: "12px 18px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 16, background: "linear-gradient(180deg, #6b7280, #374151)", color: "#fff", cursor: "pointer", boxShadow: "0 14px 24px rgba(0,0,0,0.35)" }}>
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceShooterMode;
