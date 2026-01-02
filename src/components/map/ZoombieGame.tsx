import BackButton from "components/item/BackButton";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ZoombieGame (continuous X version, NO FOLLOW)
 * 변경점
 * 1) lane 기반 → 연속 x(0..LANE_COUNT) 기반 이동/판정
 * 2) 플레이어 HP 추가(적과 충돌 시 HP 감소, 0이면 gameover)
 * 3) ✅ 적이 플레이어를 따라오는(follow) 기능 제거
 *    - 적은 스폰된 x로 그대로 내려옴(직진)
 */

const LANE_COUNT = 5;

// world coords (0 = top, 1 = bottom-ish)
const PLAYER_Y = 0.82;
const FAR_Y_DEFAULT = -0.8;
const DESPAWN_Y = 1.25;

const BASE_ZOMBIE_SPEED = 0.18;
const HIT_EPS_Y = 0.03; // y collision threshold
const HIT_EPS_X_UNITS = 0.18; // x collision threshold in "units" space (0..LANE_COUNT)

const DROP_CHANCE = 0.25;
const MAX_WIDTH = 480;

// ===== Stage rules =====
const FIRST_STAGE_TARGET = 20; // stage 1 clear
const NEXT_STAGE_STEP = 10; // +10 each stage
const MAX_STAGE = 10;

type StageConfig = {
  spawnIntervalSec: number;
  maxAlive: number;
  batch: { min: number; max: number };
  // followStrength 제거(쓰지 않음)
  enemyTierWeights: { t1: number; t2: number; t3: number };
  hpBase: number;
  speedMul: number;
};

const STAGES: StageConfig[] = [
  {
    spawnIntervalSec: 1.15,
    maxAlive: 6,
    batch: { min: 1, max: 1 },
    enemyTierWeights: { t1: 0.85, t2: 0.15, t3: 0.0 },
    hpBase: 0,
    speedMul: 0.95,
  },
  {
    spawnIntervalSec: 1.05,
    maxAlive: 7,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.75, t2: 0.25, t3: 0.0 },
    hpBase: 0,
    speedMul: 1.0,
  },
  {
    spawnIntervalSec: 0.98,
    maxAlive: 8,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.65, t2: 0.32, t3: 0.03 },
    hpBase: 0,
    speedMul: 1.03,
  },
  {
    spawnIntervalSec: 0.92,
    maxAlive: 9,
    batch: { min: 1, max: 2 },
    enemyTierWeights: { t1: 0.55, t2: 0.37, t3: 0.08 },
    hpBase: 1,
    speedMul: 1.06,
  },
  {
    spawnIntervalSec: 0.86,
    maxAlive: 10,
    batch: { min: 1, max: 3 },
    enemyTierWeights: { t1: 0.48, t2: 0.4, t3: 0.12 },
    hpBase: 1,
    speedMul: 1.1,
  },
  {
    spawnIntervalSec: 0.82,
    maxAlive: 11,
    batch: { min: 2, max: 3 },
    enemyTierWeights: { t1: 0.4, t2: 0.44, t3: 0.16 },
    hpBase: 2,
    speedMul: 1.14,
  },
  {
    spawnIntervalSec: 0.78,
    maxAlive: 12,
    batch: { min: 2, max: 3 },
    enemyTierWeights: { t1: 0.34, t2: 0.46, t3: 0.2 },
    hpBase: 2,
    speedMul: 1.18,
  },
  {
    spawnIntervalSec: 0.74,
    maxAlive: 13,
    batch: { min: 2, max: 4 },
    enemyTierWeights: { t1: 0.28, t2: 0.48, t3: 0.24 },
    hpBase: 3,
    speedMul: 1.22,
  },
  {
    spawnIntervalSec: 0.7,
    maxAlive: 14,
    batch: { min: 3, max: 4 },
    enemyTierWeights: { t1: 0.22, t2: 0.5, t3: 0.28 },
    hpBase: 3,
    speedMul: 1.26,
  },
  {
    spawnIntervalSec: 0.66,
    maxAlive: 15,
    batch: { min: 3, max: 5 },
    enemyTierWeights: { t1: 0.18, t2: 0.5, t3: 0.32 },
    hpBase: 4,
    speedMul: 1.3,
  },
];

type EnemyTier = 1 | 2 | 3;

type Player = {
  x: number; // 0..LANE_COUNT (연속)
  widthUnits: number; // 1.0, 1.5 ...
  hp: number;
  maxHp: number;
};

type Enemy = {
  id: number;
  x: number; // 연속 (스폰 고정)
  y: number;
  tier: EnemyTier;
  hp: number;
  maxHp: number;
  speed: number;
  widthUnits: number;
  damage: number;
};

