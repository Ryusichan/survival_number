import React, { useEffect, useRef, useState } from "react";

const WIDTH = 360;
const HEIGHT = 640;

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.35;
const HIT_RANGE = 0.05;

type Player = { lane: number; value: number };
type RowKind = "normal" | "goal";
type Row = {
  id: number;
  y: number;
  values: number[];
  kind: RowKind;
  handled?: boolean;
  hitLane?: number | null; // 터치
};

let rowIdSeed = 0;

// 🔹 스테이지 설정: 숫자 후보 + 몇 줄을 지나갈지(rowCount)
const stageSettings: { values: number[]; rowCount: number }[] = [
  { values: [2, 5], rowCount: 2 },
  { values: [2, 5, 10], rowCount: 3 },
  { values: [3, 7], rowCount: 4 },
];

// 🔹 values와 rowCount로 가능한 총합 리스트 구하기
function getPossibleTotals(values: number[], rowCount: number): number[] {
  const result = new Set<number>();

  const dfs = (depth: number, sum: number) => {
    if (depth === rowCount) {
      result.add(sum);
      return;
    }
    for (const v of values) dfs(depth + 1, sum + v);
  };

  dfs(0, 0);
  return Array.from(result).sort((a, b) => a - b);
}

// 🔹 가능한 total 중 하나 랜덤 선택
function getRandomGoal(values: number[], rowCount: number): number {
  const totals = getPossibleTotals(values, rowCount);
  if (totals.length === 0) return 0;
  const idx = Math.floor(Math.random() * totals.length);
  return totals[idx];
}

