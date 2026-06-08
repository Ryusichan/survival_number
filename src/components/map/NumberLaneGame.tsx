import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import DigitIcon from "./DigitIcon";
import BackButton from "components/item/BackButton";

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.2;
const ROW_GAP = 0.2;
// 스테이지 통과 시 다음 문제를 지평선 뒤쪽에서 흘러나오게 밀어주는 거리
const STAGE_SPAWN_BACK = ROW_GAP * 2;

type Player = { x: number; value: number };
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
    <circle
      cx="50"
      cy="50"
      r="48"
      fill="none"
      stroke="#b0b0b0"
      strokeWidth="1.5"
    />
    <g style={{ clipPath: "circle(47.5% at 50% 50%)" }}>
      {/* Curved pentagons - center enlarged */}
      <g
        fill="#2a2a2a"
        stroke="#1a1a1a"
        strokeWidth="0.8"
        strokeLinejoin="round"
      >
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
let sparkleIdSeed = 0;

type SparkleFx = { id: number; xUnits: number; big?: boolean };

// 숫자를 먹었을 때 터지는 반짝임 효과
const SPARKLE_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0.7, dy: -0.7 },
  { dx: 1, dy: 0 },
  { dx: 0.7, dy: 0.7 },
  { dx: 0, dy: 1 },
  { dx: -0.7, dy: 0.7 },
  { dx: -1, dy: 0 },
  { dx: -0.7, dy: -0.7 },
];