type Bullet = {
  id: number;
  x: number; // 연속
  y: number;
  speed: number;
  damage: number;
  pierce: boolean;
};

type ItemKind = "weapon" | "fireRateMul" | "damageAdd" | "pierce";
type WeaponId = "pistol" | "rapid" | "pierce" | "shotgun";

type Weapon = {
  id: WeaponId;
  name: string;
  fireIntervalSec: number;
  bulletSpeed: number;
  pierce: boolean;
  pellets: number;
  xOffsets?: number[]; // units offset
  damage: number;
  durationSec?: number;
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
    durationSec: 6,
  },
  pierce: {
    id: "pierce",
    name: "Pierce",
    fireIntervalSec: 0.5,
    bulletSpeed: 0.78,
    pierce: true,
    pellets: 1,
    damage: 1,
    durationSec: 6,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    fireIntervalSec: 0.6,
    bulletSpeed: 0.74,
    pierce: false,
    pellets: 3,
    xOffsets: [-1, 0, 1],
    damage: 1,
    durationSec: 6,
  },
};

type Buff = { id: string; kind: ItemKind; value: number; timeLeft: number };

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
  | { id: number; x: number; y: number; kind: "pierce"; durationSec: number };

type Mode = "playing" | "cleared" | "gameover";

type World = {
  stage: number;
  totalScore: number;
  stageScore: number;
  mode: Mode;
  enemies: Enemy[];
  bullets: Bullet[];
  items: Item[];
  combat: CombatState;
};

let enemyIdSeed = 1;
let bulletIdSeed = 1;
let itemIdSeed = 1;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));

/** ===== Perspective: visual only ===== */
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

