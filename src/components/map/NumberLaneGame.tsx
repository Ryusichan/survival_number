import React, { useEffect, useMemo, useRef, useState } from "react";
import DigitIcon from "./DigitIcon";
import BackButton from "components/item/BackButton";

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.2;
const ROW_GAP = 0.2;

type Player = { lane: number; value: number };
type RowKind = "normal" | "goal";
type Row = {
  id: number;
  y: number;
  values: number[];
  kind: RowKind;
  handled?: boolean;
  hitLane?: number | null;
  fadeOut?: boolean;
};

const DigitNumber: React.FC<{
  value: number;
  size: number;
}> = ({ value, size }) => {
  const str = Math.max(0, value).toString();
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {str.split("").map((ch, i) => (
        <DigitIcon key={`${ch}-${i}`} value={Number(ch)} size={size} />
      ))}
    </div>
  );
};

let rowIdSeed = 0;

const stageSettings: { values: number[]; rowCount: number }[] = [
  { values: [1, 2], rowCount: 2 },
  { values: [2, 3], rowCount: 2 },
  { values: [3, 4], rowCount: 2 },
  { values: [4, 5], rowCount: 3 },
  { values: [5, 6], rowCount: 3 },
  { values: [6, 7], rowCount: 3 },
  { values: [1, 2, 3], rowCount: 4 },
  { values: [1, 2, 4], rowCount: 4 },
  { values: [2, 3, 4], rowCount: 4 },
  { values: [3, 4, 5], rowCount: 4 },
  { values: [1, 2, 3], rowCount: 5 },
  { values: [2, 3, 4], rowCount: 5 },
  { values: [3, 4, 5], rowCount: 5 },
  { values: [4, 5, 6], rowCount: 5 },
  { values: [3, 7, 8], rowCount: 5 },
  { values: [4, 6, 7], rowCount: 5 },
  { values: [5, 8, 9], rowCount: 5 },
  { values: [6, 7, 8], rowCount: 5 },
  { values: [1, 2, 3], rowCount: 6 },
  { values: [3, 4, 5], rowCount: 6 },
  { values: [4, 5, 6], rowCount: 6 },
  { values: [5, 6, 7], rowCount: 6 },
  { values: [6, 7, 8], rowCount: 6 },
  { values: [7, 8, 9], rowCount: 6 },
  { values: [1, 2, 3], rowCount: 7 },
  { values: [2, 3, 4], rowCount: 7 },
  { values: [3, 4, 5], rowCount: 7 },
  { values: [4, 5, 6], rowCount: 7 },
];

/** 실제 생성된 행들에서 달성 가능한 모든 합계를 계산 */
function getAchievableTotals(rowsValues: number[][]): number[] {
  let sums = [0];
  for (const rowVals of rowsValues) {
    const unique = Array.from(new Set(rowVals));
    const next = new Set<number>();
    for (let i = 0; i < sums.length; i++) {
      for (let j = 0; j < unique.length; j++) {
        next.add(sums[i] + unique[j]);
      }
    }
    sums = Array.from(next);
  }
  return sums.sort((a, b) => a - b);
}

// ===== 3D perspective helpers =====
const GAMMA_Y = 2.2;
const VANISH_RATIO = 0.35; // 소실점에서 좌우가 좁아지는 비율

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeProjectors(height: number) {
  const FAR_SCREEN_Y = -0.22 * height;

  const projectRowYpx = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y);
    const nearPx = nearY * height;
    const px = lerp(FAR_SCREEN_Y, nearPx, tt);
    if (worldY > nearY) {
      const slopeAtNear = GAMMA_Y;
      return nearPx + (worldY - nearY) * height * slopeAtNear;
    }
    return px;
  };

  const getPerspective = (worldY: number, farY: number, kind: RowKind) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y);
    const minScale = kind === "goal" ? 0.55 : 0.35;
    const scale = lerp(minScale, 1.0, tt);
    const spread = lerp(VANISH_RATIO, 1.0, tt);
    return { scale, spread };
  };

  return { projectRowYpx, getPerspective };
}