const SparkleBurst: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {/* 중심 플래시 */}
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size * 0.55,
        height: size * 0.55,
        marginLeft: -(size * 0.55) / 2,
        marginTop: -(size * 0.55) / 2,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(255,255,210,0.95) 0%, rgba(255,210,90,0.5) 45%, rgba(255,200,80,0) 72%)",
        animation: "sparkleFlash 0.5s ease-out forwards",
      }}
    />
    {/* 사방으로 튀는 별가루 */}
    {SPARKLE_DIRS.map((d, i) => (
      <span
        key={i}
        style={
          {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 7,
            height: 7,
            marginLeft: -3.5,
            marginTop: -3.5,
            background: i % 2 === 0 ? "#fff7c2" : "#ffd86b",
            borderRadius: "50%",
            boxShadow: "0 0 7px 2px rgba(255,220,120,0.9)",
            ["--sx" as string]: `${d.dx * size * 0.75}px`,
            ["--sy" as string]: `${d.dy * size * 0.75}px`,
            animation: `sparkleFly 0.6s ease-out forwards`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

// ===== 보상 아이템 (10클리어마다 하나씩 획득 → 캐릭터에 누적) =====
type RewardItem = { id: string; name: string; at: number; glow: string };

const REWARD_ITEMS: RewardItem[] = [
  { id: "cape", name: "히어로 망토", at: 10, glow: "rgba(226,59,59,0.5)" },
  { id: "crown", name: "챔피언 왕관", at: 20, glow: "rgba(255,200,60,0.5)" },
  { id: "wings", name: "천사 날개", at: 30, glow: "rgba(180,210,250,0.5)" },
  { id: "boots", name: "황금 축구화", at: 40, glow: "rgba(255,200,60,0.5)" },
  { id: "aura", name: "에너지 오라", at: 50, glow: "rgba(60,210,255,0.5)" },
  { id: "halo", name: "전설의 후광", at: 60, glow: "rgba(255,220,90,0.55)" },
];

const LAST_ITEM_AT = REWARD_ITEMS[REWARD_ITEMS.length - 1].at;

// 이번 마일스톤(정확히 N의 배수)에 획득한 보상
function getReward(count: number): RewardItem | null {
  const item = REWARD_ITEMS.find((it) => it.at === count);
  if (item) return item;
  if (count > LAST_ITEM_AT)
    return {
      id: "star",
      name: "레전드 마스터",
      at: count,
      glow: "rgba(255,220,90,0.55)",
    };
  return null;
}

// 현재까지 해금된 아이템 id 목록
function getUnlockedItemIds(clearCount: number): string[] {
  const ids = REWARD_ITEMS.filter((it) => clearCount >= it.at).map(
    (it) => it.id,
  );
  if (clearCount > LAST_ITEM_AT) ids.push("star");
  return ids;
}

// 아이템 SVG 아트 (캐릭터/모달 공용)
const ItemIcon: React.FC<{ id: string; size?: number }> = ({
  id,
  size = 48,
}) => {
  const uid = useId().replace(/:/g, "");
  const g = `g${uid}`;
  const common = { width: size, height: size, viewBox: "0 0 48 48" } as const;

  if (id === "cape")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#c41e1e" />
          </linearGradient>
        </defs>
        <path
          d="M14,8 L34,8 L41,42 Q35,46 31,40 Q27,46 24,40 Q21,46 17,40 Q13,46 7,42 Z"
          fill={`url(#${g})`}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M24,8 L24,42"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          fill="none"
        />
        <rect x="13" y="6" width="22" height="5" rx="2.5" fill="#ffd24a" />
      </svg>
    );

  if (id === "crown")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe486" />
            <stop offset="100%" stopColor="#e6a91f" />
          </linearGradient>
        </defs>
        <path
          d="M7,36 L9,15 L18,26 L24,10 L30,26 L39,15 L41,36 Z"
          fill={`url(#${g})`}
          stroke="#b9851a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <rect x="7" y="35" width="34" height="6" rx="2" fill="#d99a1f" />
        <circle cx="24" cy="18" r="2.4" fill="#ff5a7a" />
        <circle cx="13" cy="30" r="1.8" fill="#5ad1ff" />
        <circle cx="35" cy="30" r="1.8" fill="#5ad1ff" />
      </svg>
    );

  if (id === "wings")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#bcd4f2" />
          </linearGradient>
        </defs>
        <path
          d="M24,16 C16,8 6,8 4,18 C10,16 14,18 24,24 Z"
          fill={`url(#${g})`}
          stroke="rgba(80,110,160,0.4)"
          strokeWidth="0.8"
        />
        <path
          d="M24,22 C16,16 6,18 5,28 C11,25 16,26 24,30 Z"
          fill={`url(#${g})`}
          stroke="rgba(80,110,160,0.4)"
          strokeWidth="0.8"
        />
        <path
          d="M24,16 C32,8 42,8 44,18 C38,16 34,18 24,24 Z"
          fill={`url(#${g})`}
          stroke="rgba(80,110,160,0.4)"
          strokeWidth="0.8"
        />
        <path
          d="M24,22 C32,16 42,18 43,28 C37,25 32,26 24,30 Z"
          fill={`url(#${g})`}
          stroke="rgba(80,110,160,0.4)"
          strokeWidth="0.8"
        />
      </svg>
    );

  if (id === "boots")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe486" />
            <stop offset="100%" stopColor="#e0a51c" />
          </linearGradient>
        </defs>
        <path
          d="M10,14 L22,14 L24,26 L40,30 Q44,31 44,35 L44,38 L8,38 Q6,38 6,34 L8,16 Q8,14 10,14 Z"
          fill={`url(#${g})`}
          stroke="#b9851a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="35" r="1.4" fill="#7a5a10" />
        <circle cx="22" cy="35" r="1.4" fill="#7a5a10" />
        <circle cx="30" cy="35" r="1.4" fill="#7a5a10" />
        <circle cx="38" cy="35" r="1.4" fill="#7a5a10" />
      </svg>
    );

  if (id === "aura")
    return (
      <svg {...common}>
        <defs>
          <radialGradient id={g} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(120,240,255,0.9)" />
            <stop offset="55%" stopColor="rgba(40,200,255,0.35)" />
            <stop offset="100%" stopColor="rgba(40,200,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={`url(#${g})`} />
        <circle
          cx="24"
          cy="24"
          r="15"
          fill="none"
          stroke="rgba(150,245,255,0.6)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <circle cx="24" cy="6" r="2" fill="#bff6ff" />
        <circle cx="42" cy="28" r="1.6" fill="#bff6ff" />
        <circle cx="8" cy="30" r="1.6" fill="#bff6ff" />
      </svg>
    );

  if (id === "halo")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff3b0" />
            <stop offset="100%" stopColor="#ffcf3a" />
          </linearGradient>
        </defs>
        <ellipse
          cx="24"
          cy="24"
          rx="20"
          ry="8"
          fill="none"
          stroke={`url(#${g})`}
          strokeWidth="4"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="20"
          ry="8"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
        <circle cx="24" cy="15" r="1.6" fill="#fff7c2" />
        <circle cx="40" cy="26" r="1.3" fill="#fff7c2" />
      </svg>
    );

  // star (마스터)
  return (
    <svg {...common}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0a0" />
          <stop offset="100%" stopColor="#ffc01e" />
        </linearGradient>
      </defs>
      <path
        d="M24,4 L29.5,17 L43,18 L32.5,27 L36,41 L24,33 L12,41 L15.5,27 L5,18 L18.5,17 Z"
        fill={`url(#${g})`}
        stroke="#e0a51c"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 캐릭터 위 아이템 배치 (스프라이트 100x100 기준)
const ITEM_PLACEMENT: Record<
  string,
  {
    size: number;
    top: number | string;
    z: number;
    center?: boolean;
    sway?: boolean;
  }
> = {
  // 코스튬은 캐릭터(z-index 1)보다 앞(z 2)에 그려 잘 보이게 한다
  // (SVG 캐릭터 size 78, bottom 정렬 기준 — DEV 버튼으로 보며 미세조정 가능)
  aura: { size: 100, top: "50%", z: 2, center: true },
  wings: { size: 86, top: 12, z: 2 },
  cape: { size: 60, top: 34, z: 2, sway: true },
  halo: { size: 46, top: -14, z: 2 },
  crown: { size: 24, top: 2, z: 2 },
  boots: { size: 28, top: 80, z: 2 },
  star: { size: 22, top: -8, z: 2 },
};

const CharacterItems: React.FC<{ clearCount: number }> = ({ clearCount }) => {
  const ids = getUnlockedItemIds(clearCount);
  if (!ids.length) return null;
  return (
    <>
      {ids.map((id) => {
        const p = ITEM_PLACEMENT[id];
        if (!p) return null;
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: "50%",
              top: p.top,
              width: p.size,
              height: p.size,
              transform: p.center
                ? "translate(-50%, -50%)"
                : "translateX(-50%)",
              transformOrigin: p.sway ? "top center" : "center",
              animation: p.sway
                ? "capeSway 2.6s ease-in-out infinite"
                : undefined,
              zIndex: p.z,
              pointerEvents: "none",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          >
            <ItemIcon id={id} size={p.size} />
          </div>
        );
      })}
    </>
  );
};

// ===== SVG 캐릭터 (뒷모습 달리기) =====
const RunnerCharacter: React.FC<{ size?: number }> = ({ size = 78 }) => {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}${uid}`;
  return (
    <svg
      width={size}
      height={(size * 104) / 80}
      viewBox="0 0 80 104"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7d5236" />
          <stop offset="100%" stopColor="#5c3820" />
        </linearGradient>
        <linearGradient id={id("shirt")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5491e0" />
          <stop offset="100%" stopColor="#356fc4" />
        </linearGradient>
        <linearGradient id={id("skin")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4bd9c" />
          <stop offset="100%" stopColor="#e3a078" />
        </linearGradient>
        <linearGradient id={id("shorts")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#36426c" />
          <stop offset="100%" stopColor="#242e4f" />
        </linearGradient>
        <linearGradient id={id("shoe")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#37c8b6" />
          <stop offset="100%" stopColor="#1f9286" />
        </linearGradient>
      </defs>

      <g className="runner-body">
        {/* ===== 다리 (앞으로 나가면 어두워짐 = brightness 애니) ===== */}
        <g className="runner-legL">
          <rect
            x="30"
            y="80"
            width="8"
            height="20"
            rx="4"
            fill={`url(#${id("skin")})`}
          />
          <rect
            x="30"
            y="80"
            width="2.6"
            height="20"
            rx="1.3"
            fill="#000"
            opacity="0.08"
          />
          {/* 양말 */}
          <rect x="30" y="95" width="8" height="3.6" rx="1.6" fill="#f4f7fb" />
          {/* 신발 */}
          <ellipse cx="34" cy="100.4" rx="6.6" ry="4.2" fill={`url(#${id("shoe")})`} />
          <ellipse cx="34" cy="102.5" rx="6.6" ry="1.7" fill="#ffffff" />
          <ellipse cx="31.6" cy="99" rx="2" ry="1.1" fill="#ffffff" opacity="0.5" />
        </g>
        <g className="runner-legR">
          <rect
            x="42"
            y="80"
            width="8"
            height="20"
            rx="4"
            fill={`url(#${id("skin")})`}
          />
          <rect
            x="42"
            y="80"
            width="2.6"
            height="20"
            rx="1.3"
            fill="#000"
            opacity="0.08"
          />
          <rect x="42" y="95" width="8" height="3.6" rx="1.6" fill="#f4f7fb" />
          <ellipse cx="46" cy="100.4" rx="6.6" ry="4.2" fill={`url(#${id("shoe")})`} />
          <ellipse cx="46" cy="102.5" rx="6.6" ry="1.7" fill="#ffffff" />
          <ellipse cx="43.6" cy="99" rx="2" ry="1.1" fill="#ffffff" opacity="0.5" />
        </g>

        {/* ===== 팔 (직각으로 굽힘 — 아래팔은 앞쪽/안쪽으로 들어가 몸통 뒤로 가려짐) ===== */}
        <g className="runner-armL">
          {/* 반소매 */}
          <rect x="21" y="45" width="8" height="9" rx="4" fill={`url(#${id("shirt")})`} />
          {/* 윗팔 (어깨→팔꿈치) */}
          <rect x="22" y="50" width="6" height="11" rx="3" fill={`url(#${id("skin")})`} />
          {/* 아래팔 (팔꿈치에서 앞쪽/안쪽으로 굽힘) */}
          <g transform="rotate(-52 25 60)">
            <rect x="22" y="58" width="6" height="9" rx="3" fill={`url(#${id("skin")})`} />
            <rect x="22" y="58" width="2" height="9" rx="1" fill="#000" opacity="0.08" />
            <circle cx="25" cy="66" r="3.2" fill={`url(#${id("skin")})`} />
          </g>
        </g>
        <g className="runner-armR">
          <rect x="51" y="45" width="8" height="9" rx="4" fill={`url(#${id("shirt")})`} />
          <rect x="52" y="50" width="6" height="11" rx="3" fill={`url(#${id("skin")})`} />
          <g transform="rotate(52 55 60)">
            <rect x="52" y="58" width="6" height="9" rx="3" fill={`url(#${id("skin")})`} />
            <rect x="56" y="58" width="2" height="9" rx="1" fill="#000" opacity="0.08" />
            <circle cx="55" cy="66" r="3.2" fill={`url(#${id("skin")})`} />
          </g>
        </g>

        {/* ===== 반바지 ===== */}
        <path
          d="M28,68 Q40,72 52,68 L51,83 Q46,86 43,83 L40,79 L37,83 Q34,86 29,83 Z"
          fill={`url(#${id("shorts")})`}
        />
        <path
          d="M28,68 Q40,72 52,68 L51.5,71 Q40,74.5 28.5,71 Z"
          fill="#ffffff"
          opacity="0.12"
        />
        <path d="M40,72 L40,80" stroke="#1c2440" strokeWidth="1" opacity="0.5" />

        {/* ===== 상의 ===== */}
        <path
          d="M27,46 C33,41 47,41 53,46 L51,72 C40,76 40,76 29,72 Z"
          fill={`url(#${id("shirt")})`}
        />
        {/* 어깨 하이라이트 */}
        <path
          d="M28,46 C34,42 46,42 52,46 L50.5,49 C45,45.6 35,45.6 29.5,49 Z"
          fill="#ffffff"
          opacity="0.16"
        />
        {/* 좌우 측면 음영 */}
        <path d="M27,46 C29,45 30,45 30.5,47 L29,71 L27.4,71 Z" fill="#000" opacity="0.1" />
        <path d="M53,46 C51,45 50,45 49.5,47 L51,71 L52.6,71 Z" fill="#000" opacity="0.1" />
        {/* 등 라인 */}
        <line x1="40" y1="47" x2="40" y2="71" stroke="#2b5aa8" strokeWidth="1" opacity="0.45" />
        {/* 밑단 음영 */}
        <path d="M29,71 C40,75 40,75 51,71 L50.6,73.4 C40,77 40,77 29.4,73.4 Z" fill="#000" opacity="0.1" />

        {/* ===== 목 ===== */}
        <rect x="35" y="39" width="10" height="8" rx="3" fill={`url(#${id("skin")})`} />
        <rect x="35" y="39" width="10" height="2.6" rx="1.3" fill="#000" opacity="0.18" />
        {/* 뒷목 넥라인(백 칼라) — 앞모습처럼 안 보이게 */}
        <path
          d="M33,45.5 Q40,48.5 47,45.5"
          fill="none"
          stroke="#2c5fa8"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* ===== 두상 베이스 ===== */}
        <ellipse cx="40" cy="26" rx="14.5" ry="15" fill={`url(#${id("skin")})`} />

        {/* ===== 귀 (머리카락 아래로 살짝) ===== */}
        <ellipse cx="24" cy="33" rx="2.6" ry="3.7" fill={`url(#${id("skin")})`} />
        <ellipse cx="56" cy="33" rx="2.6" ry="3.7" fill={`url(#${id("skin")})`} />
        <ellipse cx="24.2" cy="33.5" rx="1.1" ry="2" fill="#000" opacity="0.12" />
        <ellipse cx="55.8" cy="33.5" rx="1.1" ry="2" fill="#000" opacity="0.12" />

        {/* ===== 머리카락 (풍성한 뒤통수) ===== */}
        <path
          d="M40,5.5 C23,5.5 18,15 18,26 C18,31 20,35 23.5,36.5 Q32,38.5 40,37 Q48,38.5 56.5,36.5 C60,35 62,31 62,26 C62,15 57,5.5 40,5.5 Z"
          fill={`url(#${id("hair")})`}
        />
        {/* 정수리 하이라이트 (넓게) */}
        <ellipse cx="37" cy="14" rx="11" ry="6.5" fill="#9a6740" opacity="0.3" />
        {/* 결 텍스처 — 가마에서 사방으로 흐름 (어두운 결) */}
        <g
          stroke="#462914"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
          opacity="0.22"
        >
          <path d="M44,12 C37,17 30,24 26,34" />
          <path d="M44,12 C42,20 40,28 39,37" />
          <path d="M44,12 C49,17 53,23 55,33" />
          <path d="M40,8 C30,12 23,20 20,30" />
          <path d="M46,9 C54,13 59,21 60,30" />
          <path d="M44,12 C46,21 49,28 51,35" />
        </g>
        {/* 밝은 결 하이라이트 */}
        <g
          stroke="#a06d45"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        >
          <path d="M43,13 C38,18 33,25 30,34" />
          <path d="M45,13 C48,19 51,25 52,33" />
          <path d="M41,10 C34,14 28,21 26,30" />
        </g>
        {/* 가마(swirl) */}
        <path
          d="M44.5,12.5 C48,12.5 48,16 45,16.7 C42.5,17.1 41.8,14 44.5,12.5 Z"
          fill="#9a6740"
          opacity="0.5"
        />
      </g>
    </svg>
  );
};

