import BackButton from "components/item/BackButton";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ZoombieGame (lane shooter)
 * - stage clear: stage1 = 20 kills, then +10 each stage (stage2=30, stage3=40...)
 * - stage 10까지
 * - 좀비 tier(1/2/3): 갈수록 hp↑, 조금 더 빠름
 * - 좀비는 플레이어 lane을 "추적" (lane index를 부드럽게 따라옴)
 * - road/줄(clip-path) 제거
 * - mobile: 터치/드래그로 lane 이동, 손 떼면 그 위치 유지
 */

const LANE_COUNT = 5;

// world coords (0 = top, 1 = bottom-ish)
const PLAYER_Y = 0.82;
const FAR_Y_DEFAULT = -0.8;
const DESPAWN_Y = 1.25;

const BASE_ZOMBIE_SPEED = 0.18;
const BULLET_SPEED = 0.8;
const HIT_EPS_Y = 0.03; // y collision threshold
const HIT_EPS_X = 0.34; // x(lane) collision threshold

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
  followStrength: number; // 좀비가 lane을 따라오는 강도
  enemyTierWeights: { t1: number; t2: number; t3: number };
  hpBase: number; // tier별 base hp에 더해짐
  speedMul: number; // tier별 speed에 곱
};

const STAGES: StageConfig[] = [
  // 1
  {
    spawnIntervalSec: 1.15,
    maxAlive: 6,
    batch: { min: 1, max: 1 },
    followStrength: 2.0,
    enemyTierWeights: { t1: 0.85, t2: 0.15, t3: 0.0 },
    hpBase: 0,
    speedMul: 0.95,
  },
  // 2
  {
    spawnIntervalSec: 1.05,
    maxAlive: 7,
    batch: { min: 1, max: 2 },
    followStrength: 2.2,
    enemyTierWeights: { t1: 0.75, t2: 0.25, t3: 0.0 },
    hpBase: 0,
    speedMul: 1.0,
  },
  // 3
  {
    spawnIntervalSec: 0.98,
    maxAlive: 8,
    batch: { min: 1, max: 2 },
    followStrength: 2.35,
    enemyTierWeights: { t1: 0.65, t2: 0.32, t3: 0.03 },
    hpBase: 0,
    speedMul: 1.03,
  },
  // 4
  {
    spawnIntervalSec: 0.92,
    maxAlive: 9,
    batch: { min: 1, max: 2 },
    followStrength: 2.5,
    enemyTierWeights: { t1: 0.55, t2: 0.37, t3: 0.08 },
    hpBase: 1,
    speedMul: 1.06,
  },
  // 5
  {
    spawnIntervalSec: 0.86,
    maxAlive: 10,
    batch: { min: 1, max: 3 },
    followStrength: 2.65,
    enemyTierWeights: { t1: 0.48, t2: 0.4, t3: 0.12 },
    hpBase: 1,
    speedMul: 1.1,
  },
  // 6
  {
    spawnIntervalSec: 0.82,
    maxAlive: 11,
    batch: { min: 2, max: 3 },
    followStrength: 2.8,
    enemyTierWeights: { t1: 0.4, t2: 0.44, t3: 0.16 },
    hpBase: 2,
    speedMul: 1.14,
  },
  // 7
  {
    spawnIntervalSec: 0.78,
    maxAlive: 12,
    batch: { min: 2, max: 3 },
    followStrength: 2.95,
    enemyTierWeights: { t1: 0.34, t2: 0.46, t3: 0.2 },
    hpBase: 2,
    speedMul: 1.18,
  },
  // 8
  {
    spawnIntervalSec: 0.74,
    maxAlive: 13,
    batch: { min: 2, max: 4 },
    followStrength: 3.1,
    enemyTierWeights: { t1: 0.28, t2: 0.48, t3: 0.24 },
    hpBase: 3,
    speedMul: 1.22,
  },
  // 9
  {
    spawnIntervalSec: 0.7,
    maxAlive: 14,
    batch: { min: 3, max: 4 },
    followStrength: 3.25,
    enemyTierWeights: { t1: 0.22, t2: 0.5, t3: 0.28 },
    hpBase: 3,
    speedMul: 1.26,
  },
  // 10
  {
    spawnIntervalSec: 0.66,
    maxAlive: 15,
    batch: { min: 3, max: 5 },
    followStrength: 3.4,
    enemyTierWeights: { t1: 0.18, t2: 0.5, t3: 0.32 },
    hpBase: 4,
    speedMul: 1.3,
  },
];

