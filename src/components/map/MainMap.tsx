import React, { useEffect, useRef, useState } from "react";

const LANE_COUNT = 5; // 레인 개수
const FALL_SPEED = 0.4; // 초당 y 속도
const PLAYER_Y = 0.8; // 화면에서 플레이어 위치(0~1)
const COLLISION_RANGE = 0.1; // 플레이어와 숫자 y 차이가 이 정도면 충돌

type Player = {
  lane: number;
  value: number;
};

type FallingNum = {
  id: number;
  lane: number;
  y: number;
  value: number;
};

let idSeed = 0;

const NumberRunnerGame: React.FC = () => {
  const [player, setPlayer] = useState<Player>({ lane: 2, value: 1 });
  const [numbers, setNumbers] = useState<FallingNum[]>([]);
  const [goal, setGoal] = useState(100); // 마지막에 맞춰야 할 숫자
  const [gameOverText, setGameOverText] = useState<string | null>(null);

  const reqIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // 키보드 좌우 이동
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

  // 숫자 생성 함수
  const spawnNumber = () => {
    setNumbers((prev) => [
      ...prev,
      {
        id: idSeed++,
        lane: Math.floor(Math.random() * LANE_COUNT),
        y: 0, // 맨 위
        value: 2, // 일단 전부 2, 나중에 3,5,10 등 다양하게
      },
    ]);
  };

  // 게임 루프
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
      const dt = (time - lastTimeRef.current) / 1000; // ms → sec
      lastTimeRef.current = time;

      // 숫자들 위치 업데이트 + 충돌 체크
      setNumbers((prevNums) => {
        const updated: FallingNum[] = [];
        let playerValueDelta = 0;

        for (const n of prevNums) {
          let newY = n.y + FALL_SPEED * dt;

          // 플레이어와 충돌 체크
          const isSameLane = n.lane === player.lane;
          const isHit =
            isSameLane && n.y < PLAYER_Y && newY >= PLAYER_Y - COLLISION_RANGE;

          if (isHit) {
            playerValueDelta += n.value;
            // 충돌한 숫자는 버리고 continue
            continue;
          }

          // 화면 아래로 나갔으면 제거
          if (newY > 1.2) {
            continue;
          }

          updated.push({ ...n, y: newY });
        }

        if (playerValueDelta !== 0) {
          setPlayer((prev) => ({
            ...prev,
            value: prev.value + playerValueDelta,
          }));
        }

        return updated;
      });

      // 가끔씩 숫자 생성 (확률형)
      if (Math.random() < 0.03) {
        spawnNumber();
      }

      // 게임 계속 진행
      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqIdRef.current != null) cancelAnimationFrame(reqIdRef.current);
    };
  }, [player.lane]); // 플레이어 lane이 바뀌어도 루프는 유지

  // 예시: 어떤 조건에서 게임 종료/판정할지
  const handleFinish = () => {
    if (player.value === goal) {
      setGameOverText("성공! 🎉");
    } else {
      setGameOverText(`실패... (현재 ${player.value} / 목표 ${goal})`);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: 360,
        height: 640,
        margin: "0 auto",
        background: "#ddd",
        overflow: "hidden",
      }}
    >
      {/* 목표 숫자 표시 */}
      <div style={{ position: "absolute", top: 10, left: 10, fontSize: 24 }}>
        목표: {goal}
      </div>
      {/* 내 숫자 */}
      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 24 }}>
        현재: {player.value}
      </div>

      {/* 떨어지는 숫자들 */}
      {numbers.map((n) => {
        const laneWidth = 360 / LANE_COUNT;
        const x = n.lane * laneWidth + laneWidth / 2;
        const y = n.y * 640;

        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%)`,
              left: x,
              top: y,
              width: laneWidth * 0.6,
              height: 60,
              borderRadius: 12,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 32,
              fontWeight: "bold",
              boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
            }}
          >
            {n.value}
          </div>
        );
      })}

      {/* 플레이어 */}
      {(() => {
        const laneWidth = 360 / LANE_COUNT;
        const x = player.lane * laneWidth + laneWidth / 2;
        const y = PLAYER_Y * 640;

        return (
          <div
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              left: x,
              top: y,
              width: laneWidth * 0.7,
              height: 80,
              background: "#111827",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 14 }}>병사</div>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>
              {player.value}
            </div>
          </div>
        );
      })()}

      {/* 종료 버튼 (테스트용) */}
      <button
        onClick={handleFinish}
        style={{ position: "absolute", bottom: 10, left: 10 }}
      >
        끝내고 판정하기
      </button>

      {gameOverText && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: "bold",
          }}
        >
          {gameOverText}
        </div>
      )}
    </div>
  );
};

export default NumberRunnerGame;