const NumberLaneGame: React.FC = () => {
  const [player, setPlayer] = useState<Player>({ lane: 2, value: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [stage, setStage] = useState(0);
  const [goalValue, setGoalValue] = useState(0);

  // 실패 상황판 열렸는지 여부
  const [failBoardOpen, setFailBoardOpen] = useState(false);

  // 애니메이션용 ref들
  const lastTimeRef = useRef<number | null>(null);

  // 최신 값 저장용 ref (게임 루프에서 사용)
  const latestLane = useRef(player.lane);
  const latestValue = useRef(player.value);
  const latestGoal = useRef(goalValue);
  const latestStage = useRef(stage);
  const initializedRef = useRef(false);

  // 터치 스와이프
  const touchStartXRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);

  // 🔹 state 바뀔 때마다 ref 갱신
  useEffect(() => {
    latestLane.current = player.lane;
    latestValue.current = player.value;
  }, [player]);

  useEffect(() => {
    latestGoal.current = goalValue;
  }, [goalValue]);

  useEffect(() => {
    latestStage.current = stage;
  }, [stage]);

  // 🔹 스테이지 초기화 함수
  // 🔹 스테이지 초기화 함수
  const initStage = (stageIndex: number, isNewStage: boolean) => {
    const index = stageIndex % stageSettings.length;
    const { values, rowCount } = stageSettings[index];

    let goal = latestGoal.current;

    // 새 스테이지 시작이거나, goal이 아직 0이면 새로운 랜덤 goal 생성
    if (isNewStage || goal === 0) {
      goal = getRandomGoal(values, rowCount);
      setGoalValue(goal);
      latestGoal.current = goal;
    }

    lastTimeRef.current = null;

    // 🔹 normal 줄
    const makeNormalRow = (offsetY: number): Row => ({
      id: rowIdSeed++,
      y: offsetY,
      values: Array.from({ length: LANE_COUNT }, () => {
        const i = Math.floor(Math.random() * values.length);
        return values[i];
      }),
      kind: "normal",
      handled: false,
      hitLane: null,
    });

    // 🔹 goal 줄: values[0] = 정답, values[1] = 오답
    const totals = getPossibleTotals(values, rowCount);
    const candidates = totals.filter((t) => t !== goal);
    const wrongGoal =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : goal + (values[0] ?? 1);

    const makeGoalRow = (offsetY: number): Row => ({
      id: rowIdSeed++,
      y: offsetY,
      values: [goal, wrongGoal], // ✨ 두 개의 선택지
      kind: "goal",
      handled: false,
      hitLane: null,
    });

    const newRows: Row[] = [];
    for (let i = 0; i < rowCount; i++) {
      newRows.push(makeNormalRow(-i * 0.25));
    }

    // 마지막에 goal 한 줄 (좌우 2개 옵션)
    newRows.push(makeGoalRow(-rowCount * 0.25));

    setRows(newRows);
    setPlayer({ lane: 2, value: 0 });
  };

  // 🔹 첫 진입 시 스테이지 0 랜덤 goal로 시작
  useEffect(() => {
    if (initializedRef.current) return; // 이미 한 번 초기화 했으면 무시
    initializedRef.current = true;
    initStage(0, true);
  }, []);

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

  // 🔹 터치(모바일) 이동
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const THRESHOLD = 40;

    if (!touchMovedRef.current && Math.abs(dx) > THRESHOLD) {
      setPlayer((prev) => {
        let nextLane = prev.lane + (dx > 0 ? 1 : -1);
        nextLane = Math.max(0, Math.min(LANE_COUNT - 1, nextLane));
        return { ...prev, lane: nextLane };
      });
      touchMovedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    touchMovedRef.current = false;
    touchStartXRef.current = null;
  };

  // 🔹 게임 루프 (실패 상황판이 열려 있으면 멈춤)
  // 🔹 게임 루프 (실패 상황판이 열려 있으면 멈춤)
  useEffect(() => {
    if (failBoardOpen) return; // 멈춘 상태면 루프 돌리지 않음

    let frameId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
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

          // ✅ "플레이어 라인을 위→아래로 통과하는 순간"만 한 번만 처리
          const justCrossed =
            !row.handled && prevY < PLAYER_Y && newY >= PLAYER_Y;

          if (justCrossed) {
            const laneHit = latestLane.current;

            if (row.kind === "normal") {
              // ✅ 일반 줄: 내가 있는 lane 숫자만 더함
              const picked = row.values[laneHit];
              addValue += picked;

              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: laneHit,
              });
            } else if (row.kind === "goal") {
              // ✅ goal 줄: lane에 따라 왼쪽/오른쪽 중 하나 선택
              hitGoal = true;

              // 왼쪽 영역(lane 0,1) → index 0, 오른쪽 영역(lane 3,4) → index 1
              const optionIndex = laneHit < LANE_COUNT / 2 ? 0 : 1;

              const chosenGoalNumber = row.values[optionIndex];
              const totalAfterHit = latestValue.current + addValue;

              // 🔥 합도 맞고, 내가 선택한 goal 숫자도 정답 goal일 때만 성공
              success =
                totalAfterHit === latestGoal.current &&
                chosenGoalNumber === latestGoal.current;

              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: laneHit,
              });
            }

            continue;
          }

          // 화면 아래로 완전히 나가면 제거
          if (newY <= 1.3) {
            next.push({ ...row, y: newY });
          }
        }

        // 이번 프레임에 모은 값 한 번만 반영
        if (addValue > 0) {
          setPlayer((prevPlayer) => ({
            ...prevPlayer,
            value: prevPlayer.value + addValue,
          }));
        }

        // hitGoal / success는 setRows 바깥에서 사용
        if (hitGoal) {
          if (success) {
            console.log("이게성공?");
            // ✅ 성공: 다음 스테이지 + 새 goal, 멈추지 않음
            setStage((prevStage) => {
              const nextStageIndex = (prevStage + 1) % stageSettings.length;
              initStage(nextStageIndex, true);
              return nextStageIndex;
            });
          } else {
            console.log("실패아님?");
            // ❌ 실패: 상황판 띄우고 루프 멈춤
            setFailBoardOpen(true);
          }
        }

        return next;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [failBoardOpen]);

  const laneWidth = WIDTH / LANE_COUNT;

  // 🔹 실패 후 "다시 도전" 버튼
  const handleRetry = () => {
    setFailBoardOpen(false); // 상황판 닫기
    initStage(latestStage.current, false); // 같은 스테이지, 같은 goal로 재도전
  };

  return (
    <div
      style={{
        position: "relative",
        width: WIDTH,
        height: "100vh",
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
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 28,
          fontFamily: "Fredoka",
        }}
      >
        STAGE {stage + 1}
      </div>
      <div style={{ position: "absolute", top: 26, left: 8, fontSize: 14 }}>
        목표: {goalValue}
      </div>
      <div style={{ position: "absolute", top: 26, right: 8, fontSize: 14 }}>
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
                width: WIDTH * 0.9,
                height: 80,
                display: "flex", // 🔥 여기: 자식 둘 가로 배치
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {row.values.map((v, idx) => (
                <div
                  key={`${row.id}-goal-${idx}`}
                  style={{
                    width: "48%",
                    height: "100%",
                    borderRadius: 24,
                    background: "#f97316",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 32,
                    fontWeight: "bold",
                    boxShadow: "0 8px 0 rgba(0,0,0,0.3)",
                  }}
                >
                  {v}
                </div>
              ))}
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
                opacity: row.hitLane === laneIndex ? 0 : 1, // ✅ 닿은 칸만 0
                transition: "opacity 0.3s ease", // ✅ 부드럽게 사라지게 (원하면 조절)
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

      {/* 실패 상황판 오버레이 */}
      {failBoardOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 12 }}>실패… 💀</div>
          <div style={{ fontSize: 16, marginBottom: 24 }}>
            목표: {goalValue} / 현재: {player.value}
          </div>
          <button
            onClick={handleRetry}
            style={{
              padding: "10px 18px",
              fontSize: 16,
              borderRadius: 10,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            다시 도전
          </button>
        </div>
      )}
    </div>
  );
};

export default NumberLaneGame;