type Player = { lane: number };

type EnemyTier = 1 | 2 | 3;

type Enemy = {
  id: number;
  lane: number;
  y: number;
  tier: EnemyTier;
  hp: number;
  maxHp: number;
  speed: number;
};

type Bullet = {
  id: number;
  lane: number; // bullets stay lane-locked
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
  laneOffsets?: number[];
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
    laneOffsets: [-1, 0, 1],
    damage: 1,
    durationSec: 6,
  },
};

type Buff = {
  id: string;
  kind: ItemKind;
  value: number;
  timeLeft: number;
};

type CombatState = {
  baseWeaponId: WeaponId;
  tempWeapon?: { weaponId: WeaponId; timeLeft: number };
  buffs: Buff[];
};

type Item =
  | { id: number; lane: number; y: number; kind: "weapon"; weaponId: WeaponId }
  | {
      id: number;
      lane: number;
      y: number;
      kind: "fireRateMul";
      mul: number;
      durationSec: number;
    }
  | {
      id: number;
      lane: number;
      y: number;
      kind: "damageAdd";
      add: number;
      durationSec: number;
    }
  | {
      id: number;
      lane: number;
      y: number;
      kind: "pierce";
      durationSec: number;
    };

type Mode = "playing" | "cleared" | "gameover";