const NumberLaneGame = ({ onExit }: { onExit: () => void }) => {
  const [player, setPlayer] = useState<Player>({ lane: 2, value: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [stage, setStage] = useState(0);
  const [goalValues, setGoalValues] = useState<number[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

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

  const WIDTH = viewport.width || 360;
  const HEIGHT = viewport.height || 780;

  const [failBoardOpen, setFailBoardOpen] = useState(false);
  const lastTimeRef = useRef<number | null>(null);
  const latestLane = useRef(player.lane);
  const latestValue = useRef(player.value);
  const latestGoal = useRef(goalValues);
  const latestStage = useRef(stage);
  const initializedRef = useRef(false);
  const farYRef = useRef<number>(-1);
  const stageSnapshotRef = useRef<{
    normalValues: number[][];
    goalA: number;
    goalB: number;
  } | null>(null);

  const { projectRowYpx, getPerspective } = useMemo(
    () => makeProjectors(HEIGHT),
    [HEIGHT],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    latestLane.current = player.lane;
    latestValue.current = player.value;
  }, [player]);

  useEffect(() => {
    latestGoal.current = goalValues;
  }, [goalValues]);

  useEffect(() => {
    latestStage.current = stage;
  }, [stage]);

  const initStage = (stageIndex: number, isNewStage: boolean) => {
    const index = stageIndex % stageSettings.length;
    const { values, rowCount } = stageSettings[index];
    farYRef.current = -(rowCount * ROW_GAP + ROW_GAP * 2);
    lastTimeRef.current = null;

    let normalValues: number[][];
    let goalA: number;
    let goalB: number;

    if (!isNewStage && stageSnapshotRef.current) {
      // 다시도전: 저장된 숫자 그대로 사용
      ({ normalValues, goalA, goalB } = stageSnapshotRef.current);
    } else {
      // 새 스테이지: 랜덤 생성 후 실제 달성 가능한 목표 계산
      normalValues = Array.from({ length: rowCount }, () =>
        Array.from({ length: LANE_COUNT }, () => {
          const i = Math.floor(Math.random() * values.length);
          return values[i];
        }),
      );

      const totals = getAchievableTotals(normalValues);
      const shuffled = [...totals].sort(() => Math.random() - 0.5);
      goalA = shuffled[0] ?? 0;
      goalB = shuffled[1] ?? goalA;

      stageSnapshotRef.current = { normalValues, goalA, goalB };
    }

    setGoalValues([goalA, goalB]);
    latestGoal.current = [goalA, goalB];

    const newRows: Row[] = [];
    for (let i = 0; i < rowCount; i++) {
      newRows.push({
        id: rowIdSeed++,
        y: -i * ROW_GAP,
        values: [...normalValues[i]],
        kind: "normal",
        handled: false,
        hitLane: null,
      });
    }
    newRows.push({
      id: rowIdSeed++,
      y: -rowCount * ROW_GAP,
      values: [goalA, goalB],
      kind: "goal",
      handled: false,
      hitLane: null,
      fadeOut: false,
    });

    setRows(newRows);
    setPlayer((prev) => ({ ...prev, value: 0 }));
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initStage(0, true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      setPlayer((prev) => {
        if (e.key === "ArrowLeft") {
          return { ...prev, lane: Math.max(0, prev.lane - 1) };
        }
        if (e.key === "ArrowRight") {
          return { ...prev, lane: Math.min(LANE_COUNT - 1, prev.lane + 1) };
        }
        return prev;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const movePlayerByTouchX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const laneWidthPx = rect.width / LANE_COUNT;
    let lane = Math.floor(x / laneWidthPx);
    lane = Math.max(0, Math.min(LANE_COUNT - 1, lane));
    setPlayer((prev) => ({ ...prev, lane }));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const handleTouchEnd = () => {};

  useEffect(() => {
    if (failBoardOpen) return;
    let frameId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      let hitGoal = false;
      let success = false;

      setRows((prev) => {
        const next: Row[] = [];
        let addValue = 0;

        for (const row of prev) {
          const prevY = row.y;
          const newY = row.y + ROW_SPEED * dt;

          if (row.kind === "normal" && row.fadeOut && newY > PLAYER_Y + 0.12) {
            continue;
          }

          const justCrossed =
            !row.handled && prevY < PLAYER_Y && newY >= PLAYER_Y;

          if (justCrossed) {
            const laneHit = latestLane.current;

            if (row.kind === "normal") {
              const picked = row.values[laneHit];
              addValue += picked;
              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: laneHit,
                fadeOut: true,
              });
            } else if (row.kind === "goal") {
              hitGoal = true;
              const optionIndex = laneHit < LANE_COUNT / 2 ? 0 : 1;
              const chosenGoalNumber = row.values[optionIndex];
              const totalAfterHit = latestValue.current + addValue;
              success = totalAfterHit === chosenGoalNumber;
              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: laneHit,
              });
            }
            continue;
          }

          if (newY <= 1.3) {
            next.push({ ...row, y: newY });
          }
        }

        if (addValue > 0) {
          setPlayer((prevPlayer) => ({
            ...prevPlayer,
            value: prevPlayer.value + addValue,
          }));
        }

        if (hitGoal) {
          if (success) {
            setStage((prevStage) => {
              const nextStageIndex = (prevStage + 1) % stageSettings.length;
              initStage(nextStageIndex, true);
              return nextStageIndex;
            });
          } else {
            setFailBoardOpen(true);
          }
        }

        return next;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [failBoardOpen]);

  const laneWidth = WIDTH / LANE_COUNT;

  const handleRetry = () => {
    setFailBoardOpen(false);
    initStage(latestStage.current, false);
  };

  const balloonSize = Math.min(68 + player.value * 2, 140);

  // ===== 3D lane lines (converging to vanishing point) =====
  const vanishY = projectRowYpx(farYRef.current, farYRef.current);
  const playerLinePx = PLAYER_Y * HEIGHT;
  const laneLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const cx = WIDTH / 2;

    // 수평 격자선 (깊이감)
    const GRID_COUNT = 12;
    for (let i = 0; i <= GRID_COUNT; i++) {
      const t = i / GRID_COUNT;
      const tt = Math.pow(t, GAMMA_Y);
      const yPx = lerp(vanishY, playerLinePx, tt);
      const spread = lerp(VANISH_RATIO, 1.0, tt);
      const alpha = lerp(0.03, 0.12, t);

      lines.push(
        <div
          key={`hgrid-${i}`}
          style={{
            position: "absolute",
            top: yPx,
            left: cx - (WIDTH / 2) * spread,
            width: WIDTH * spread,
            height: 1,
            background: `rgba(255,255,255,${alpha})`,
            pointerEvents: "none",
          }}
        />,
      );
    }

    // 세로 lane 구분선 (소실점으로 수렴)
    for (let lane = 0; lane <= LANE_COUNT; lane++) {
      const baseX = (lane / LANE_COUNT) * WIDTH;
      const topX = cx + (baseX - cx) * VANISH_RATIO;
      const botX = baseX;

      lines.push(
        <svg
          key={`vline-${lane}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            pointerEvents: "none",
          }}
        >
          <line
            x1={topX}
            y1={Math.max(0, vanishY)}
            x2={botX}
            y2={playerLinePx + 40}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        </svg>,
      );
    }

    return lines;
  }, [WIDTH, HEIGHT, vanishY, playerLinePx]);

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
        background: "#1a1a2e",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ===== 3D Background ===== */}
      {/* Sky gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #0f0c29 0%, #302b63 35%, #24243e 60%, #1a1a2e 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Stars (subtle) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.6), transparent)," +
            "radial-gradient(1px 1px at 25% 8%, rgba(255,255,255,0.4), transparent)," +
            "radial-gradient(1px 1px at 40% 20%, rgba(255,255,255,0.5), transparent)," +
            "radial-gradient(1px 1px at 55% 5%, rgba(255,255,255,0.3), transparent)," +
            "radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.5), transparent)," +
            "radial-gradient(1px 1px at 85% 12%, rgba(255,255,255,0.4), transparent)," +
            "radial-gradient(1px 1px at 15% 28%, rgba(255,255,255,0.3), transparent)," +
            "radial-gradient(1px 1px at 60% 25%, rgba(255,255,255,0.4), transparent)," +
            "radial-gradient(1px 1px at 90% 22%, rgba(255,255,255,0.5), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Ground plane with perspective gradient */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: Math.max(0, vanishY - 20),
          bottom: 0,
          background: `linear-gradient(180deg,
            rgba(20, 20, 50, 0.95) 0%,
            rgba(30, 30, 60, 0.9) 20%,
            rgba(40, 40, 80, 0.85) 50%,
            rgba(50, 50, 100, 0.8) 80%,
            rgba(60, 60, 120, 0.75) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Vanishing point glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: Math.max(0, vanishY),
          transform: "translate(-50%, -50%)",
          width: 120,
          height: 60,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(130,100,255,0.25) 0%, rgba(130,100,255,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Lane lines */}
      {laneLines}

      {/* Player line highlight */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: playerLinePx - 2,
          height: 4,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(130,100,255,0.3) 20%, rgba(130,100,255,0.5) 50%, rgba(130,100,255,0.3) 80%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* Side vignette for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <BackButton onExit={onExit} />

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 32,
          fontFamily: "Fredoka",
          fontWeight: 600,
          color: "#fff",
          textShadow: "0 2px 10px rgba(130,100,255,0.6)",
          zIndex: 10,
        }}
      >
        STAGE {stage + 1}
      </div>
      <div
        style={{
          position: "absolute",
          top: 46,
          left: 12,
          fontSize: 13,
          color: "rgba(255,255,255,0.7)",
          zIndex: 10,
        }}
      >
        목표: {goalValues.join(" / ")}
      </div>
      <div
        style={{
          position: "absolute",
          top: 46,
          right: 12,
          fontSize: 13,
          color: "rgba(255,255,255,0.7)",
          zIndex: 10,
        }}
      >
        현재: {player.value}
      </div>

      {/* ===== Rows ===== */}
      {rows.map((row) => {
        const rowYpx = projectRowYpx(row.y, farYRef.current);

        if (row.kind === "goal") {
          const { scale, spread } = getPerspective(
            row.y,
            farYRef.current,
            row.kind,
          );
          const rowWidth = WIDTH * spread * 0.92;
          const depthAlpha = lerp(0.4, 1.0, Math.pow(clamp01((row.y - farYRef.current) / (PLAYER_Y - farYRef.current)), 1.2));

          return (
            <div
              key={row.id}
              style={{
                position: "absolute",
                left: WIDTH / 2,
                top: rowYpx,
                transform: `translate(-50%, -50%) scale(${scale})`,
                width: rowWidth,
                height: 90,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: depthAlpha,
                zIndex: 10,
              }}
            >
              {row.values.map((v, idx) => (
                <div
                  key={`${row.id}-goal-${idx}`}
                  style={{
                    width: "49%",
                    height: "100%",
                    background:
                      "linear-gradient(0deg, rgba(255,72,0,0.4) 0%, rgba(255,72,0,0.2) 74%, rgba(255,72,0,0) 100%)",
                    borderBottom: "3px solid rgba(255,100,50,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      "0 8px 24px rgba(255,72,0,0.2), inset 0 0 20px rgba(255,72,0,0.05)",
                    color: "#fff",
                    fontSize: "64px",
                    fontWeight: 600,
                    fontFamily: "Archivo Black",
                    position: "relative",
                    textShadow:
                      "-1px 0px #1f1f1f, 0px 1px #1f1f1f, 1px 0px #1f1f1f, 0px -1px #1f1f1f, 0 0 20px rgba(255,100,50,0.3)",
                  }}
                >
                  <div className="pillar_L" />
                  <div className="pillar_R" />
                  {v}
                </div>
              ))}
            </div>
          );
        }

        return row.values.map((v, laneIndex) => {
          const { scale, spread } = getPerspective(
            row.y,
            farYRef.current,
            row.kind,
          );

          const centerX = WIDTH / 2;
          const baseX = laneIndex * laneWidth + laneWidth / 2;
          const x = centerX + (baseX - centerX) * spread;

          const cellOpacity = row.fadeOut
            ? 0
            : row.hitLane === laneIndex
              ? 0
              : 1;

          // 깊이에 따른 알파 (멀수록 약간 투명)
          const depthT = clamp01(
            (row.y - farYRef.current) / (PLAYER_Y - farYRef.current),
          );
          const depthAlpha = lerp(0.5, 1.0, Math.pow(depthT, 1.2));

          // 깊이에 따른 glow 강도
          const glowAlpha = lerp(0, 0.3, Math.pow(depthT, 2));

          return (
            <div
              key={`${row.id}-${laneIndex}`}
              style={{
                position: "absolute",
                left: x,
                top: rowYpx,
                transform: `translate(-50%, -50%) scale(${scale})`,
                width: laneWidth * 0.8,
                height: 60,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cellOpacity * depthAlpha,
                transition: "opacity 0.3s ease",
                filter: `drop-shadow(0 4px 12px rgba(130,100,255,${glowAlpha}))`,
                zIndex: 10,
              }}
            >
              <DigitNumber value={v} size={56} />
            </div>
          );
        });
      })}

      {/* ===== Player ===== */}
      {(() => {
        const x = player.lane * laneWidth + laneWidth / 2;
        const y = PLAYER_Y * HEIGHT;

        return (
          <div
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              borderRadius: 20,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
            }}
          >
            {/* Balloon */}
            <div
              key={player.value}
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translate(-50%, -80%) scale(1)",
                minWidth: balloonSize,
                minHeight: balloonSize,
                padding: "4px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%, #a78bfa, #7c3aed)",
                color: "#fff",
                fontSize: 32,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 8px 24px rgba(124,58,237,0.4), 0 0 20px rgba(130,100,255,0.2)",
                animation: "pop 260ms ease-out",
                pointerEvents: "none",
                userSelect: "none",
                opacity: 0.9,
              }}
              className="player-balloon"
            >
              {player.value}
            </div>

            {/* Character */}
            <div className="charactor" style={{ zIndex: 1 }} />

            {/* Player ground glow */}
            <div
              style={{
                position: "absolute",
                bottom: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 80,
                height: 20,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(130,100,255,0.35) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
          </div>
        );
      })()}

      {/* ===== Fail overlay ===== */}
      {failBoardOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(4px)",
              zIndex: 3,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "rgb(100,100,100)",
              background: "#fff",
              zIndex: 4,
              width: "100%",
              maxWidth: "320px",
              boxSizing: "border-box",
              padding: 36,
              borderRadius: 36,
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                fontSize: 80,
                marginBottom: 12,
                backgroundColor: "#c5c5c5",
                padding: 12,
                borderRadius: "50%",
              }}
            >
              💀
            </div>
            <div style={{ fontSize: 36, marginBottom: 12, fontWeight: 700 }}>
              실패
            </div>
            <div>
              <div style={{ fontSize: 16, marginBottom: 12 }}>기록</div>
              <div
                style={{
                  fontSize: 24,
                  fontFamily: "Fredoka",
                  marginBottom: 24,
                }}
              >
                STAGE{stage + 1}
              </div>
            </div>
            <button
              onClick={handleRetry}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(180deg, #7c3aed, #5b21b6)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
              }}
            >
              다시 도전
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberLaneGame;