function maybeDropItem(x: number, y: number): Item | null {
  if (Math.random() > DROP_CHANCE) return null;

  const r = Math.random();
  if (r < 0.34) {
    const w: WeaponId = (["rapid", "pierce", "shotgun"] as WeaponId[])[
      randInt(0, 2)
    ];
    return { id: itemIdSeed++, x, y, kind: "weapon", weaponId: w };
  }
  if (r < 0.67) {
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

function stageTarget(stage: number) {
  return FIRST_STAGE_TARGET + (stage - 1) * NEXT_STAGE_STEP;
}

function pickEnemyTier(w: { t1: number; t2: number; t3: number }): EnemyTier {
  const r = Math.random();
  if (r < w.t1) return 1;
  if (r < w.t1 + w.t2) return 2;
  return 3;
}

interface Props {
  onExit: () => void;
}

const ZoombieGame: React.FC<Props> = ({ onExit }) => {
  // viewport fit (mobile)
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

  // ===== Player (연속 x + HP) =====
  const [player, setPlayer] = useState<Player>({
    x: LANE_COUNT / 2,
    widthUnits: 1.3,
    hp: 6,
    maxHp: 6,
  });

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const [world, setWorld] = useState<World>(() => ({
    stage: 1,
    totalScore: 0,
    stageScore: 0,
    mode: "playing",
    enemies: [],
    bullets: [],
    items: [],
    combat: { baseWeaponId: "pistol", buffs: [] },
  }));

  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  // timing refs
  const lastTimeRef = useRef<number | null>(null);
  const spawnAccRef = useRef(0);
  const fireAccRef = useRef(0);

  const farYRef = useRef(FAR_Y_DEFAULT);

  // 플레이어 피격 쿨다운
  const hurtCooldownRef = useRef(0);

  const { projectYpx, getPerspective } = useMemo(
    () => makeProjectors(HEIGHT),
    [HEIGHT]
  );

  /** INPUT: 연속 X 이동 */
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

  /** HELPERS */
  const currentStageCfg = () =>
    STAGES[
      Math.max(0, Math.min(STAGES.length - 1, worldRef.current.stage - 1))
    ];

  const makeEnemy = (): Enemy => {
    const cfg = currentStageCfg();
    const tier = pickEnemyTier(cfg.enemyTierWeights);

    const tierHp = tier === 1 ? 2 : tier === 2 ? 4 : 7;
    const tierSpeedMul = tier === 1 ? 1.0 : tier === 2 ? 1.03 : 1.06;

    const hp = Math.min(30, tierHp + cfg.hpBase);
    const speed = BASE_ZOMBIE_SPEED * cfg.speedMul * tierSpeedMul;

    return {
      id: enemyIdSeed++,
      x: Math.random() * LANE_COUNT, // ✅ 스폰 위치 고정
      y: farYRef.current,
      tier,
      hp,
      maxHp: hp,
      speed,
      widthUnits: tier === 3 ? 1.2 : tier === 2 ? 1.05 : 0.95,
      damage: tier === 3 ? 2 : 1,
    };
  };

  const spawnEnemies = (dt: number) => {
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

  const fireIfReady = (dt: number) => {
    fireAccRef.current += dt;

    const w = worldRef.current;
    const weapon = getActiveWeapon(w.combat);

    if (fireAccRef.current < weapon.fireIntervalSec) return;
    fireAccRef.current -= weapon.fireIntervalSec;

    const baseX = playerRef.current.x;
    const offsets = weapon.xOffsets ?? [0];

    const bulletsToAdd: Bullet[] = offsets.map((off) => ({
      id: bulletIdSeed++,
      x: clamp(baseX + off, 0, LANE_COUNT),
      y: PLAYER_Y,
      speed: weapon.bulletSpeed,
      damage: weapon.damage,
      pierce: weapon.pierce,
    }));

    setWorld((prev) => ({
      ...prev,
      bullets: [...prev.bullets, ...bulletsToAdd],
    }));
  };

  /** MAIN LOOP */
  useEffect(() => {
    if (world.mode !== "playing") return;

    let raf = 0;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min(0.033, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // hurt cooldown tick
      hurtCooldownRef.current = Math.max(0, hurtCooldownRef.current - dt);

      tickCombatTimers(dt);
      spawnEnemies(dt);
      fireIfReady(dt);

      setWorld((prev) => {
        if (prev.mode !== "playing") return prev;

        // ✅ enemies: y만 전진, x는 고정(추적 제거)
        let enemies = prev.enemies.map((e) => ({
          ...e,
          y: e.y + e.speed * dt,
        }));

        // bullets: move up
        let bullets = prev.bullets.map((b) => ({
          ...b,
          y: b.y - b.speed * dt,
        }));
        bullets = bullets.filter(
          (b) => b.y > FAR_Y_DEFAULT - 0.35 && b.y < DESPAWN_Y
        );

        // items: move down slowly
        let items = prev.items.map((it) => ({ ...it, y: it.y + 0.12 * dt }));

        // bullet<->enemy collisions
        const deadEnemyIds = new Set<number>();
        const deadBulletIds = new Set<number>();

        for (const b of bullets) {
          if (deadBulletIds.has(b.id)) continue;

          for (const e of enemies) {
            if (deadEnemyIds.has(e.id)) continue;

            const dx = Math.abs(e.x - b.x);
            const dy = Math.abs(e.y - b.y);

            const hitX = dx < e.widthUnits * 0.45 + HIT_EPS_X_UNITS;
            const hitY = dy < HIT_EPS_Y;

            if (hitX && hitY) {
              e.hp -= b.damage;
              if (!b.pierce) deadBulletIds.add(b.id);
              if (e.hp <= 0) deadEnemyIds.add(e.id);
              if (!b.pierce) break;
            }
          }
        }

        // kills + drops
        let kills = 0;
        const dropped: Item[] = [];
        for (const e of enemies) {
          if (deadEnemyIds.has(e.id)) {
            kills += 1;
            const drop = maybeDropItem(e.x, e.y);
            if (drop) dropped.push(drop);
          }
        }

        enemies = enemies.filter((e) => !deadEnemyIds.has(e.id));
        bullets = bullets.filter((b) => !deadBulletIds.has(b.id));
        items = [...items, ...dropped];

        // item pickup (player x zone)
        const pickedItemIds = new Set<number>();
        let nextCombat = prev.combat;

        for (const it of items) {
          const dx = Math.abs(it.x - playerRef.current.x);
          const inPickupZone = dx < playerRef.current.widthUnits * 0.6;
          if (!inPickupZone) continue;
          if (Math.abs(it.y - PLAYER_Y) < 0.05) {
            pickedItemIds.add(it.id);
            nextCombat = applyItem(nextCombat, it);
          }
        }
        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        // player damage by enemy contact (HP system)
        let damageThisFrame = 0;
        const hitEnemyIds = new Set<number>();

        if (hurtCooldownRef.current <= 0) {
          for (const e of enemies) {
            if (e.y < PLAYER_Y - 0.01) continue;

            const dx = Math.abs(e.x - playerRef.current.x);
            const overlapX =
              dx < playerRef.current.widthUnits * 0.5 + e.widthUnits * 0.5;

            if (overlapX) {
              damageThisFrame += e.damage;
              hitEnemyIds.add(e.id);
            }
          }
        }

        if (damageThisFrame > 0) {
          enemies = enemies.filter((e) => !hitEnemyIds.has(e.id));

          const nextHp = Math.max(0, playerRef.current.hp - damageThisFrame);
          setPlayer((p) => ({ ...p, hp: nextHp }));

          hurtCooldownRef.current = 0.35;

          if (nextHp <= 0) {
            return {
              ...prev,
              mode: "gameover",
              enemies,
              bullets,
              items,
              combat: nextCombat,
              totalScore: prev.totalScore + kills,
              stageScore: prev.stageScore + kills,
            };
          }
        }

        const nextStageScore = prev.stageScore + kills;
        const nextTotalScore = prev.totalScore + kills;

        // stage clear
        const target = stageTarget(prev.stage);
        if (nextStageScore >= target) {
          return {
            ...prev,
            mode: "cleared",
            enemies,
            bullets,
            items,
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

  /** RESET / NEXT STAGE */
  const activeWeapon = getActiveWeapon(world.combat);

  const hardResetToStage = (stage: number) => {
    lastTimeRef.current = null;
    spawnAccRef.current = 0;
    fireAccRef.current = 0;
    farYRef.current = FAR_Y_DEFAULT;
    hurtCooldownRef.current = 0;

    setPlayer((p) => ({
      ...p,
      x: LANE_COUNT / 2,
      hp: p.maxHp,
    }));

    setWorld((prev) => ({
      stage,
      totalScore: prev.totalScore,
      stageScore: 0,
      mode: "playing",
      enemies: [],
      bullets: [],
      items: [],
      combat: { baseWeaponId: "pistol", buffs: [] },
    }));
  };

  const handleRetry = () => hardResetToStage(world.stage);
  const handleNextStage = () =>
    hardResetToStage(Math.min(MAX_STAGE, world.stage + 1));

  /** RENDER HELPERS */
  const xUnitsToPx = (xUnits: number) => (xUnits / LANE_COUNT) * WIDTH;

  const renderZombie = (e: Enemy) => {
    const ypx = projectYpx(e.y, farYRef.current);
    const { scale, spread } = getPerspective(e.y, farYRef.current);

    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(e.x);
    const x = centerX + (baseX - centerX) * spread;

    const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp));

    return (
      <div
        key={e.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: laneWidth * 0.78 * e.widthUnits,
          height: 76,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.35))",
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
              background: "linear-gradient(90deg, #fb7185, #f97316)",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: 16,
            pointerEvents: "none",
          }}
        />

        {e.tier === 1 && <div className="charactor_zoombie" />}
        {e.tier === 2 && <div className="charactor_zoombie2" />}
        {e.tier === 3 && <div className="charactor_zoombie3" />}
      </div>
    );
  };

  const renderBullet = (b: Bullet) => {
    const ypx = projectYpx(b.y, farYRef.current);
    const { scale, spread } = getPerspective(b.y, farYRef.current);

    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(b.x);
    const x = centerX + (baseX - centerX) * spread;

    return (
      <div
        key={b.id}
        style={{
          position: "absolute",
          left: x,
          top: ypx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: 10,
          height: 18,
          borderRadius: 8,
          background: b.pierce
            ? "linear-gradient(180deg, #60a5fa, #a78bfa)"
            : "linear-gradient(180deg, #facc15, #f97316)",
          boxShadow: "0 10px 16px rgba(0,0,0,0.35)",
        }}
      />
    );
  };

  const renderItem = (it: Item) => {
    const ypx = projectYpx(it.y, farYRef.current);
    const { scale, spread } = getPerspective(it.y, farYRef.current);

    const centerX = WIDTH / 2;
    const baseX = xUnitsToPx(it.x);
    const x = centerX + (baseX - centerX) * spread;

    const emoji =
      it.kind === "weapon"
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
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 12px 18px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {emoji}
      </div>
    );
  };

  const playerXpx = xUnitsToPx(player.x);
  const playerYpx = PLAYER_Y * HEIGHT;

  const target = stageTarget(world.stage);
  const playerHpPct = player.maxHp > 0 ? clamp01(player.hp / player.maxHp) : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        margin: "0 auto",
        overflow: "hidden",
        borderRadius: 18,
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
        WEAPON: {activeWeapon.name} {activeWeapon.pierce ? "· PIERCE" : ""}
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

      {/* Player HP */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 12,
          width: 150,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.18)",
          overflow: "hidden",
          boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: `${playerHpPct * 100}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #34d399, #f97316, #fb7185)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 12,
          fontSize: 11,
          color: "rgba(255,255,255,0.86)",
          fontWeight: 900,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        }}
      >
        HP {player.hp}/{player.maxHp}
      </div>

      {/* Entities */}
      {world.items.map(renderItem)}
      {world.bullets.map(renderBullet)}
      {world.enemies.map(renderZombie)}

      {/* Player */}
      <div
        style={{
          position: "absolute",
          left: playerXpx,
          top: playerYpx,
          transform: "translate(-50%, -50%)",
          width: laneWidth * player.widthUnits,
          height: 86,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.72))",
            boxShadow: "0 16px 22px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            outline:
              hurtCooldownRef.current > 0
                ? "2px solid rgba(248,113,113,0.9)"
                : "none",
          }}
        >
          🪖
        </div>
      </div>

      {/* Dialogs */}
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