type World = {
  stage: number; // 1..MAX_STAGE
  totalScore: number; // 누적
  stageScore: number; // 현재 스테이지 킬수
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

function maybeDropItem(lane: number, y: number): Item | null {
  if (Math.random() > DROP_CHANCE) return null;

  const r = Math.random();
  if (r < 0.34) {
    const w: WeaponId = (["rapid", "pierce", "shotgun"] as WeaponId[])[
      randInt(0, 2)
    ];
    return { id: itemIdSeed++, lane, y, kind: "weapon", weaponId: w };
  }
  if (r < 0.67) {
    return {
      id: itemIdSeed++,
      lane,
      y,
      kind: "fireRateMul",
      mul: 0.7,
      durationSec: 6,
    };
  }
  return {
    id: itemIdSeed++,
    lane,
    y,
    kind: "damageAdd",
    add: 1,
    durationSec: 6,
  };
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

  const [player, setPlayer] = useState<Player>({ lane: 2 });
  const playerLaneRef = useRef(player.lane);
  useEffect(() => {
    playerLaneRef.current = player.lane;
  }, [player.lane]);

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

  const { projectYpx, getPerspective } = useMemo(
    () => makeProjectors(HEIGHT),
    [HEIGHT]
  );

  /** INPUT */
  const movePlayerByTouchX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const laneW = rect.width / LANE_COUNT;
    let lane = Math.floor(x / laneW);
    lane = Math.max(0, Math.min(LANE_COUNT - 1, lane));
    setPlayer((p) => ({ ...p, lane }));
  };

  const onTouchStart = (e: React.TouchEvent) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) =>
    movePlayerByTouchX(e.touches[0].clientX);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (worldRef.current.mode !== "playing") return;
      if (e.key === "ArrowLeft")
        setPlayer((p) => ({ ...p, lane: Math.max(0, p.lane - 1) }));
      if (e.key === "ArrowRight")
        setPlayer((p) => ({
          ...p,
          lane: Math.min(LANE_COUNT - 1, p.lane + 1),
        }));
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

    // tier별 hp/speed
    const tierHp = tier === 1 ? 2 : tier === 2 ? 4 : 7;
    const tierSpeedMul = tier === 1 ? 1.0 : tier === 2 ? 1.03 : 1.06;

    const hp = Math.min(30, tierHp + cfg.hpBase);
    const speed = BASE_ZOMBIE_SPEED * cfg.speedMul * tierSpeedMul;

    const lane = randInt(0, LANE_COUNT - 1);

    return {
      id: enemyIdSeed++,
      lane,
      y: farYRef.current,
      tier,
      hp,
      maxHp: hp,
      speed,
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

    const baseLane = playerLaneRef.current;
    const offsets = weapon.laneOffsets ?? [0];

    const bulletsToAdd: Bullet[] = offsets
      .map((off) => baseLane + off)
      .filter((lane) => lane >= 0 && lane < LANE_COUNT)
      .map((lane) => ({
        id: bulletIdSeed++,
        lane,
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

      tickCombatTimers(dt);
      spawnEnemies(dt);
      fireIfReady(dt);

      const cfg = currentStageCfg();

      setWorld((prev) => {
        if (prev.mode !== "playing") return prev;

        let enemies = prev.enemies.map((e) => ({
          ...e,
          y: e.y + e.speed * dt,
        }));

        // move bullets up
        let bullets = prev.bullets.map((b) => ({
          ...b,
          y: b.y - b.speed * dt,
        }));
        bullets = bullets.filter(
          (b) => b.y > FAR_Y_DEFAULT - 0.35 && b.y < DESPAWN_Y
        );

        // move items down slowly
        let items = prev.items.map((it) => ({ ...it, y: it.y + 0.12 * dt }));

        // bullet<->enemy collisions
        const deadEnemyIds = new Set<number>();
        const deadBulletIds = new Set<number>();

        for (const b of bullets) {
          if (deadBulletIds.has(b.id)) continue;

          for (const e of enemies) {
            if (deadEnemyIds.has(e.id)) continue;

            const dx = Math.abs(e.lane - b.lane);
            const dy = Math.abs(e.y - b.y);

            if (dx < HIT_EPS_X && dy < HIT_EPS_Y) {
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
            const drop = maybeDropItem(Math.round(e.lane), e.y);
            if (drop) dropped.push(drop);
          }
        }

        enemies = enemies.filter((e) => !deadEnemyIds.has(e.id));
        bullets = bullets.filter((b) => !deadBulletIds.has(b.id));
        items = [...items, ...dropped];

        // item pickup (player lane)
        const pickedItemIds = new Set<number>();
        let nextCombat = prev.combat;

        for (const it of items) {
          const sameLane = it.lane === playerLaneRef.current;
          if (!sameLane) continue;
          if (Math.abs(it.y - PLAYER_Y) < 0.05) {
            pickedItemIds.add(it.id);
            nextCombat = applyItem(nextCombat, it);
          }
        }
        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        // game over: any enemy reaches player line
        const reached = enemies.some((e) => e.y >= PLAYER_Y - 0.01);
        if (reached) {
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

    setWorld((prev) => ({
      stage,
      totalScore: prev.totalScore, // keep total
      stageScore: 0, // reset per-stage
      mode: "playing",
      enemies: [],
      bullets: [],
      items: [],
      combat: { baseWeaponId: "pistol", buffs: [] },
    }));
  };

  const handleRetry = () => {
    // retry current stage (reset stageScore)
    hardResetToStage(world.stage);
  };

  const handleNextStage = () => {
    const next = Math.min(MAX_STAGE, world.stage + 1);
    hardResetToStage(next);
  };

  /** RENDER HELPERS */
  const laneCenterX = (lane: number) => lane * laneWidth + laneWidth / 2;

  const renderZombie = (e: Enemy) => {
    const ypx = projectYpx(e.y, farYRef.current);
    const { scale, spread } = getPerspective(e.y, farYRef.current);

    const centerX = WIDTH / 2;
    const baseX = laneCenterX(e.lane);
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
          width: laneWidth * 0.78,
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
      </div>
    );
  };

  const renderBullet = (b: Bullet) => {
    const ypx = projectYpx(b.y, farYRef.current);
    const { scale, spread } = getPerspective(b.y, farYRef.current);

    const centerX = WIDTH / 2;
    const baseX = laneCenterX(b.lane);
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
    const baseX = laneCenterX(it.lane);
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

  const playerX = laneCenterX(player.lane);
  const playerYpx = PLAYER_Y * HEIGHT;

  const target = stageTarget(world.stage);

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
        /* road/줄 제거: 요청대로 더 이상 표시하지 않음 */
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

      {/* Entities */}
      {world.items.map(renderItem)}
      {world.bullets.map(renderBullet)}
      {world.enemies.map(renderZombie)}

      {/* Player */}
      <div
        style={{
          position: "absolute",
          left: playerX,
          top: playerYpx,
          transform: "translate(-50%, -50%)",
          width: laneWidth * 0.8,
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
