import React, { useEffect, useRef, useState } from "react";
import DigitIcon from "./DigitIcon";

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.2;
const HIT_RANGE = 0.05;
const ROW_GAP = 0.2; // 🔹 줄 간격 비율

type Player = { lane: number; value: number };
type RowKind = "normal" | "goal";
type Row = {
  id: number;
  y: number;
  values: number[];
  kind: RowKind;
  handled?: boolean;
  hitLane?: number | null; // 터치된 lane
};

// ✅ DigitIcon(0~9) 여러 개로 "18" 같은 숫자를 표현
const DigitNumber: React.FC<{
  value: number;
  size: number; // 한 자리 아이콘 크기
}> = ({ value, size }) => {
  const str = Math.max(0, value).toString(); // 음수 방지(원하면 제거)
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {str.split("").map((ch, i) => (
        <DigitIcon key={`${ch}-${i}`} value={Number(ch)} size={size} />
      ))}
    </div>
  );
};

let rowIdSeed = 0;

// 🔹 스테이지 설정: 숫자 후보 + 몇 줄을 지나갈지(rowCount)
const stageSettings: { values: number[]; rowCount: number }[] = [
  { values: [1, 2], rowCount: 2 },
  { values: [2, 3], rowCount: 2 },
  { values: [3, 4], rowCount: 2 },
  { values: [4, 5], rowCount: 3 },
  { values: [5, 6], rowCount: 3 },
  { values: [6, 7], rowCount: 3 }, //6
  { values: [1, 2, 3], rowCount: 4 },
  { values: [1, 2, 4], rowCount: 4 },
  { values: [3, 4, 5], rowCount: 4 },
  { values: [10, 2, 6], rowCount: 4 }, //10
  { values: [4, 3, 7], rowCount: 5 },
  { values: [1, 8, 9], rowCount: 5 },
  { values: [4, 6, 8], rowCount: 5 },
  { values: [2, 5, 10], rowCount: 5 },
  { values: [3, 7, 8], rowCount: 5 },
  { values: [4, 6, 7], rowCount: 5 },
  { values: [5, 8, 9], rowCount: 5 },
  { values: [6, 7, 8], rowCount: 5 }, //18
  { values: [1, 2, 3], rowCount: 6 },
  { values: [3, 4, 5], rowCount: 6 },
  { values: [4, 5, 6], rowCount: 6 },
  { values: [5, 6, 7], rowCount: 6 },
  { values: [6, 7, 8], rowCount: 6 },
  { values: [7, 8, 9], rowCount: 6 }, //24
  { values: [1, 2, 3], rowCount: 7 },
  { values: [2, 3, 4], rowCount: 7 },
  { values: [3, 4, 5], rowCount: 7 },
  { values: [4, 5, 6], rowCount: 7 }, //28
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
  const [goalValues, setGoalValues] = useState<number[]>([]);
  // ✅ 고정 WIDTH/HEIGHT 제거하고, 화면에 꽉 채우는 값으로 사용
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      // iOS 주소창/툴바 변동까지 최대한 꽉 채움
      const w = Math.floor(vv?.width ?? window.innerWidth);
      const h = Math.floor(vv?.height ?? window.innerHeight);
      setViewport({ width: w, height: h });
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update); // iOS에서 높이 변동 케이스

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  const WIDTH = viewport.width || 360;
  const HEIGHT = viewport.height || 780;

  // 실패 상황판 열렸는지 여부
  const [failBoardOpen, setFailBoardOpen] = useState(false);

  // 애니메이션용 ref들
  const lastTimeRef = useRef<number | null>(null);

  // 최신 값 저장용 ref (게임 루프에서 사용)
  const latestLane = useRef(player.lane);
  const latestValue = useRef(player.value);
  const latestGoal = useRef(goalValues);
  const latestStage = useRef(stage);
  const initializedRef = useRef(false);

  // ✅ 현재 스테이지에서 "가장 멀리 있는 y" 저장용 (원근 계산 기준)
  const farYRef = useRef<number>(-1);

  // ✅ clamp / lerp
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // ✅ y(0~1.x) 기반 원근감 계산
  const getPerspective = (worldY: number, farY: number, kind: RowKind) => {
    const nearY = PLAYER_Y;
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y);

    const minScale = kind === "goal" ? 0.55 : 0.35;

    const scale = lerp(minScale, 1.0, tt);
    const spread = lerp(0.55, 1.0, tt);
    return { scale, spread };
  };

  const FAR_SCREEN_Y = -0.22 * HEIGHT; // 화면 위쪽 시작점(취향)
  const GAMMA_Y = 2.2; // 클수록 "가까울수록 더 빠르게/더 벌어지게"

  // row.y(월드) → rowYpx(화면) 투영
  const projectRowYpx = (worldY: number, farY: number) => {
    const nearY = PLAYER_Y; // 플레이어 라인 근처가 "가까움"

    // farY ~ nearY 를 0~1로
    const t = clamp01((worldY - farY) / (nearY - farY));
    const tt = Math.pow(t, GAMMA_Y); // ✅ 가까울수록 더 많이 이동/벌어짐

    // far(먼 곳) → near(플레이어 라인)
    const nearPx = nearY * HEIGHT;
    const px = lerp(FAR_SCREEN_Y, nearPx, tt);

    // nearY 아래로 더 내려간 경우는 자연스럽게 이어주기
    if (worldY > nearY) {
      // tt의 기울기(near에서의 속도)를 이어주면 끊김이 덜함
      const slopeAtNear = GAMMA_Y; // t=1일 때 d(t^gamma)/dt = gamma
      return nearPx + (worldY - nearY) * HEIGHT * slopeAtNear;
    }

    return px;
  };

  // 🔹 터치 영역 컨테이너 ref (손 위치 → lane 계산용)
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 🔹 state 바뀔 때마다 ref 갱신
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

  // 🔹 스테이지 초기화 함수
  const initStage = (stageIndex: number, isNewStage: boolean) => {
    const index = stageIndex % stageSettings.length;
    const { values, rowCount } = stageSettings[index];

    // ✅ 가장 멀리 있는 줄의 y (goal 줄이 제일 위에 있으니 그 기준으로 잡아도 됨)
    farYRef.current = -(rowCount * ROW_GAP + ROW_GAP * 2);

    lastTimeRef.current = null;

    // -------------------------
    // 🔥 1) 가능한 total 목록 생성
    // -------------------------
    const totals = getPossibleTotals(values, rowCount);

    // 총합 리스트가 너무 적어도 최소 2개 선택되도록 처리
    const shuffled = [...totals].sort(() => Math.random() - 0.5);

    const goalA = shuffled[0] ?? 0;
    const goalB = shuffled[1] ?? goalA; // totals가 1개일 때 대비

    // -------------------------
    // 🔥 2) 상태에 저장
    // -------------------------
    setGoalValues([goalA, goalB]);
    latestGoal.current = [goalA, goalB];

    // -------------------------
    // 🔥 3) normal 줄 생성 함수
    // -------------------------

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

    // -------------------------
    // 🔥 4) goal 줄 생성 (2개의 목표)
    // -------------------------

    const makeGoalRow = (offsetY: number): Row => ({
      id: rowIdSeed++,
      y: offsetY,
      values: [goalA, goalB], // ✨ 두 개의 goal 옵션
      kind: "goal",
      handled: false,
      hitLane: null,
    });

    // -------------------------
    // 🔥 5) 스테이지 줄들 생성
    // -------------------------
    const newRows: Row[] = [];

    // normal 줄 rowCount개
    for (let i = 0; i < rowCount; i++) {
      newRows.push(makeNormalRow(-i * ROW_GAP));
    }

    // 마지막에 goal 한 줄 (좌우 2개 옵션)
    newRows.push(makeGoalRow(-rowCount * ROW_GAP));

    setRows(newRows);
    setPlayer((prev) => ({ ...prev, value: 0 }));
  };

  // 🔹 첫 진입 시 스테이지 0 랜덤 goal로 시작
  useEffect(() => {
    if (initializedRef.current) return; // 이미 한 번 초기화 했으면 무시
    initializedRef.current = true;
    initStage(0, true);
  }, []);

  // 🔹 키보드 좌우 이동 (그대로 유지)
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

  // 🔹 터치(모바일) 이동 — 손가락 위치에 맞춰 바로 lane 이동
  const movePlayerByTouchX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left; // 컨테이너 내부 기준 X
    const laneWidthPx = rect.width / LANE_COUNT;
    let lane = Math.floor(x / laneWidthPx);
    lane = Math.max(0, Math.min(LANE_COUNT - 1, lane));

    setPlayer((prev) => ({
      ...prev,
      lane,
    }));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    movePlayerByTouchX(touch.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    movePlayerByTouchX(touch.clientX);
  };

  const handleTouchEnd = () => {
    // 손을 떼면 그냥 현재 lane 유지 → 아무 것도 안 함
  };

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

          // ✅ "플레이어 라인을 위→아래로 통과하는 순간"만 한 번 처리
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

              // lane으로 왼쪽/오른쪽 선택
              const optionIndex = laneHit < LANE_COUNT / 2 ? 0 : 1;

              const chosenGoalNumber = row.values[optionIndex];
              const totalAfterHit = latestValue.current + addValue;

              // ✅ 핵심: "선택한 goal 숫자"와 총합이 같을 때만 성공
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

  const balloonSize = Math.min(68 + player.value * 2, 140);

  return (
    <div
      ref={containerRef} // 🔥 터치 좌표 계산용 ref
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        margin: "0 auto",
        background: "#e7e7e7",
        overflow: "hidden",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="bg" />
      {/* 상단 UI */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 40,
          fontFamily: "Fredoka",
        }}
      >
        STAGE {stage + 1}
      </div>
      <div style={{ position: "absolute", top: 26, left: 8, fontSize: 14 }}>
        목표: {goalValues.join(" / ")}
      </div>
      <div style={{ position: "absolute", top: 26, right: 8, fontSize: 14 }}>
        현재: {player.value}
      </div>
      <div
        style={
          {
            // position: "absolute",
            // inset: 0,
            // transformOrigin: "center 100%", // 아래쪽을 기준으로
            // transform: "rotateX(40deg)", // 각도 조절해서 맛보기
            // transformStyle: "preserve-3d",
            // 위로 갈수록 좁아지는 사다리꼴
            //   (좌측 상단 x%, 우측 상단 x%, 우측 하단, 좌측 하단)
            // clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0% 100%)",
          }
        }
      >
        {/* 줄들 */}
        {rows.map((row) => {
          const rowYpx = projectRowYpx(row.y, farYRef.current);

          if (row.kind === "goal") {
            const { scale, spread } = getPerspective(
              row.y,
              farYRef.current,
              row.kind
            );

            return (
              <div
                key={row.id}
                style={{
                  position: "absolute",
                  left: WIDTH / 2,
                  top: rowYpx,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  width: WIDTH * 0.9 * spread, // ✅ 멀리서는 폭이 더 좁아짐
                  height: 80,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {row.values.map((v, idx) => (
                  <div
                    key={`${row.id}-goal-${idx}`}
                    style={{
                      width: "49%",
                      height: "100%",
                      borderRadius: 24,
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 0 rgba(0,0,0,0.3)",
                    }}
                  >
                    <DigitNumber value={v} size={70} />
                  </div>
                ))}
              </div>
            );
          }

          return row.values.map((v, laneIndex) => {
            const { scale, spread } = getPerspective(
              row.y,
              farYRef.current,
              row.kind
            );

            const centerX = WIDTH / 2;
            const baseX = laneIndex * laneWidth + laneWidth / 2;

            // ✅ 멀리서는 중앙으로 모이고, 가까워질수록 원래 lane으로 벌어짐
            const x = centerX + (baseX - centerX) * spread;

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
                  opacity: row.hitLane === laneIndex ? 0 : 1,
                  transition: "opacity 0.3s ease",
                }}
              >
                <DigitNumber value={v} size={56} />
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
                // width: laneWidth * 0.7,
                // height: 140,
                borderRadius: 20,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                key={player.value} // 🔥 값이 바뀔 때마다 재렌더 → 애니메이션 트리거
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
                    "radial-gradient(circle at 30% 30%, #7dd3fc, #0284c7)",
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                  animation: "pop 260ms ease-out",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                className="player-balloon"
              >
                {player.value}
              </div>
              <div className="charactor" style={{ zIndex: 1 }} />
            </div>
          );
        })()}
      </div>
      {/* 실패 상황판 오버레이 */}
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
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
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
              padding: 36,
              borderRadius: 36,
              textAlign: "center",
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
        </div>
      )}
    </div>
  );
};

export default NumberLaneGame;