const stageSettings: { values: number[]; rowCount: number }[] = [
  // ===== 2개짜리 문제 (쉬움) =====
  { values: [1, 2], rowCount: 2 },
  { values: [2, 3], rowCount: 2 },
  { values: [1, 3], rowCount: 2 },
  { values: [3, 4], rowCount: 2 },
  { values: [2, 4], rowCount: 2 },
  { values: [4, 5], rowCount: 2 },
  { values: [3, 5], rowCount: 2 },
  { values: [5, 6], rowCount: 2 },
  { values: [1, 2], rowCount: 3 },
  { values: [2, 3], rowCount: 3 },
  { values: [1, 3], rowCount: 3 },
  { values: [3, 4], rowCount: 3 },
  { values: [4, 5], rowCount: 3 },
  { values: [2, 5], rowCount: 3 },
  { values: [5, 6], rowCount: 3 },
  { values: [3, 6], rowCount: 3 },
  { values: [6, 7], rowCount: 3 },
  { values: [4, 6], rowCount: 3 },
  { values: [3, 6], rowCount: 4 },
  { values: [4, 7], rowCount: 4 },
  { values: [2, 5], rowCount: 4 },
  { values: [5, 8], rowCount: 4 },
  // ===== 3개짜리 문제 (보통 → 어려움) =====
  { values: [1, 2, 3], rowCount: 3 },
  { values: [2, 3, 4], rowCount: 3 },
  { values: [1, 3, 5], rowCount: 3 },
  { values: [2, 4, 6], rowCount: 3 },
  { values: [1, 2, 4], rowCount: 3 },
  { values: [1, 2, 3], rowCount: 4 },
  { values: [1, 2, 4], rowCount: 4 },
  { values: [2, 3, 4], rowCount: 4 },
  { values: [3, 4, 5], rowCount: 4 },
  { values: [2, 4, 6], rowCount: 4 },
  { values: [4, 5, 6], rowCount: 4 },
  { values: [1, 3, 5], rowCount: 4 },
  { values: [3, 5, 7], rowCount: 4 },
  { values: [1, 2, 3], rowCount: 5 },
  { values: [2, 3, 4], rowCount: 5 },
  { values: [3, 4, 5], rowCount: 5 },
  { values: [4, 5, 6], rowCount: 5 },
  { values: [1, 3, 5], rowCount: 5 },
  { values: [2, 4, 6], rowCount: 5 },
  { values: [2, 5, 8], rowCount: 5 },
  { values: [3, 7, 8], rowCount: 5 },
  { values: [4, 6, 7], rowCount: 5 },
  { values: [5, 8, 9], rowCount: 5 },
  { values: [6, 7, 8], rowCount: 5 },
  { values: [1, 2, 3], rowCount: 6 },
  { values: [2, 4, 6], rowCount: 6 },
  { values: [3, 4, 5], rowCount: 6 },
  { values: [4, 5, 6], rowCount: 6 },
  { values: [1, 3, 5], rowCount: 6 },
  { values: [5, 6, 7], rowCount: 6 },
  { values: [4, 6, 8], rowCount: 6 },
  { values: [6, 7, 8], rowCount: 6 },
  { values: [7, 8, 9], rowCount: 6 },
  { values: [1, 2, 3], rowCount: 7 },
  { values: [2, 3, 4], rowCount: 7 },
  { values: [3, 4, 5], rowCount: 7 },
  { values: [4, 5, 6], rowCount: 7 },
  { values: [2, 4, 6], rowCount: 7 },
  { values: [5, 7, 9], rowCount: 7 },
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
  const [player, setPlayer] = useState<Player>({ x: 2.5, value: 0 });
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
  const [paused, setPaused] = useState(false);
  const [sparkles, setSparkles] = useState<SparkleFx[]>([]);
  // 10클리어마다 축하 모달
  const [congrats, setCongrats] = useState<{ open: boolean; count: number }>({
    open: false,
    count: 0,
  });
  const [clearCount, setClearCount] = useState(0);
  const clearCountRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rowsRef = useRef<Row[]>([]);
  const latestX = useRef(player.x);
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
    latestX.current = player.x;
    latestValue.current = player.value;
  }, [player]);

  useEffect(() => {
    latestGoal.current = goalValues;
  }, [goalValues]);

  useEffect(() => {
    latestStage.current = stage;
  }, [stage]);

  const initStage = (
    stageIndex: number,
    isNewStage: boolean,
    continuous = false,
  ) => {
    const index = stageIndex % stageSettings.length;
    const { values, rowCount } = stageSettings[index];
    farYRef.current = -(rowCount * ROW_GAP + ROW_GAP * 2);
    // 연속 진행 중에는 진행 중인 프레임 흐름을 끊지 않는다
    if (!continuous) lastTimeRef.current = null;

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

    // 연속 진행 시에는 지평선 뒤쪽에서 흘러나오도록 한 칸 더 밀어준다
    const spawnBack = continuous ? STAGE_SPAWN_BACK : 0;
    const newRows: Row[] = [];
    for (let i = 0; i < rowCount; i++) {
      newRows.push({
        id: rowIdSeed++,
        y: -i * ROW_GAP - spawnBack,
        values: [...normalValues[i]],
        kind: "normal",
        handled: false,
        hitLane: null,
      });
    }
    newRows.push({
      id: rowIdSeed++,
      y: -rowCount * ROW_GAP - spawnBack,
      values: [goalA, goalB],
      kind: "goal",
      handled: false,
      hitLane: null,
      fadeOut: false,
    });

    if (continuous) {
      // 기존 행은 그대로 흘려보내고 다음 문제를 뒤에 이어 붙인다 → 끊김 없이 계속 달리는 느낌
      rowsRef.current = [...rowsRef.current, ...newRows];
      setRows(rowsRef.current);
      latestValue.current = 0;
      setPlayer((prev) => ({ ...prev, value: 0 }));
    } else {
      rowsRef.current = newRows;
      setRows(newRows);
      latestValue.current = 0;
      latestX.current = LANE_COUNT / 2;
      setPlayer((prev) => ({ ...prev, value: 0, x: LANE_COUNT / 2 }));
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initStage(0, true);
  }, []);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  useEffect(() => {
    const STEP = 0.55;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setPlayer((p) => ({ ...p, x: clamp(p.x - STEP, 0, LANE_COUNT) }));
      if (e.key === "ArrowRight")
        setPlayer((p) => ({ ...p, x: clamp(p.x + STEP, 0, LANE_COUNT) }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const movePlayerByTouchX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const xUnits = (xPx / rect.width) * LANE_COUNT;
    setPlayer((p) => ({ ...p, x: clamp(xUnits, 0, LANE_COUNT) }));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) =>
    movePlayerByTouchX(e.touches[0].clientX);
  const handleTouchEnd = () => {};

  const togglePause = () => {
    setPaused((p) => {
      if (!p) return true;
      lastTimeRef.current = null;
      return false;
    });
  };

  useEffect(() => {
    if (failBoardOpen || paused || congrats.open) return;
    let frameId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const HIT_RADIUS_Y = 0.06; // Y 근접 판정 범위
      const HIT_RADIUS_X = 0.65; // X 근접 판정 범위 (레인 단위)

      // ⚠️ 부수효과(setPlayer/setStage/...)를 setRows 업데이터 안에서 호출하면
      //    React StrictMode가 업데이터를 2번 실행하면서 값이 2배로 더해진다.
      //    따라서 rows 계산은 ref로 순수하게 처리하고, 상태 변경은 아래에서 한 번만 적용한다.
      const prev = rowsRef.current;
      const next: Row[] = [];
      const newSparkles: SparkleFx[] = [];
      let addValue = 0;
      let hitGoal = false;
      let success = false;
      const px = latestX.current;

      for (const row of prev) {
        const newY = row.y + ROW_SPEED * dt;

        // 화면 밖으로 나간 행 제거
        if (newY > 1.3) continue;

        // 이미 처리된 행은 Y만 갱신하고 그대로 진행
        if (row.handled) {
          next.push({ ...row, y: newY });
          continue;
        }

        // 근접 판정: Y가 플레이어 근처에 있는지
        const yClose = Math.abs(newY - PLAYER_Y) < HIT_RADIUS_Y;

        if (yClose) {
          if (row.kind === "normal") {
            // 각 레인의 숫자와 플레이어 X 거리 비교 → 가장 가까운 것 선택
            let bestLane = -1;
            let bestDist = Infinity;
            for (let li = 0; li < row.values.length; li++) {
              const laneCenterX = li + 0.5; // 레인 중심 (단위 좌표)
              const dist = Math.abs(px - laneCenterX);
              if (dist < HIT_RADIUS_X && dist < bestDist) {
                bestDist = dist;
                bestLane = li;
              }
            }
            if (bestLane >= 0) {
              const picked = row.values[bestLane];
              addValue += picked;
              newSparkles.push({
                id: sparkleIdSeed++,
                xUnits: bestLane + 0.5,
              });
              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: bestLane,
              });
              continue;
            }
          } else if (row.kind === "goal") {
            // goal: 왼쪽/오른쪽 영역에 닿으면 판정
            const goalHitRadiusX = LANE_COUNT * 0.35;
            const leftCenter = LANE_COUNT * 0.25;
            const rightCenter = LANE_COUNT * 0.75;
            const distL = Math.abs(px - leftCenter);
            const distR = Math.abs(px - rightCenter);

            if (distL < goalHitRadiusX || distR < goalHitRadiusX) {
              hitGoal = true;
              const optionIndex = distL <= distR ? 0 : 1;
              const chosenGoalNumber = row.values[optionIndex];
              const totalAfterHit = latestValue.current + addValue;
              success = totalAfterHit === chosenGoalNumber;
              // 통과 지점에 큰 반짝임 (성공 시 양옆으로 한 번 더)
              const goalXUnits = optionIndex === 0 ? leftCenter : rightCenter;
              newSparkles.push({
                id: sparkleIdSeed++,
                xUnits: goalXUnits,
                big: true,
              });
              if (totalAfterHit === chosenGoalNumber) {
                newSparkles.push({
                  id: sparkleIdSeed++,
                  xUnits: goalXUnits - 0.9,
                });
                newSparkles.push({
                  id: sparkleIdSeed++,
                  xUnits: goalXUnits + 0.9,
                });
              }
              next.push({
                ...row,
                y: newY,
                handled: true,
                hitLane: optionIndex,
              });
              continue;
            }
          }
        }

        next.push({ ...row, y: newY });
      }

      rowsRef.current = next;
      setRows(next);

      if (addValue > 0) {
        latestValue.current += addValue;
        setPlayer((prevPlayer) => ({
          ...prevPlayer,
          value: prevPlayer.value + addValue,
        }));
      }

      if (newSparkles.length) {
        setSparkles((prevFx) => [...prevFx, ...newSparkles]);
        const ids = newSparkles.map((s) => s.id);
        // 애니메이션이 끝나면 정리
        setTimeout(() => {
          setSparkles((prevFx) => prevFx.filter((s) => !ids.includes(s.id)));
        }, 650);
      }

      if (hitGoal) {
        if (success) {
          const nextStageIndex =
            (latestStage.current + 1) % stageSettings.length;
          setStage(nextStageIndex);
          initStage(nextStageIndex, true, true);

          // 클리어 카운트 → 10클리어마다 축하 모달 + 유니폼 업그레이드
          clearCountRef.current += 1;
          const cleared = clearCountRef.current;
          setClearCount(cleared);
          if (cleared % 10 === 0) {
            setCongrats({ open: true, count: cleared });
          }
        } else {
          setFailBoardOpen(true);
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [failBoardOpen, paused, congrats.open]);

  const laneWidth = WIDTH / LANE_COUNT;
  const xUnitsToPx = (xUnits: number) => (xUnits / LANE_COUNT) * WIDTH;

  const handleRetry = () => {
    setFailBoardOpen(false);
    initStage(latestStage.current, false);
  };

  // 축하 모달 "계속하기" → 끊김 없이 이어서 진행
  const handleCongratsContinue = () => {
    lastTimeRef.current = null;
    setCongrats((c) => ({ ...c, open: false }));
  };

  // 🔧 [임시/테스트] 한 번에 10클리어씩 점프 — 코스튬 확인용 (배포 전 삭제)
  const handleTestSkip = () => {
    const next = clearCountRef.current + 10;
    clearCountRef.current = next;
    setClearCount(next);
    setCongrats({ open: true, count: next });
  };

  // 드리블 공 크기 (숫자는 머리 위 뱃지로 표시하므로 작은 고정 크기)
  const balloonSize = 30;

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

      <BackButton onExit={onExit} onPause={togglePause} isPaused={paused} />

      {/* 🔧 [임시] 코스튬 미리보기용 +10 버튼 (배포 전 제거) */}
      <button
        onClick={handleTestSkip}
        style={{
          position: "absolute",
          bottom: "max(12px, env(safe-area-inset-bottom))",
          left: 12,
          zIndex: 60,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px dashed rgba(255,255,255,0.7)",
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          fontFamily: "Fredoka",
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        DEV +10 (클리어 {clearCount})
      </button>

      {/* HUD - STAGE 배지 */}
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 4px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 16px",
          borderRadius: 999,
          background:
            "linear-gradient(180deg, rgba(22,32,64,0.8), rgba(12,20,44,0.8))",
          border: "2px solid rgba(255,210,74,0.85)",
          boxShadow:
            "0 4px 14px rgba(0,0,0,0.35), inset 0 0 12px rgba(255,210,74,0.12)",
          backdropFilter: "blur(4px)",
        }}
      >
        <span
          style={{
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: "clamp(9px, 2.4vw, 11px)",
            letterSpacing: 1,
            color: "#ffd24a",
          }}
        >
          STAGE
        </span>
        <span
          style={{
            fontFamily: "Fredoka",
            fontWeight: 900,
            fontSize: "clamp(18px, 4.6vw, 24px)",
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {stage + 1}
        </span>
      </div>

      {/* HUD - 목표 */}
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 48px)",
          left: 10,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(12,20,44,0.62)",
            border: "1px solid rgba(255,255,255,0.18)",
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: "clamp(9px, 2.6vw, 11px)",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          🎯 목표
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {goalValues.map((g, i) => (
            <div
              key={i}
              style={{
                minWidth: 28,
                height: 28,
                padding: "0 6px",
                borderRadius: 8,
                background: "linear-gradient(180deg, #ff8a3d, #f4631e)",
                border: "2px solid rgba(255,255,255,0.5)",
                boxShadow: "0 3px 8px rgba(244,99,30,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Fredoka",
                fontWeight: 900,
                fontSize: "clamp(14px, 4vw, 17px)",
                color: "#fff",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              {g}
            </div>
          ))}
        </div>
      </div>

      {/* HUD - 현재 합계 */}
      <div
        style={{
          position: "absolute",
          top: "calc(max(8px, env(safe-area-inset-top)) + 48px)",
          right: 10,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(12,20,44,0.62)",
            border: "1px solid rgba(255,255,255,0.18)",
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: "clamp(9px, 2.6vw, 11px)",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          현재
        </div>
        <div
          style={{
            minWidth: 36,
            height: 30,
            padding: "0 10px",
            borderRadius: 9,
            background: "linear-gradient(180deg, #34d399, #059669)",
            border: "2px solid rgba(255,255,255,0.55)",
            boxShadow: "0 3px 10px rgba(5,150,105,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Fredoka",
            fontWeight: 900,
            fontSize: "clamp(16px, 4.4vw, 20px)",
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          {player.value}
        </div>
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
                opacity: depthAlpha,
                zIndex: 10,
              }}
            >
              {/* 통과 시 goal 행 전체가 함께 사라진다 (움직임은 그대로) */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: row.handled ? 0 : 1,
                  transition: "opacity 0.4s ease",
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

          // 한 칸이라도 먹으면 그 행 전체가 함께 사라진다
          const eaten = row.handled === true;

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
                // 깊이감만 담당 (매 프레임 갱신, transition 없음)
                opacity: depthAlpha,
                filter: `drop-shadow(0 4px 12px rgba(255,200,100,${glowAlpha}))`,
                zIndex: 10,
              }}
            >
              {/* 먹힘 페이드는 별도 레이어에서 처리 → 행의 자리·크기·움직임은 그대로, 숫자만 사라짐 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: eaten ? 0 : 1,
                  transition: "opacity 0.4s ease",
                }}
              >
                <DigitNumber value={v} size={56} />
              </div>
            </div>
          );
        });
      })}

      {/* ===== Sparkle FX (숫자 / goal 통과) ===== */}
      {sparkles.map((s) => {
        const size = s.big ? 120 : 64;
        return (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: xUnitsToPx(s.xUnits),
              top: playerLinePx,
              width: size,
              height: size,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 25,
            }}
          >
            <SparkleBurst size={size} />
          </div>
        );
      })}

      {/* ===== Player ===== */}
      {(() => {
        const x = xUnitsToPx(player.x);
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
            {/* 머리 위 숫자 뱃지 (현재 합계) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -36,
                transform: "translateX(-50%)",
                zIndex: 6,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  minWidth: 34,
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: "linear-gradient(180deg, #ffffff, #e7edf5)",
                  border: "3px solid #2b3a67",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Fredoka",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#1b2452",
                  lineHeight: 1,
                }}
              >
                {player.value}
              </div>
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "7px solid #2b3a67",
                  marginTop: -1,
                }}
              />
            </div>

            {/* Dribble ground shadow (공보다 먼저 그려 지면에 깔리도록) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: balloonSize * 0.2 - 2,
                width: balloonSize * 0.7,
                height: 8,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%)",
                transform: "translateX(-50%)",
                animation: "ballShadow 380ms ease-in-out infinite",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            {/* Soccer Ball (발 앞에서 드리블, 캐릭터보다 뒤) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: balloonSize * 0.2,
                width: balloonSize,
                height: balloonSize,
                transformOrigin: "center bottom",
                animation: "ballDribble 380ms ease-in-out infinite",
                pointerEvents: "none",
                userSelect: "none",
                filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.25))",
                zIndex: 0,
              }}
              className="player-balloon"
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  animation: "ballSpin 380ms ease-in-out infinite",
                }}
              >
                <SoccerBall size={balloonSize} />
              </div>
            </div>

            {/* Character + 코스튬 아이템 (아이템이 캐릭터보다 앞에 보이도록) */}
            <div
              style={{
                position: "relative",
                width: 100,
                height: 100,
                display: "flex",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 0,
                  transform: "translateX(-50%)",
                  zIndex: 1,
                }}
              >
                <RunnerCharacter size={78} />
              </div>
              <CharacterItems clearCount={clearCount} />
            </div>

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

      {/* ===== 10클리어 축하 모달 ===== */}
      {congrats.open && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 350,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(86%, 340px)",
              padding: "30px 24px 26px",
              borderRadius: 22,
              textAlign: "center",
              color: "#fff",
              background: "linear-gradient(180deg, #1b2452 0%, #121a3a 100%)",
              border: "3px solid #ffd24a",
              boxShadow:
                "0 18px 48px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,210,74,0.12), inset 0 0 28px rgba(255,210,74,0.08)",
              animation: "congratsPop 0.45s cubic-bezier(0.18,0.9,0.3,1.2)",
            }}
          >
            {/* 반짝이는 장식 */}
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 30,
              }}
            >
              🎉
            </div>

            <div
              style={{
                fontSize: 54,
                lineHeight: 1,
                marginBottom: 10,
                animation: "trophyBounce 1.6s ease-in-out infinite",
              }}
            >
              🏆
            </div>

            <div
              style={{
                fontFamily: "Fredoka",
                fontWeight: 900,
                fontSize: "clamp(22px, 6vw, 28px)",
                color: "#ffd24a",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                marginBottom: 6,
              }}
            >
              축하합니다!
            </div>

            <div
              style={{
                fontFamily: "Fredoka",
                fontWeight: 700,
                fontSize: "clamp(14px, 4vw, 17px)",
                color: "rgba(255,255,255,0.92)",
                marginBottom: 14,
              }}
            >
              {congrats.count} 스테이지 클리어! 🔥
            </div>

            {/* 획득 아이템 안내 (디자인된 아이콘 표시) */}
            {(() => {
              const reward = getReward(congrats.count);
              if (!reward) return null;
              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 84,
                      height: 84,
                      borderRadius: 18,
                      background:
                        "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
                      border: "2px solid rgba(255,255,255,0.3)",
                      boxShadow: `0 0 22px ${reward.glow}, inset 0 0 18px ${reward.glow}`,
                      animation: "trophyBounce 1.8s ease-in-out infinite",
                    }}
                  >
                    <ItemIcon id={reward.id} size={56} />
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      fontFamily: "Fredoka",
                      fontWeight: 900,
                      fontSize: "clamp(13px, 3.6vw, 16px)",
                      color: "#ffd24a",
                    }}
                  >
                    🎁 {reward.name} 획득!
                  </div>
                </div>
              );
            })()}

            <button
              onClick={handleCongratsContinue}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 14,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(15px, 4vw, 18px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #34d399, #059669)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(5,150,105,0.45)",
              }}
            >
              계속하기
            </button>
          </div>
        </div>
      )}

      {/* ===== Pause overlay ===== */}
      {paused && !failBoardOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            padding: 24,
            gap: 10,
            zIndex: 300,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>⏸️</div>
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
            }}
          >
            PAUSED
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={togglePause}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #34d399, #059669)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              계속하기
            </button>
            <button
              onClick={handleRetry}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              다시 시작
            </button>
          </div>
        </div>
      )}

      {/* ===== Fail overlay ===== */}
      {failBoardOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            padding: 24,
            gap: 10,
            zIndex: 300,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>💀</div>
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 900,
              fontFamily: "Fredoka",
            }}
          >
            GAME OVER
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              opacity: 0.9,
              fontFamily: "Fredoka",
              marginBottom: 10,
            }}
          >
            STAGE {stage + 1}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleRetry}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              다시 도전
            </button>
            <button
              onClick={onExit}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "Fredoka",
                background: "linear-gradient(180deg, #6b7280, #374151)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberLaneGame;
