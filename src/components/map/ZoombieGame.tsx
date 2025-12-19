import BackButton from "components/item/BackButton";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ZoombieGame (lane shooter prototype)
 * - 5 lanes
 * - zombies spawn from far -> come to player line
 * - player auto fires by weapon fireInterval
 * - bullets collide; pierce weapons pass through
 * - item drops (chance on kill) that grant temporary weapon/buffs
 * - mobile: touch position controls lane instantly (no swipe)
 */

/** =========================
 *  CONFIG
 * ========================= */
const LANE_COUNT = 5;

// world coords (0 = top, 1 = bottom-ish)
const PLAYER_Y = 0.82; // player line
const FAR_Y_DEFAULT = -0.8; // far spawn y
const DESPAWN_Y = 1.25;

const ZOMBIE_SPEED = 0.18; // world units / sec
const BULLET_SPEED = 0.8; // world units / sec
const HIT_EPS = 0.03; // collision distance threshold

// spawn config
type EnemySpawnConfig = {
  spawnIntervalSec: number;
  maxAlive: number;
  batch?: { min: number; max: number };
  lanePolicy?: "random" | "preferPlayer" | "avoidPlayer";
};

const SPAWN_CONFIG: EnemySpawnConfig = {
  spawnIntervalSec: 1.1,
  maxAlive: 7,
  batch: { min: 1, max: 2 },
  lanePolicy: "random",
};

// item drop chance
const DROP_CHANCE = 0.25;

// viewport max width (user requested max-width only)
const MAX_WIDTH = 480;

/** =========================
 *  TYPES
 * ========================= */
type Player = { lane: number };

type Enemy = {
  id: number;
  lane: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
};

type Bullet = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  damage: number;
  pierce: boolean;
};

type ItemKind = "weapon" | "fireRateMul" | "damageAdd" | "pierce";

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
    fireIntervalSec: 0.7,
    bulletSpeed: 0.8,
    pierce: false,
    pellets: 1,
    damage: 1,
    durationSec: 6,
  },
  pierce: {
    id: "pierce",
    name: "Pierce",
    fireIntervalSec: 0.5,
    bulletSpeed: 0.75,
    pierce: true,
    pellets: 1,
    damage: 1,
    durationSec: 6,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    fireIntervalSec: 0.6,
    bulletSpeed: 0.72,
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
  value: number; // fireRateMul uses multiplier, damageAdd uses add, pierce uses 1
  timeLeft: number;
};

type CombatState = {
  baseWeaponId: WeaponId;
  tempWeapon?: { weaponId: WeaponId; timeLeft: number };
  buffs: Buff[];
};

type World = {
  stage: number;
  score: number;
  isGameOver: boolean;
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
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));

function pickLane(
  policy: EnemySpawnConfig["lanePolicy"],
  playerLane: number
): number {
  if (!policy || policy === "random") return randInt(0, LANE_COUNT - 1);
  if (policy === "preferPlayer") {
    // 70% toward player lane
    if (Math.random() < 0.7) return playerLane;
    return randInt(0, LANE_COUNT - 1);
  }
  // avoidPlayer
  const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i).filter(
    (l) => l !== playerLane
  );
  return lanes[randInt(0, lanes.length - 1)];
}

/** =========================
 *  PERSPECTIVE (visual only)
 *  - keeps motion in world linear, projects to screen non-linear
 *  - reduces “far fast / near slow” feeling by using milder gamma
 * ========================= */
function makeProjectors(heightPx: number) {
  const GAMMA_Y = 1.45; // milder than 2.2
  const FAR_SCREEN_Y = -0.18 * heightPx;

  const projectYpx = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y);
    const nearPx = nearY * heightPx;
    const px = lerp(FAR_SCREEN_Y, nearPx, tt);

    if (worldY > nearY) {
      // continue down with a gentle slope so it doesn't look "stuck"
      const slope = 1.1;
      return nearPx + (worldY - nearY) * heightPx * slope;
    }
    return px;
  };

  const getPerspective = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, 1.55); // slightly stronger for width/scale than y
    const scale = lerp(0.42, 1.0, tt);
    const spread = lerp(0.55, 1.0, tt);
    return { scale, spread };
  };

  return { projectYpx, getPerspective };
}

