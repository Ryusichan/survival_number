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

const SoccerBall: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <defs>
      <radialGradient id="soccerBody" cx="38%" cy="34%" r="58%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f2f2f2" />
        <stop offset="100%" stopColor="#c4c4c4" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#soccerBody)" />
    <circle cx="50" cy="50" r="48" fill="none" stroke="#b0b0b0" strokeWidth="1.5" />
    <g style={{ clipPath: "circle(47.5% at 50% 50%)" }}>
      {/* Curved pentagons - center enlarged */}
      <g fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.8" strokeLinejoin="round">
        <path d="M50,27 Q65,30 72,41 Q73,55 64,66 Q50,73 36,66 Q27,55 28,41 Q35,30 50,27Z" />
        <path d="M35,3 Q39,10 50,10 Q61,10 65,3 L60,-8 L40,-8Z" />
        <path d="M82,18 Q82,26 88,38 Q91,50 95,55 L105,42 L100,22Z" />
        <path d="M88,72 Q81,73 74,82 Q65,88 65,95 L78,105 L95,90Z" />
        <path d="M35,95 Q35,88 26,82 Q19,73 12,72 L5,90 L22,105Z" />
        <path d="M5,55 Q9,50 12,38 Q18,25 18,18 L0,22 L-5,42Z" />
      </g>
      {/* Curved seam lines */}
      <g
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M50,27 Q53,19 50,10" />
        <path d="M72,41 Q81,36 88,38" />
        <path d="M64,66 Q70,73 74,82" />
        <path d="M36,66 Q30,73 26,82" />
        <path d="M28,41 Q19,36 12,38" />
        <path d="M50,10 Q41,4 35,3" />
        <path d="M50,10 Q59,4 65,3" />
        <path d="M88,38 Q87,27 82,18" />
        <path d="M88,38 Q94,47 95,55" />
        <path d="M74,82 Q83,78 88,72" />
        <path d="M74,82 Q68,91 65,95" />
        <path d="M26,82 Q32,91 35,95" />
        <path d="M26,82 Q17,78 12,72" />
        <path d="M12,38 Q6,47 5,55" />
        <path d="M12,38 Q13,27 18,18" />
        <path d="M65,3 Q77,7 82,18" />
        <path d="M95,55 Q95,64 88,72" />
        <path d="M65,95 Q50,101 35,95" />
        <path d="M12,72 Q5,64 5,55" />
        <path d="M18,18 Q23,7 35,3" />
      </g>
    </g>
    {/* Specular highlight */}
    <ellipse cx="38" cy="34" rx="11" ry="8" fill="rgba(255,255,255,0.4)" />
  </svg>
);

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
const VANISH_RATIO = 0.15; // 소실점에서 좌우가 좁아지는 비율

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeProjectors(height: number) {
  const FAR_SCREEN_Y = 0.13 * height; // 소실점이 화면 상단 13%에 보임

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
    const minScale = kind === "goal" ? 0.25 : 0.2;
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

  // ===== 3D Road Rendering =====
  const vanishY = projectRowYpx(farYRef.current, farYRef.current);
  const playerLinePx = PLAYER_Y * HEIGHT;
  const roadSvg = useMemo(() => {
    const cx = WIDTH / 2;
    const vy = Math.max(0, vanishY);
    const topHW = (WIDTH / 2) * VANISH_RATIO;
    const botY = HEIGHT;

    // 잔디 (도로 양쪽 삼각형)
    const leftGrass = `0,${vy} ${cx - topHW},${vy} 0,${botY}`;
    const rightGrass = `${cx + topHW},${vy} ${WIDTH},${vy} ${WIDTH},${botY}`;

    // 도로 사다리꼴
    const roadPoints = [
      `${cx - topHW},${vy}`,
      `${cx + topHW},${vy}`,
      `${WIDTH},${botY}`,
      `${0},${botY}`,
    ].join(" ");

    // 세로 레인 구분선
    const vLines: React.ReactNode[] = [];
    for (let i = 0; i <= LANE_COUNT; i++) {
      const baseX = (i / LANE_COUNT) * WIDTH;
      const topX = cx + (baseX - cx) * VANISH_RATIO;
      const isEdge = i === 0 || i === LANE_COUNT;
      vLines.push(
        <line
          key={`vl-${i}`}
          x1={topX}
          y1={vy}
          x2={baseX}
          y2={playerLinePx + 60}
          stroke={isEdge ? "#c8a850" : "rgba(255,255,255,0.3)"}
          strokeWidth={isEdge ? 3 : 1.5}
          strokeDasharray={isEdge ? "none" : "8 16"}
        />,
      );
    }

    // 가로 깊이선
    const hLines: React.ReactNode[] = [];
    const HC = 16;
    for (let i = 1; i < HC; i++) {
      const t = i / HC;
      const tt = Math.pow(t, GAMMA_Y);
      const y = lerp(vy, playerLinePx, tt);
      const spread = lerp(VANISH_RATIO, 1.0, tt);
      const halfW = (WIDTH / 2) * spread;
      const alpha = lerp(0.04, 0.14, t);
      hLines.push(
        <line
          key={`hl-${i}`}
          x1={cx - halfW}
          y1={y}
          x2={cx + halfW}
          y2={y}
          stroke={`rgba(255,255,255,${alpha})`}
          strokeWidth={1}
        />,
      );
    }

    // 나무 & 덤불 (도로 가장자리)
    const decos: React.ReactNode[] = [];
    const DC = 7;
    for (let i = 0; i < DC; i++) {
      const t = (i + 0.4) / DC;
      const tt = Math.pow(t, GAMMA_Y);
      const y = lerp(vy + 5, playerLinePx - 20, tt);
      const spread = lerp(VANISH_RATIO, 1.0, tt);
      const s = lerp(0.25, 0.85, tt);
      const lx = cx - (WIDTH / 2) * spread - 10 * s;
      const rx = cx + (WIDTH / 2) * spread + 10 * s;

      if (i % 3 === 0) {
        // 나무
        const tree = (key: string, tx: number) => (
          <g key={key} transform={`translate(${tx},${y}) scale(${s})`}>
            <rect x="-2.5" y="-2" width="5" height="14" rx="2" fill="#8d6e63" />
            <circle cx="0" cy="-10" r="11" fill="#5a9a60" />
            <circle cx="-6" cy="-4" r="8" fill="#4d8a52" />
            <circle cx="6" cy="-4" r="8" fill="#3f7a42" />
          </g>
        );
        decos.push(tree(`tl-${i}`, lx));
        decos.push(tree(`tr-${i}`, rx));
      } else {
        // 덤불
        const bush = (key: string, bx: number) => (
          <g key={key} transform={`translate(${bx},${y}) scale(${s})`}>
            <ellipse cx="0" cy="-2" rx="11" ry="7" fill="#3f7a42" />
            <ellipse cx="-5" cy="-5" rx="7" ry="5" fill="#5a9a60" />
            <ellipse cx="6" cy="-3" rx="8" ry="6" fill="#4d8a52" />
          </g>
        );
        decos.push(bush(`bl-${i}`, lx));
        decos.push(bush(`br-${i}`, rx));
      }
    }

    // 꽃 (잔디 위)
    const flowers: React.ReactNode[] = [];
    const FP = [
      { t: 0.12, side: -1, off: 0.35 },
      { t: 0.22, side: 1, off: 0.5 },
      { t: 0.32, side: -1, off: 0.6 },
      { t: 0.42, side: 1, off: 0.25 },
      { t: 0.52, side: -1, off: 0.45 },
      { t: 0.62, side: 1, off: 0.65 },
      { t: 0.72, side: -1, off: 0.55 },
      { t: 0.82, side: 1, off: 0.35 },
      { t: 0.18, side: 1, off: 0.7 },
      { t: 0.48, side: -1, off: 0.7 },
    ];
    const FC = ["#d4849a", "#c87080", "#b05060", "#c07888", "#a888b0"];
    for (let fi = 0; fi < FP.length; fi++) {
      const fp = FP[fi];
      const tt = Math.pow(fp.t, GAMMA_Y);
      const fy = lerp(vy, playerLinePx, tt);
      const spread = lerp(VANISH_RATIO, 1.0, tt);
      const s = lerp(0.2, 0.65, tt);
      const roadEdge = (WIDTH / 2) * spread;
      const grassW = cx - roadEdge;
      const fx = cx + fp.side * (roadEdge + grassW * fp.off);
      const c = FC[fi % FC.length];
      flowers.push(
        <g key={`fl-${fi}`} transform={`translate(${fx},${fy}) scale(${s})`}>
          <circle cx="3" cy="-3" r="3.5" fill={c} opacity="0.9" />
          <circle cx="-3" cy="-3" r="3.5" fill={c} opacity="0.9" />
          <circle cx="3" cy="3" r="3.5" fill={c} opacity="0.9" />
          <circle cx="-3" cy="3" r="3.5" fill={c} opacity="0.9" />
          <circle cx="0" cy="0" r="2.8" fill="#d4c878" />
        </g>,
      );
    }

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          height: HEIGHT,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a7a4e" />
            <stop offset="100%" stopColor="#6a9a6e" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a09880" />
            <stop offset="100%" stopColor="#bab298" />
          </linearGradient>
        </defs>
        <polygon points={leftGrass} fill="url(#grassGrad)" />
        <polygon points={rightGrass} fill="url(#grassGrad)" />
        <polygon points={roadPoints} fill="url(#roadGrad)" />
        {vLines}
        {hLines}
        {flowers}
        {decos}
      </svg>
    );
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
        background: "#7ab0c8",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ===== 밝은 배경 ===== */}
      {/* 하늘 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #7ab0c8 0%, #5a98b0 40%, #4a88a0 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 태양 */}
      <div
        style={{
          position: "absolute",
          right: "14%",
          top: Math.max(8, vanishY * 0.22),
          width: 52,
          height: 52,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #e8d89a 20%, #d8c880 50%, #c0a860 80%, transparent 100%)",
          boxShadow:
            "0 0 24px rgba(210,195,100,0.4), 0 0 48px rgba(190,170,60,0.15)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 구름 1 */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: Math.max(10, vanishY * 0.18),
          width: 64,
          height: 26,
          borderRadius: 20,
          background: "rgba(255,255,255,1)",
          boxShadow:
            "20px 4px 0 -2px rgba(255,255,255,1), -14px 2px 0 -3px rgba(255,255,255,1), 9px -7px 0 2px rgba(255,255,255,1)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* 구름 2 */}
      <div
        style={{
          position: "absolute",
          left: "52%",
          top: Math.max(18, vanishY * 0.35),
          width: 76,
          height: 30,
          borderRadius: 22,
          background: "rgba(255,255,255,1)",
          boxShadow:
            "24px 5px 0 -2px rgba(255,255,255,1), -16px 3px 0 -4px rgba(255,255,255,1), 11px -8px 0 3px rgba(255,255,255,1)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* 구름 3 */}
      <div
        style={{
          position: "absolute",
          left: "28%",
          top: Math.max(30, vanishY * 1),
          width: 52,
          height: 22,
          borderRadius: 16,
          background: "rgba(255,255,255,0.45)",
          boxShadow:
            "16px 3px 0 -2px rgba(255,255,255,0.4), -11px 2px 0 -3px rgba(255,255,255,0.35)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Road SVG (잔디 + 도로 + 나무/꽃) */}
      {roadSvg}

      {/* 플레이어 라인 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: playerLinePx - 2,
          height: 4,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), rgba(255,255,255,0.65), rgba(255,255,255,0.4), transparent)",
          pointerEvents: "none",
          zIndex: 5,
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
          textShadow:
            "-1px -1px 0 #2a6e9e, 1px -1px 0 #2a6e9e, -1px 1px 0 #2a6e9e, 1px 1px 0 #2a6e9e, 0 2px 8px rgba(0,0,0,0.3)",
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
          color: "#fff",
          fontWeight: 700,
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
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
          color: "#fff",
          fontWeight: 700,
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        현재: {player.value}
      </div>

      {/* ===== Rows ===== */}
      {rows.map((row) => {
        const rowYpx = projectRowYpx(row.y, farYRef.current);

        if (row.kind === "goal") {
          const { scale } = getPerspective(row.y, farYRef.current, row.kind);
          const depthT = clamp01(
            (row.y - farYRef.current) / (PLAYER_Y - farYRef.current),
          );
          const depthAlpha = lerp(0.5, 1.0, Math.pow(depthT, 1.2));

          return (
            <div
              key={row.id}
              style={{
                position: "absolute",
                left: WIDTH / 2,
                top: rowYpx,
                transform: `translate(-50%, -50%) scale(${scale})`,
                width: WIDTH * 0.88,
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
                filter: `drop-shadow(0 4px 12px rgba(255,200,100,${glowAlpha}))`,
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
            {/* Soccer Ball */}
            <div
              key={player.value}
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translate(-50%, -80%)",
                width: balloonSize,
                height: balloonSize,
                animation: "ballDribble 480ms ease-in-out infinite",
                pointerEvents: "none",
                userSelect: "none",
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.3))",
              }}
              className="player-balloon"
            >
              <div style={{ animation: "ballSpin 480ms ease-in-out infinite" }}>
                <SoccerBall size={balloonSize} />
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: Math.max(28, balloonSize * 0.45),
                  fontWeight: 900,
                  textShadow:
                    "-2px -2px 0 #222, 2px -2px 0 #222, -2px 2px 0 #222, 2px 2px 0 #222, 0 3px 8px rgba(0,0,0,0.4)",
                }}
              >
                {player.value}
              </div>
            </div>

            {/* Ball bounce shadow */}
            <div
              style={{
                position: "absolute",
                top: -balloonSize * 0.55,
                left: "50%",
                width: balloonSize * 0.6,
                height: 8,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.2)",
                animation: "ballShadow 480ms ease-in-out infinite",
                pointerEvents: "none",
              }}
            />

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
                  "radial-gradient(ellipse, rgba(255,200,100,0.3) 0%, transparent 70%)",
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
                background: "linear-gradient(180deg, #e6952e, #c47520)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 8px 20px rgba(230,149,46,0.35)",
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
