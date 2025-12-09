import React, { useEffect, useRef, useState } from "react";

const WIDTH = 360;
const HEIGHT = 640;

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.35;
const HIT_RANGE = 0.05;

type Player = {
  lane: number;
  value: number;
};

type RowKind = "normal" | "goal";

type Row = {
  id: number;
  y: number;
  values: number[];
  kind: RowKind;
  handled?: boolean;
};

let rowIdSeed = 0;

const NumberLaneGame: React.FC = () => {
  const [player, setPlayer] = useState<Player>({ lane: 2, value: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [goalValue, setGoalValue] = useState<number>(50);
  const [result, setResult] = useState<null | "success" | "fail">(null);

  const reqRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // 🔹 터치 스와이프 관련 ref
  const touchStartXRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);

  // 🔹 키보드 좌우 이동
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

  // 🔹 터치 시작
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchMovedRef.current = false;
  };

  // 🔹 터치 이동 (스와이프 감지)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null) return;
    const currentX = e.touches[0].clientX;
    const dx = currentX - touchStartXRef.current;
    const THRESHOLD = 40; // 이 정도 이상 움직이면 이동

    if (!touchMovedRef.current && Math.abs(dx) > THRESHOLD) {
      setPlayer((prev) => {
        let nextLane = prev.lane + (dx > 0 ? 1 : -1); // 오른쪽 / 왼쪽
        nextLane = Math.max(0, Math.min(LANE_COUNT - 1, nextLane));
        return { ...prev, lane: nextLane };
      });
      touchMovedRef.current = true; // 한 번 터치에 한 번만 이동
    }
  };

  // 🔹 터치 종료/취소
  const handleTouchEnd = () => {
    touchStartXRef.current = null;
    touchMovedRef.current = false;
  };

  // 🔹 초기 줄 세팅
  useEffect(() => {
    const makeNormalRow = (offsetY: number): Row => ({
      id: rowIdSeed++,
      y: offsetY,
      values: Array.from({ length: LANE_COUNT }, () =>
        Math.random() < 0.7 ? 2 : 5
      ),
      kind: "normal",
    });

    const startRows: Row[] = [];
    for (let i = 0; i < 6; i++) {
      startRows.push(makeNormalRow(-i * 0.25));
    }
    const goal = 40;
    setGoalValue(goal);
    startRows.push({
      id: rowIdSeed++,
      y: -6 * 0.25,
      values: Array(LANE_COUNT).fill(goal),
      kind: "goal",
    });
    setRows(startRows);
  }, []);

  // 🔹 게임 루프
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setRows((prevRows) => {
        const newRows: Row[] = [];
        let addValue = 0;
        let newResult: null | "success" | "fail" = null;

        for (const row of prevRows) {
          const newY = row.y + ROW_SPEED * dt;

          const willHit =
            !row.handled &&
            newY >= PLAYER_Y - HIT_RANGE &&
            newY <= PLAYER_Y + HIT_RANGE;

          if (willHit) {
            if (row.kind === "normal") {
              const picked = row.values[player.lane];
              addValue += picked;
              newRows.push({ ...row, y: newY, handled: true });
            } else if (row.kind === "goal") {
              const goal = row.values[0];
              const total = player.value;
              newResult = total === goal ? "success" : "fail";
              newRows.push({ ...row, y: newY, handled: true });
            }
          } else {
            if (newY > 1.3) continue;
            newRows.push({ ...row, y: newY });
          }
        }

        if (addValue !== 0) {
          setPlayer((prev) => ({ ...prev, value: prev.value + addValue }));
        }
        if (newResult && result == null) {
          setResult(newResult);
        }

        return newRows;
      });

      if (!result) {
        reqRef.current = requestAnimationFrame(loop);
      }
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current != null) cancelAnimationFrame(reqRef.current);
    };
  }, [player.lane, player.value, result]);

  const laneWidth = WIDTH / LANE_COUNT;

  return (
    <div
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        margin: "0 auto",
        background: "#e5e7eb",
        overflow: "hidden",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 상단 UI */}
      <div style={{ position: "absolute", top: 8, left: 8, fontSize: 16 }}>
        목표: {goalValue}
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16 }}>
        현재: {player.value}
      </div>

      {/* 줄들 */}
      {rows.map((row) => {
        const rowYpx = row.y * HEIGHT;

        if (row.kind === "goal") {
          return (
            <div
              key={row.id}
              style={{
                position: "absolute",
                left: WIDTH / 2,
                top: rowYpx,
                transform: "translate(-50%, -50%)",
                width: WIDTH * 0.8,
                height: 80,
                borderRadius: 24,
                background: "#f97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 36,
                fontWeight: "bold",
                boxShadow: "0 8px 0 rgba(0,0,0,0.3)",
              }}
            >
              {row.values[0]}
            </div>
          );
        }

        return row.values.map((v, laneIndex) => {
          const x = laneIndex * laneWidth + laneWidth / 2;
          return (
            <div
              key={`${row.id}-${laneIndex}`}
              style={{
                position: "absolute",
                left: x,
                top: rowYpx,
                transform: "translate(-50%, -50%)",
                width: laneWidth * 0.7,
                height: 60,
                borderRadius: 16,
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                boxShadow: "0 6px 0 rgba(0,0,0,0.25)",
              }}
            >
              {v}
            </div>
          );
        });
      })}

      {/* 플레이어 */}
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
              width: laneWidth * 0.7,
              height: 80,
              borderRadius: 20,
              background: "#111827",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 12 }}>병사</div>
            <div style={{ fontSize: 22, fontWeight: "bold" }}>
              {player.value}
            </div>
          </div>
        );
      })()}

      {/* 결과 오버레이 */}
      {result && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>
            {result === "success" ? "통과! 🎉" : "실패… 💀"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              borderRadius: 8,
              border: "none",
            }}
          >
            다시 시작
          </button>
        </div>
      )}
    </div>
  );
};

export default NumberLaneGame;