/** =========================
 *  ITEMS / COMBAT
 * ========================= */
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

  // simple weighted drop
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

interface Props {
  onExit: () => void;
}

/** =========================
 *  COMPONENT
 * ========================= */
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

  // max-width only
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
    score: 0,
    isGameOver: false,
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

  // far y (for projection)
  const farYRef = useRef(FAR_Y_DEFAULT);

  const { projectYpx, getPerspective } = useMemo(
    () => makeProjectors(HEIGHT),
    [HEIGHT]
  );

  /** =========================
   *  INPUT
   * ========================= */
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
      if (worldRef.current.isGameOver) return;
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

  /** =========================
   *  HELPERS
   * ========================= */
  const makeEnemy = (): Enemy => {
    const lane = pickLane(SPAWN_CONFIG.lanePolicy, playerLaneRef.current);
    // stage scaling: later = more hp / slightly faster
    const stage = worldRef.current.stage;
    const baseHp = 2 + Math.floor(stage / 2);
    const hp = Math.min(10, baseHp);
    const speed = ZOMBIE_SPEED + Math.min(0.08, stage * 0.006);
    return {
      id: enemyIdSeed++,
      lane,
      y: farYRef.current,
      hp,
      maxHp: hp,
      speed,
    };
  };

  const spawnEnemies = (dt: number) => {
    spawnAccRef.current += dt;
    if (spawnAccRef.current < SPAWN_CONFIG.spawnIntervalSec) return;

    const w = worldRef.current;
    if (w.enemies.length >= SPAWN_CONFIG.maxAlive) return;

    spawnAccRef.current -= SPAWN_CONFIG.spawnIntervalSec;

    const count = SPAWN_CONFIG.batch
      ? randInt(SPAWN_CONFIG.batch.min, SPAWN_CONFIG.batch.max)
      : 1;

    setWorld((prev) => {
      const room = SPAWN_CONFIG.maxAlive - prev.enemies.length;
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

  /** =========================
   *  MAIN LOOP
   * ========================= */
  useEffect(() => {
    if (world.isGameOver) return;

    let raf = 0;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min(0.033, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // 1) timers (buff durations)
      tickCombatTimers(dt);

      // 2) spawn
      spawnEnemies(dt);

      // 3) auto fire
      fireIfReady(dt);

      // 4) move enemies/bullets/items and resolve collisions
      setWorld((prev) => {
        if (prev.isGameOver) return prev;

        // move enemies down
        let enemies = prev.enemies.map((e) => ({
          ...e,
          y: e.y + e.speed * dt,
        }));
        // move bullets up (toward far)
        let bullets = prev.bullets.map((b) => ({
          ...b,
          y: b.y - b.speed * dt,
        }));
        // move items down slowly
        let items = prev.items.map((it) => ({ ...it, y: it.y + 0.12 * dt }));

        // despawn bullets far beyond
        bullets = bullets.filter(
          (b) => b.y > FAR_Y_DEFAULT - 0.35 && b.y < DESPAWN_Y
        );

        // collision bullet<->enemy
        const deadEnemyIds = new Set<number>();
        const deadBulletIds = new Set<number>();

        for (const b of bullets) {
          if (deadBulletIds.has(b.id)) continue;
          for (const e of enemies) {
            if (deadEnemyIds.has(e.id)) continue;
            if (e.lane !== b.lane) continue;

            if (Math.abs(e.y - b.y) < HIT_EPS) {
              e.hp -= b.damage;
              if (!b.pierce) deadBulletIds.add(b.id);
              if (e.hp <= 0) deadEnemyIds.add(e.id);
              if (!b.pierce) break;
            }
          }
        }

        // collect kills, maybe drop items
        let scoreGain = 0;
        const dropped: Item[] = [];
        for (const e of enemies) {
          if (deadEnemyIds.has(e.id)) {
            scoreGain += 1;
            const drop = maybeDropItem(e.lane, e.y);
            if (drop) dropped.push(drop);
          }
        }

        enemies = enemies.filter((e) => !deadEnemyIds.has(e.id));
        bullets = bullets.filter((b) => !deadBulletIds.has(b.id));
        items = [...items, ...dropped];

        // item pickup: if item reaches player line and same lane => apply
        const pickedItemIds = new Set<number>();
        let nextCombat = prev.combat;

        for (const it of items) {
          if (it.lane !== playerLaneRef.current) continue;
          if (Math.abs(it.y - PLAYER_Y) < 0.05) {
            pickedItemIds.add(it.id);
            nextCombat = applyItem(nextCombat, it);
          }
        }
        items = items.filter(
          (it) => !pickedItemIds.has(it.id) && it.y <= DESPAWN_Y
        );

        // game over: enemy reaches player line
        const reached = enemies.some((e) => e.y >= PLAYER_Y - 0.01);
        if (reached) {
          return {
            ...prev,
            isGameOver: true,
            enemies,
            bullets,
            items,
            combat: nextCombat,
            score: prev.score + scoreGain,
          };
        }

        return {
          ...prev,
          enemies,
          bullets,
          items,
          combat: nextCombat,
          score: prev.score + scoreGain,
        };
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world.isGameOver]);

  /** =========================
   *  RESET / NEXT STAGE
   * ========================= */
  const activeWeapon = getActiveWeapon(world.combat);

  const handleRetry = () => {
    lastTimeRef.current = null;
    spawnAccRef.current = 0;
    fireAccRef.current = 0;
    farYRef.current = FAR_Y_DEFAULT;

    setWorld({
      stage: 1,
      score: 0,
      isGameOver: false,
      enemies: [],
      bullets: [],
      items: [],
      combat: { baseWeaponId: "pistol", buffs: [] },
    });
    setPlayer((p) => ({ ...p })); // keep lane as-is
  };

  /** =========================
   *  RENDER HELPERS
   * ========================= */
  const laneCenterX = (lane: number) => lane * laneWidth + laneWidth / 2;

  const renderZombie = (e: Enemy) => {
    const rowYpx = projectYpx(e.y, farYRef.current);
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
          top: rowYpx,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: laneWidth * 0.72,
          height: 70,
          borderRadius: 18,
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 8,
            right: 8,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.25)",
          }}
        >
          <div
            style={{
              width: `${hpPct * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: "#f94316",
            }}
          />
        </div>
        <div className="charactor_zoombie" />
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
          boxShadow: "0 8px 14px rgba(0,0,0,0.25)",
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
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 10px 18px rgba(0,0,0,0.25)",
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
      {/* minimal CSS */}
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
          background: radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.55) 100%);
          pointer-events:none;
        }
        .road {
          position:absolute;
          left:50%; top:0;
          transform: translateX(-50%);
          width: 92%;
          height: 100%;
          clip-path: polygon(22% 0%, 78% 0%, 100% 100%, 0% 100%);
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02));
          mix-blend-mode: overlay;
          pointer-events:none;
        }
        @keyframes pop {
          0% { transform: translate(-50%, -80%) scale(0.85); }
          100% { transform: translate(-50%, -80%) scale(1); }
        }
      `}</style>

      <BackButton onExit={onExit} />

      <div className="bg" />
      <div className="road" />
      <div className="vignette" />

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          color: "#fff",
          fontWeight: 800,
          fontSize: 14,
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
          color: "#fff",
          fontWeight: 900,
          fontSize: 14,
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        }}
      >
        SCORE {world.score}
      </div>
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 12,
          color: "rgba(255,255,255,0.9)",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        WEAPON: {activeWeapon.name} {activeWeapon.pierce ? "· PIERCE" : ""}
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
          width: laneWidth * 0.78,
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

      {/* Game Over */}
      {world.isGameOver && (
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
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 10 }}>💀</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            GAME OVER
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 18 }}>
            SCORE: {world.score}
          </div>
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
        </div>
      )}
    </div>
  );
};

export default ZoombieGame;
