import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import DigitIcon from "./DigitIcon";
import BackButton from "components/item/BackButton";

const LANE_COUNT = 5;
const PLAYER_Y = 0.8;
const ROW_SPEED = 0.2;
const ROW_GAP = 0.2;
// 스테이지 통과 시 다음 문제를 지평선 뒤쪽에서 흘러나오게 밀어주는 거리
const STAGE_SPAWN_BACK = ROW_GAP * 2;

// ===== 배경 분위기 8단계 (10클리어마다 전환, 하루 한 바퀴) =====
type BgTheme = {
  base: string;
  sky: string;
  orb: string;
  orbGlow: string;
  isMoon?: boolean;
  cloudOpacity: number;
  overlay: string;
  stars: boolean;
};

const BG_THEMES: BgTheme[] = [
  {
    // 0 한낮
    base: "#7ab0c8",
    sky: "linear-gradient(180deg, #7ab0c8 0%, #5a98b0 45%, #4a88a0 100%)",
    orb: "radial-gradient(circle, #f7ecae 20%, #e6d278 55%, #c8ad58 80%, transparent 100%)",
    orbGlow: "0 0 24px rgba(240,225,120,0.45), 0 0 48px rgba(210,190,80,0.18)",
    cloudOpacity: 1,
    overlay: "rgba(0,0,0,0)",
    stars: false,
  },
  {
    // 1 오후
    base: "#9ab3a0",
    sky: "linear-gradient(180deg, #9cc0c2 0%, #c8c08c 55%, #e2c878 100%)",
    orb: "radial-gradient(circle, #fff0b0 20%, #ffd878 55%, #e0a850 80%, transparent 100%)",
    orbGlow: "0 0 28px rgba(255,210,110,0.5), 0 0 54px rgba(230,170,70,0.2)",
    cloudOpacity: 0.92,
    overlay: "rgba(255,190,90,0.1)",
    stars: false,
  },
  {
    // 2 노을
    base: "#d98a6a",
    sky: "linear-gradient(180deg, #ffa45c 0%, #ff7e6b 50%, #b9577e 100%)",
    orb: "radial-gradient(circle, #fff2b0 18%, #ffcf6a 50%, #ff9a4a 78%, transparent 100%)",
    orbGlow: "0 0 36px rgba(255,160,70,0.6), 0 0 70px rgba(255,120,50,0.3)",
    cloudOpacity: 0.8,
    overlay: "rgba(255,110,50,0.12)",
    stars: false,
  },
  {
    // 3 황혼
    base: "#5a4a82",
    sky: "linear-gradient(180deg, #7a5fa6 0%, #9a5a8e 50%, #46365f 100%)",
    orb: "radial-gradient(circle, #ffd9b8 20%, #ffb088 55%, #d98a6a 80%, transparent 100%)",
    orbGlow: "0 0 30px rgba(255,170,120,0.45), 0 0 60px rgba(200,120,160,0.25)",
    cloudOpacity: 0.5,
    overlay: "rgba(90,60,130,0.2)",
    stars: true,
  },
  {
    // 4 밤
    base: "#16234d",
    sky: "linear-gradient(180deg, #1d2f5e 0%, #243a66 50%, #16213f 100%)",
    orb: "radial-gradient(circle, #f4f3e6 30%, #dcdcc8 70%, #b8b8a0 90%, transparent 100%)",
    orbGlow: "0 0 26px rgba(240,240,220,0.5), 0 0 52px rgba(200,210,255,0.2)",
    isMoon: true,
    cloudOpacity: 0.3,
    overlay: "rgba(18,28,72,0.28)",
    stars: true,
  },
  {
    // 5 심야
    base: "#080f28",
    sky: "linear-gradient(180deg, #0c1636 0%, #131c40 50%, #060a1e 100%)",
    orb: "radial-gradient(circle, #ececf2 30%, #d2d2e0 70%, #aaaac0 90%, transparent 100%)",
    orbGlow: "0 0 22px rgba(235,235,245,0.45), 0 0 48px rgba(180,190,240,0.2)",
    isMoon: true,
    cloudOpacity: 0.18,
    overlay: "rgba(8,12,40,0.4)",
    stars: true,
  },
  {
    // 6 새벽
    base: "#7a6e9a",
    sky: "linear-gradient(180deg, #8a7fb0 0%, #c19ab0 55%, #f0cfb0 100%)",
    orb: "radial-gradient(circle, #ffe8c0 20%, #ffc890 55%, #f0a070 80%, transparent 100%)",
    orbGlow: "0 0 28px rgba(255,200,140,0.45), 0 0 56px rgba(220,150,180,0.2)",
    cloudOpacity: 0.55,
    overlay: "rgba(150,120,180,0.1)",
    stars: false,
  },
  {
    // 7 아침
    base: "#88c0d8",
    sky: "linear-gradient(180deg, #8ecae6 0%, #b8e2ee 55%, #dcf0e6 100%)",
    orb: "radial-gradient(circle, #fff6cc 20%, #ffe890 55%, #f0c860 80%, transparent 100%)",
    orbGlow: "0 0 30px rgba(255,235,140,0.5), 0 0 58px rgba(240,200,90,0.2)",
    cloudOpacity: 1,
    overlay: "rgba(0,0,0,0)",
    stars: false,
  },
];

// 밤하늘 별
const NIGHT_STARS = [
  { x: "12%", y: "8%", s: 2 },
  { x: "22%", y: "15%", s: 1.5 },
  { x: "35%", y: "6%", s: 2 },
  { x: "48%", y: "12%", s: 1.5 },
  { x: "62%", y: "7%", s: 2 },
  { x: "74%", y: "14%", s: 1.5 },
  { x: "86%", y: "9%", s: 2 },
  { x: "18%", y: "22%", s: 1.5 },
  { x: "55%", y: "19%", s: 1 },
  { x: "80%", y: "21%", s: 1.5 },
  { x: "40%", y: "17%", s: 1 },
  { x: "68%", y: "23%", s: 1 },
];

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
      <radialGradient id="soccerBody" cx="37%" cy="31%" r="64%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="62%" stopColor="#f1f1f1" />
        <stop offset="100%" stopColor="#c9c9c9" />
      </radialGradient>
    </defs>
    {/* 공 본체 */}
    <circle
      cx="50"
      cy="50"
      r="48"
      fill="url(#soccerBody)"
      stroke="#a6a6a6"
      strokeWidth="1.5"
    />
    <g style={{ clipPath: "circle(47% at 50% 50%)" }}>
      {/* 솔기 (오각형을 잇는 선) */}
      <g
        fill="none"
        stroke="rgba(20,20,20,0.16)"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M50,34 L50,3" />
        <path d="M65.2,45.1 L94.7,35.5" />
        <path d="M59.4,62.9 L77.6,88" />
        <path d="M40.6,62.9 L22.4,88" />
        <path d="M34.8,45.1 L5.3,35.5" />
      </g>
      {/* 검정 오각형 (정중앙 + 가장자리 5개) */}
      <g
        fill="#232323"
        stroke="#141414"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
        <path d="M50,34 L65.2,45.1 L59.4,62.9 L40.6,62.9 L34.8,45.1 Z" />
        <path d="M50,80 L63.3,89.7 L58.2,105.3 L41.8,105.3 L36.7,89.7 Z" />
        <path d="M78.5,59.3 L83.6,74.9 L100,74.9 L105.1,59.3 L91.8,49.6 Z" />
        <path d="M67.7,25.7 L84.1,25.7 L89.2,10.1 L75.9,0.4 L62.6,10.1 Z" />
        <path d="M32.3,25.7 L37.4,10.1 L24.1,0.4 L10.8,10.1 L15.9,25.7 Z" />
        <path d="M21.5,59.3 L8.2,49.6 L-5.1,59.3 L0,74.9 L16.4,74.9 Z" />
      </g>
    </g>
    {/* 광택 하이라이트 */}
    <ellipse cx="37" cy="33" rx="13" ry="9" fill="rgba(255,255,255,0.45)" />
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

// ===== 선물상자 (축하 모달용, 흔들흔들) =====
const GiftBox: React.FC<{ size?: number }> = ({ size = 150 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ display: "block", overflow: "visible" }}
  >
    {/* 바닥 그림자 */}
    <ellipse cx="50" cy="93" rx="34" ry="4" fill="rgba(0,0,0,0.18)" />

    {/* ===== 상자 본체 ===== */}
    <rect x="21" y="47" width="40" height="41" rx="1.5" fill="#ec6a52" />
    <rect x="61" y="47" width="18" height="41" rx="1.5" fill="#9e3b3b" />
    <rect x="21" y="82" width="40" height="6" fill="#000" opacity="0.05" />

    {/* ===== 뚜껑 ===== */}
    <rect x="15" y="35" width="48" height="14" rx="2" fill="#e85f48" />
    <rect x="61" y="35" width="24" height="14" rx="2" fill="#8a3433" />
    <rect
      x="15"
      y="35"
      width="48"
      height="3"
      rx="1.5"
      fill="#ffffff"
      opacity="0.12"
    />

    {/* ===== 세로 리본 ===== */}
    <rect x="37" y="35" width="9" height="53" fill="#f3c64e" />
    <rect x="37" y="35" width="2.6" height="53" fill="#ffffff" opacity="0.3" />
    <rect x="67" y="35" width="8" height="53" fill="#d99f33" />
    <rect x="67" y="35" width="2.2" height="53" fill="#f3c64e" />

    {/* ===== 리본 보우 ===== */}
    <path
      d="M42,33 C30,34 22,24 27,17 C32,12 41,18 44,31 Z"
      fill="#f6cf5e"
      stroke="#e0a838"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <path
      d="M42,33 C34,32 28,26 28,20 C33,24 39,28 44,31 Z"
      fill="#e0a838"
      opacity="0.55"
    />
    <path
      d="M48,33 C60,34 68,24 63,17 C58,12 49,18 46,31 Z"
      fill="#f6cf5e"
      stroke="#e0a838"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <path
      d="M48,33 C56,32 62,26 62,20 C57,24 51,28 46,31 Z"
      fill="#e0a838"
      opacity="0.55"
    />
    <rect
      x="42"
      y="28"
      width="8"
      height="9"
      rx="2.5"
      fill="#f6cf5e"
      stroke="#e0a838"
      strokeWidth="0.8"
    />

    {/* ===== 반짝임 ===== */}
    {[
      { x: 15, y: 21, s: 4 },
      { x: 11, y: 41, s: 3 },
      { x: 87, y: 30, s: 4 },
      { x: 85, y: 55, s: 3 },
    ].map((p, i) => (
      <path
        key={i}
        d={`M${p.x},${p.y - p.s} Q${p.x},${p.y} ${p.x + p.s},${p.y} Q${p.x},${p.y} ${p.x},${p.y + p.s} Q${p.x},${p.y} ${p.x - p.s},${p.y} Q${p.x},${p.y} ${p.x},${p.y - p.s} Z`}
        fill="#f6cf5e"
      />
    ))}
  </svg>
);

// ===== 공용 모달 (축하/일시정지/게임오버 통일 디자인) =====
const MODAL_BTN_BASE: React.CSSProperties = {
  padding: "13px 18px",
  borderRadius: 14,
  border: "none",
  fontWeight: 900,
  fontSize: "clamp(14px, 3.8vw, 17px)",
  fontFamily: "Fredoka",
  color: "#fff",
  cursor: "pointer",
  flex: 1,
};
const MODAL_BTN = {
  green: {
    ...MODAL_BTN_BASE,
    background: "linear-gradient(180deg,#34d399,#059669)",
    boxShadow: "0 8px 18px rgba(5,150,105,0.4)",
  },
  blue: {
    ...MODAL_BTN_BASE,
    background: "linear-gradient(180deg,#60a5fa,#2563eb)",
    boxShadow: "0 8px 18px rgba(37,99,235,0.4)",
  },
  gray: {
    ...MODAL_BTN_BASE,
    background: "linear-gradient(180deg,#6b7280,#374151)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
  },
} as const;

const GameModal: React.FC<{
  accent: string;
  icon: string;
  title: string;
  subtitle?: string;
  zIndex?: number;
  children?: React.ReactNode;
}> = ({ accent, icon, title, subtitle, zIndex = 300, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(6,10,24,0.72)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      zIndex,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "min(86%, 340px)",
        padding: "36px 24px 24px",
        borderRadius: 24,
        textAlign: "center",
        color: "#fff",
        background: "linear-gradient(180deg, #1b2452 0%, #121a3a 100%)",
        border: `3px solid ${accent}`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 0 6px ${accent}22, inset 0 0 30px ${accent}12`,
        animation: "congratsPop 0.42s cubic-bezier(0.18,0.9,0.3,1.2)",
      }}
    >
      {/* 아이콘 배지 */}
      <div
        style={{
          position: "absolute",
          top: -27,
          left: "50%",
          transform: "translateX(-50%)",
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 35%, ${accent}, ${accent}cc)`,
          border: "3px solid #121a3a",
          boxShadow: `0 6px 16px ${accent}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 27,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "Fredoka",
          fontWeight: 900,
          fontSize: "clamp(21px, 5.6vw, 27px)",
          color: accent,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          marginTop: 4,
          marginBottom: subtitle ? 4 : 18,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: "clamp(13px, 3.6vw, 15px)",
            color: "rgba(255,255,255,0.82)",
            marginBottom: 18,
          }}
        >
          {subtitle}
        </div>
      )}
      {children}
    </div>
  </div>
);

// ===== 축구 유니폼 보상 (10클리어마다 한 피스씩 착용) =====
type RewardItem = { id: string; name: string; at: number; glow: string };

const REWARD_ITEMS: RewardItem[] = [
  {
    id: "jersey",
    name: "손흥민 유니폼 상의",
    at: 10,
    glow: "rgba(212,175,55,0.55)",
  },
  { id: "shorts", name: "손흥민 하의", at: 20, glow: "rgba(212,175,55,0.5)" },
  { id: "boots", name: "손흥민 축구화", at: 30, glow: "rgba(255,205,70,0.55)" },
  { id: "socks", name: "손흥민 양말", at: 40, glow: "rgba(255,205,70,0.5)" },
  {
    id: "hair",
    name: "손흥민 헤어스타일",
    at: 50,
    glow: "rgba(120,170,255,0.45)",
  },
  { id: "flame", name: "열정의 오라", at: 60, glow: "rgba(255,190,70,0.6)" },
];

// 이번 마일스톤(정확히 N의 배수)에 획득한 보상
function getReward(count: number): RewardItem | null {
  return REWARD_ITEMS.find((it) => it.at === count) ?? null;
}

// 현재까지 착용한 유니폼 슬롯
function getEquipped(clearCount: number): Set<string> {
  return new Set(
    REWARD_ITEMS.filter((it) => clearCount >= it.at).map((it) => it.id),
  );
}

// 아이템 SVG 아이콘 (모달용) — 블랙&골드 축구 키트
const ItemIcon: React.FC<{ id: string; size?: number }> = ({
  id,
  size = 48,
}) => {
  const uid = useId().replace(/:/g, "");
  const g = `g${uid}`; // 골드
  const gb = `b${uid}`; // 블랙
  const common = { width: size, height: size, viewBox: "0 0 48 48" } as const;
  const Defs = () => (
    <defs>
      <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f6df9a" />
        <stop offset="100%" stopColor="#caa23c" />
      </linearGradient>
      <linearGradient id={gb} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a3a3a" />
        <stop offset="100%" stopColor="#121212" />
      </linearGradient>
    </defs>
  );

  if (id === "jersey")
    return (
      <svg {...common}>
        <Defs />
        {/* 유니폼 상의 (뒷면) */}
        <path
          d="M10,13 L18,8 Q24,11 30,8 L38,13 L34,18 L33,40 L15,40 L14,18 Z"
          fill={`url(#${gb})`}
          stroke="#000"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {/* 골드 깃/소매 트림 */}
        <path
          d="M18,8 Q24,12 30,8"
          fill="none"
          stroke={`url(#${g})`}
          strokeWidth="1.8"
        />
        <path
          d="M10,13 L14,18 M38,13 L34,18"
          stroke={`url(#${g})`}
          strokeWidth="1.4"
        />
        {/* RYU + 등번호 12 */}
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fontSize="4.6"
          fontWeight="900"
          fontFamily="Fredoka"
          fill={`url(#${g})`}
        >
          RYU
        </text>
        <text
          x="24"
          y="36"
          textAnchor="middle"
          fontSize="15"
          fontWeight="900"
          fontFamily="'Archivo Black',sans-serif"
          fill={`url(#${g})`}
        >
          12
        </text>
      </svg>
    );

  if (id === "shorts")
    return (
      <svg {...common}>
        <Defs />
        <path
          d="M10,14 L38,14 L35,32 Q29,35 27,30 L24,24 L21,30 Q19,35 13,32 Z"
          fill={`url(#${gb})`}
          stroke="#000"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <rect
          x="10"
          y="12"
          width="28"
          height="3.4"
          rx="1.7"
          fill={`url(#${g})`}
        />
        <path
          d="M14,17 L13,31 M34,17 L35,31"
          stroke={`url(#${g})`}
          strokeWidth="1.2"
          opacity="0.85"
        />
      </svg>
    );

  if (id === "boots")
    return (
      <svg {...common}>
        <Defs />
        {/* 사이드 프로필 축구화(클리트) */}
        <path
          d="M6,30 C6,26 9,24 14,24 L22,24 C24,24 25,26 26,28 L40,30 C44,30.5 45,32 45,35 L45,37 C45,38 44,38.6 42,38.6 L9,38.6 C7,38.6 6,37.6 6,35 Z"
          fill={`url(#${g})`}
          stroke="#8a6d1e"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* 발목/힐 음영 */}
        <path
          d="M6,30 C6,26 9,24 14,24 L16,24 L16,33 L6,33 Z"
          fill="#caa23c"
          opacity="0.45"
        />
        {/* 발등 하이라이트 */}
        <ellipse cx="13" cy="27" rx="4" ry="1.6" fill="#fff" opacity="0.4" />
        {/* 검정 스트라이프 */}
        <path
          d="M10,31 C18,33 30,33 42,32"
          stroke="#161616"
          strokeWidth="2.2"
          fill="none"
          opacity="0.8"
        />
        {/* 끈 */}
        <g stroke="#161616" strokeWidth="0.9" opacity="0.6">
          <path d="M17,26 L21,29" />
          <path d="M20,26 L24,29" />
          <path d="M23,26.5 L27,29.5" />
        </g>
        {/* 밑창 + 스터드 */}
        <path
          d="M6,37 L45,37 L45,39 C45,40.5 43,41 41,41 L9,41 C7,41 6,40 6,38.5 Z"
          fill="#fff"
        />
        <rect x="9" y="40.5" width="3" height="3" rx="1" fill="#dfe6ee" />
        <rect x="18" y="41" width="3" height="3" rx="1" fill="#dfe6ee" />
        <rect x="28" y="41" width="3" height="3" rx="1" fill="#dfe6ee" />
        <rect x="38" y="40.5" width="3" height="3" rx="1" fill="#dfe6ee" />
      </svg>
    );

  if (id === "socks")
    return (
      <svg {...common}>
        <Defs />
        <path
          d="M17,7 L31,7 L30,30 Q30,37 24,37 Q18,37 18,30 Z"
          fill={`url(#${g})`}
          stroke="#8a6d1e"
          strokeWidth="0.8"
        />
        <rect x="17" y="7" width="14" height="4" rx="2" fill="#1a1a1a" />
        <rect
          x="17"
          y="13"
          width="14"
          height="1.6"
          fill="#1a1a1a"
          opacity="0.55"
        />
        <path
          d="M18,30 Q24,33 30,30"
          fill="none"
          stroke="#fff"
          strokeWidth="0.8"
          opacity="0.5"
        />
      </svg>
    );

  if (id === "hair")
    return (
      <svg {...common}>
        {/* 손흥민 헤어 (정면 두상 + 2겹 헤어) */}
        <g transform="translate(4.4,4) scale(0.42)">
          <ellipse cx="45.8" cy="59.7" rx="25.9" ry="25.2" fill="#f09f7a" />
          <path
            d="M20.6,55.8s-2.5-6.8-5.9-3.6,0,11.2,0,11.2c0,0,2.7,8.5,5.9,7.7,3.2-.8,0-15.3,0-15.3Z"
            fill="#f09f7a"
          />
          <path
            d="M71.6,54s2.5-6.8,5.9-3.6,0,11.2,0,11.2c0,0-2.7,8.5-5.9,7.7-3.2-.8,0-15.3,0-15.3Z"
            fill="#f09f7a"
          />
          <path
            d="M22.1,62.5c3,5.7,5.3,14.2,7.3,15.5,2.7,1.8,31,2,33.1-.9,1.7-2.3,5.2-8.1,8.7-14-4.3,1.4-14.9,4.6-23.9,4.6s-23.4-4.5-25.3-5.2Z"
            fill="#66432a"
          />
          <path
            d="M81.4,38.2c-.5-1.2-3.7.4-3.1-2.7.6-3,.8-4.1-1.5-2.9-2.3,1.2,0-2.3,1.2-6.4,1.2-4.1-2.2-4.5-8.9-4.1,1-3-5.6-18.4-11.5-16.6,3,2,0,8.2,0,8.2,0,0-.7-1.1-7.5-4.5-6.8-3.4-9.1-4.8-6.4,1.4-11.6-3.7-27.6,10-31.7,11.8-4.1,1.8-4.8,3.6,3.2,3.7-6.4,2.1-5.9,7.1-5.9,7.1,0,0,4.6-2,5.9.7-9.1,13.4,2.6,23.4,3.1,23.7,1.3.8,2.6,2.6,3.7,4.7,1.8.7,14.6,5.2,25.3,5.2s19.6-3.2,23.9-4.6c.8-1.4,1.7-2.8,2.5-4.2,4.1-7.1,8.2-19.4,7.8-20.7Z"
            fill="#4d311b"
          />
        </g>
      </svg>
    );

  // flame (열정의 오라) — 스파클 버스트
  return (
    <svg {...common}>
      <defs>
        <radialGradient id={g} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,220,120,0.6)" />
          <stop offset="100%" stopColor="rgba(255,180,60,0)" />
        </radialGradient>
      </defs>
      {/* 따뜻한 글로우 */}
      <circle cx="24" cy="24" r="22" fill={`url(#${g})`} />
      {/* 큰 4점 스파클 */}
      <path
        d="M24,4 L28,20 L44,24 L28,28 L24,44 L20,28 L4,24 L20,20 Z"
        fill="#ffd66a"
      />
      {/* 작은 스파클 */}
      <path
        d="M38,9 L40,13.5 L44.5,15.5 L40,17.5 L38,22 L36,17.5 L31.5,15.5 L36,13.5 Z"
        fill="#fff0b0"
      />
      <path
        d="M11,30 L12.4,33.2 L15.6,34.6 L12.4,36 L11,39.2 L9.6,36 L6.4,34.6 L9.6,33.2 Z"
        fill="#fff0b0"
      />
    </svg>
  );
};

// ===== SVG 캐릭터 (뒷모습 달리기 + 축구 유니폼 착용) =====
const RunnerCharacter: React.FC<{ size?: number; clearCount?: number }> = ({
  size = 78,
  clearCount = 0,
}) => {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}${uid}`;
  const u = (n: string) => `url(#${id(n)})`;

  const eq = getEquipped(clearCount);
  const hasJersey = eq.has("jersey");
  const hasShorts = eq.has("shorts");
  const hasBoots = eq.has("boots");
  const hasSocks = eq.has("socks");
  const hasHair = eq.has("hair");
  const hasFlame = eq.has("flame");

  const skin = u("skin");
  // 슬롯별 색: 유니폼 착용 시 블랙&골드
  const shirtFill = hasJersey ? u("black") : u("shirt");

  // 황금 축구화 (왼발 기준 디자인 — 오른발은 translate로 재사용)
  const goldBoot = (
    <>
      {/* 갑피 */}
      <path
        d="M28,99 C27.6,96 29.5,94.4 32.5,94.4 L37.5,95 C40,95.4 40.8,97.4 40.8,99.4 L40.8,100.8 C40.8,101.8 39.8,102.3 38.4,102.3 L29.2,102.3 C28,102.3 27.6,101.4 27.6,100 Z"
        fill={u("gold")}
        stroke="#b8902c"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
      {/* 발등 하이라이트 */}
      <ellipse cx="31" cy="96" rx="3" ry="1.3" fill="#ffffff" opacity="0.45" />
      {/* 검정 사이드 스트라이프 */}
      <path
        d="M28.6,98.4 Q34,100.2 40.4,98.8"
        stroke="#161616"
        strokeWidth="1.4"
        fill="none"
        opacity="0.75"
      />
      {/* 끈 */}
      <path
        d="M31.5,95.2 L34,97.2 M33.5,95.2 L36,97.2"
        stroke="#161616"
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* 밑창 */}
      <path
        d="M27.5,100.6 L40.8,100.6 L40.8,102 C40.8,103 39.8,103.6 38.4,103.6 L29,103.6 C27.8,103.6 27.4,102.8 27.4,101.5 Z"
        fill="#ffffff"
      />
      {/* 스터드 */}
      <rect x="29" y="103.2" width="1.8" height="1.7" rx="0.7" fill="#dfe6ee" />
      <rect
        x="33.2"
        y="103.4"
        width="1.8"
        height="1.7"
        rx="0.7"
        fill="#dfe6ee"
      />
      <rect
        x="37.4"
        y="103.2"
        width="1.8"
        height="1.7"
        rx="0.7"
        fill="#dfe6ee"
      />
    </>
  );

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
          <stop offset="0%" stopColor="#7d5028" />
          <stop offset="100%" stopColor="#5a371b" />
        </linearGradient>
        <linearGradient id={id("skin")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4bd9c" />
          <stop offset="100%" stopColor="#e3a078" />
        </linearGradient>
        <linearGradient id={id("shorts")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b4423" />
          <stop offset="100%" stopColor="#4d2f16" />
        </linearGradient>
        <linearGradient id={id("shoe")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#161616" />
        </linearGradient>
        {/* 유니폼 블랙 & 골드 */}
        <linearGradient id={id("black")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333333" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6df9a" />
          <stop offset="100%" stopColor="#caa23c" />
        </linearGradient>
        {/* 열정 오라 글로우 */}
        <radialGradient id={id("auraGlow")} cx="50%" cy="56%" r="55%">
          <stop offset="0%" stopColor="rgba(255,205,95,0.5)" />
          <stop offset="68%" stopColor="rgba(255,175,55,0.16)" />
          <stop offset="100%" stopColor="rgba(255,165,45,0)" />
        </radialGradient>
      </defs>

      <g className="runner-body">
        {/* ===== 다리 (양말/축구화 슬롯) ===== */}
        <g className="runner-legL">
          <rect x="30" y="80" width="8" height="20" rx="4" fill={skin} />
          <rect
            x="30"
            y="80"
            width="2.6"
            height="20"
            rx="1.3"
            fill="#000"
            opacity="0.08"
          />
          {hasSocks ? (
            <>
              <rect
                x="29.4"
                y="86"
                width="9.2"
                height="13"
                rx="2.6"
                fill={u("gold")}
              />
              <rect
                x="29.4"
                y="86"
                width="9.2"
                height="2.6"
                rx="1.3"
                fill="#161616"
              />
              <rect
                x="29.4"
                y="90.5"
                width="9.2"
                height="1.1"
                fill="#161616"
                opacity="0.5"
              />
              <rect
                x="29.4"
                y="86"
                width="2.4"
                height="13"
                rx="1.2"
                fill="#000"
                opacity="0.12"
              />
            </>
          ) : (
            <rect
              x="30"
              y="95"
              width="8"
              height="3.6"
              rx="1.6"
              fill="#f4f7fb"
            />
          )}
          {hasBoots ? (
            goldBoot
          ) : (
            <>
              <ellipse cx="34" cy="100.4" rx="6.6" ry="4.2" fill={u("shoe")} />
              <ellipse cx="34" cy="102.5" rx="6.6" ry="1.7" fill="#ffffff" />
              <ellipse
                cx="31.6"
                cy="99"
                rx="2"
                ry="1.1"
                fill="#ffffff"
                opacity="0.5"
              />
            </>
          )}
        </g>
        <g className="runner-legR">
          <rect x="42" y="80" width="8" height="20" rx="4" fill={skin} />
          <rect
            x="42"
            y="80"
            width="2.6"
            height="20"
            rx="1.3"
            fill="#000"
            opacity="0.08"
          />
          {hasSocks ? (
            <>
              <rect
                x="41.4"
                y="86"
                width="9.2"
                height="13"
                rx="2.6"
                fill={u("gold")}
              />
              <rect
                x="41.4"
                y="86"
                width="9.2"
                height="2.6"
                rx="1.3"
                fill="#161616"
              />
              <rect
                x="41.4"
                y="90.5"
                width="9.2"
                height="1.1"
                fill="#161616"
                opacity="0.5"
              />
              <rect
                x="41.4"
                y="86"
                width="2.4"
                height="13"
                rx="1.2"
                fill="#000"
                opacity="0.12"
              />
            </>
          ) : (
            <rect
              x="42"
              y="95"
              width="8"
              height="3.6"
              rx="1.6"
              fill="#f4f7fb"
            />
          )}
          {hasBoots ? (
            <g transform="translate(12,0)">{goldBoot}</g>
          ) : (
            <>
              <ellipse cx="46" cy="100.4" rx="6.6" ry="4.2" fill={u("shoe")} />
              <ellipse cx="46" cy="102.5" rx="6.6" ry="1.7" fill="#ffffff" />
              <ellipse
                cx="43.6"
                cy="99"
                rx="2"
                ry="1.1"
                fill="#ffffff"
                opacity="0.5"
              />
            </>
          )}
        </g>

        {/* ===== 팔 (직각으로 굽힘 — 아래팔은 앞쪽/안쪽으로 들어가 몸통 뒤로 가려짐) ===== */}
        <g className="runner-armL">
          {/* 윗팔(살색) 먼저 → 그 위에 밑단 일자 반소매 */}
          <rect x="22" y="48" width="6" height="13" rx="3" fill={skin} />
          {/* 반소매 (어깨는 둥글게, 밑단은 일자) */}
          <path
            d="M20.8,49 C20.8,45 22.6,44 25,44 C27.4,44 29.2,45 29.2,49 L29.2,52 L20.8,52 Z"
            fill={shirtFill}
          />
          {hasJersey && (
            <rect x="20.8" y="50.4" width="8.4" height="1.6" fill={u("gold")} opacity="0.9" />
          )}
          {/* 아래팔 (팔꿈치에서 앞쪽/안쪽으로 굽힘) */}
          <g transform="rotate(-52 25 60)">
            <rect x="22" y="58" width="6" height="9" rx="3" fill={skin} />
            <rect x="22" y="58" width="2" height="9" rx="1" fill="#000" opacity="0.08" />
            <circle cx="25" cy="66" r="3.2" fill={skin} />
          </g>
        </g>
        <g className="runner-armR">
          <rect x="52" y="48" width="6" height="13" rx="3" fill={skin} />
          <path
            d="M50.8,49 C50.8,45 52.6,44 55,44 C57.4,44 59.2,45 59.2,49 L59.2,52 L50.8,52 Z"
            fill={shirtFill}
          />
          {hasJersey && (
            <rect x="50.8" y="50.4" width="8.4" height="1.6" fill={u("gold")} opacity="0.9" />
          )}
          <g transform="rotate(52 55 60)">
            <rect x="52" y="58" width="6" height="9" rx="3" fill={skin} />
            <rect x="56" y="58" width="2" height="9" rx="1" fill="#000" opacity="0.08" />
            <circle cx="55" cy="66" r="3.2" fill={skin} />
          </g>
        </g>

        {/* ===== 반바지 (유니폼 하의 슬롯) — 밑단 네모 ===== */}
        {hasShorts ? (
          <>
            <path
              d="M26,68 Q40,71 54,68 L54,81 L42,81 L41,77 Q40,76.3 39,77 L38,81 L26,81 Z"
              fill={u("black")}
            />
            {/* 골드 허리밴드 */}
            <path
              d="M26,68 Q40,71 54,68 L53.4,71 Q40,73.8 26.6,71 Z"
              fill={u("gold")}
            />
            {/* 골드 사이드 라인 */}
            <path
              d="M29.5,71.5 L29.5,80.5"
              stroke={u("gold")}
              strokeWidth="1.1"
              opacity="0.85"
            />
            <path
              d="M50.5,71.5 L50.5,80.5"
              stroke={u("gold")}
              strokeWidth="1.1"
              opacity="0.85"
            />
            {/* 밑단 음영 */}
            <path
              d="M26,79.5 L38,79.5 M42,79.5 L54,79.5"
              stroke="#000"
              strokeWidth="1"
              opacity="0.16"
            />
          </>
        ) : (
          <>
            <path
              d="M26,68 Q40,71 54,68 L54,81 L42,81 L41,77 Q40,76.3 39,77 L38,81 L26,81 Z"
              fill={u("shorts")}
            />
            <path
              d="M26,68 Q40,71 54,68 L53.4,71 Q40,73.6 26.6,71 Z"
              fill="#ffffff"
              opacity="0.14"
            />
            <path
              d="M40,73 L40,77"
              stroke="#4f3018"
              strokeWidth="1"
              opacity="0.45"
            />
          </>
        )}

        {/* ===== 상의 (유니폼 상의 슬롯) ===== */}
        {hasJersey ? (
          <>
            <path
              d="M27,46 C33,41 47,41 53,46 L51,72 C40,76 40,76 29,72 Z"
              fill={u("black")}
            />
            {/* 어깨 골드 트림 */}
            <path
              d="M28,46 C34,42 46,42 52,46"
              fill="none"
              stroke={u("gold")}
              strokeWidth="1.2"
              opacity="0.85"
            />
            {/* 골드 핀스트라이프 */}
            <line
              x1="34"
              y1="47.5"
              x2="33.4"
              y2="71"
              stroke={u("gold")}
              strokeWidth="0.4"
              opacity="0.4"
            />
            <line
              x1="46"
              y1="47.5"
              x2="46.6"
              y2="71"
              stroke={u("gold")}
              strokeWidth="0.4"
              opacity="0.4"
            />
            {/* RYU + 등번호 12 */}
            <text
              x="40"
              y="52.5"
              textAnchor="middle"
              fontSize="4"
              fontWeight="900"
              fontFamily="Fredoka"
              letterSpacing="0.4"
              fill={u("gold")}
            >
              RYU
            </text>
            <text
              x="40"
              y="67.5"
              textAnchor="middle"
              fontSize="13"
              fontWeight="900"
              fontFamily="'Archivo Black',sans-serif"
              fill={u("gold")}
            >
              12
            </text>
            {/* 밑단 골드 */}
            <path
              d="M29,71.5 C40,75.5 40,75.5 51,71.5"
              fill="none"
              stroke={u("gold")}
              strokeWidth="0.7"
              opacity="0.6"
            />
          </>
        ) : (
          <>
            <path
              d="M27,46 C33,41 47,41 53,46 L51,72 C40,76 40,76 29,72 Z"
              fill={u("shirt")}
            />
            <path
              d="M28,46 C34,42 46,42 52,46 L50.5,49 C45,45.6 35,45.6 29.5,49 Z"
              fill="#ffffff"
              opacity="0.16"
            />
            <path
              d="M27,46 C29,45 30,45 30.5,47 L29,71 L27.4,71 Z"
              fill="#000"
              opacity="0.1"
            />
            <path
              d="M53,46 C51,45 50,45 49.5,47 L51,71 L52.6,71 Z"
              fill="#000"
              opacity="0.1"
            />
            <path
              d="M29,71 C40,75 40,75 51,71 L50.6,73.4 C40,77 40,77 29.4,73.4 Z"
              fill="#000"
              opacity="0.1"
            />
          </>
        )}

        {/* ===== 목 ===== */}
        <rect x="35" y="39" width="10" height="8" rx="3" fill={skin} />
        <rect
          x="35"
          y="39"
          width="10"
          height="2.6"
          rx="1.3"
          fill="#000"
          opacity="0.18"
        />
        {/* 뒷목 넥라인 (유니폼이면 골드) */}
        <path
          d="M33,45.5 Q40,48.5 47,45.5"
          fill="none"
          stroke={hasJersey ? u("gold") : "#5e3a22"}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* ===== 머리: 손흥민 두상(face+ears) + 헤어 슬롯 (10% 확대) ===== */}
        <g transform="translate(12.3, -10.1) scale(0.605)">
          <ellipse cx="45.8" cy="59.7" rx="25.9" ry="25.2" fill="#f09f7a" />
          <path
            d="M20.6,55.8s-2.5-6.8-5.9-3.6,0,11.2,0,11.2c0,0,2.7,8.5,5.9,7.7,3.2-.8,0-15.3,0-15.3Z"
            fill="#f09f7a"
          />
          <path
            d="M71.6,54s2.5-6.8,5.9-3.6,0,11.2,0,11.2c0,0-2.7,8.5-5.9,7.7-3.2-.8,0-15.3,0-15.3Z"
            fill="#f09f7a"
          />
          {hasHair ? (
            /* 멋진 헤어 (음영 + 본체) */
            <>
              <path
                d="M22.1,62.5c3,5.7,5.3,14.2,7.3,15.5,2.7,1.8,31,2,33.1-.9,1.7-2.3,5.2-8.1,8.7-14-4.3,1.4-14.9,4.6-23.9,4.6s-23.4-4.5-25.3-5.2Z"
                fill="#66432a"
              />
              <path
                d="M81.4,38.2c-.5-1.2-3.7.4-3.1-2.7.6-3,.8-4.1-1.5-2.9-2.3,1.2,0-2.3,1.2-6.4,1.2-4.1-2.2-4.5-8.9-4.1,1-3-5.6-18.4-11.5-16.6,3,2,0,8.2,0,8.2,0,0-.7-1.1-7.5-4.5-6.8-3.4-9.1-4.8-6.4,1.4-11.6-3.7-27.6,10-31.7,11.8-4.1,1.8-4.8,3.6,3.2,3.7-6.4,2.1-5.9,7.1-5.9,7.1,0,0,4.6-2,5.9.7-9.1,13.4,2.6,23.4,3.1,23.7,1.3.8,2.6,2.6,3.7,4.7,1.8.7,14.6,5.2,25.3,5.2s19.6-3.2,23.9-4.6c.8-1.4,1.7-2.8,2.5-4.2,4.1-7.1,8.2-19.4,7.8-20.7Z"
                fill="#4d311b"
              />
            </>
          ) : (
            /* 기본 헤어 (음영 + 본체) */
            <>
              <path
                d="M14.9,59.2c2.9,4.4,13.9,17.1,16.8,18.8s27,2.4,29.2-.3c1.9-2.4,9.4-10.1,12.8-16.8-5.5,2.4-16.5,6.6-27.6,6.6-15.7,0-31.1-8.3-31.1-8.3Z"
                fill="#66432a"
              />
              <path
                d="M74.5,17.1c-5.9-7-19.1-9.1-28.8-7.5-16.7-3-22,1-27.7,6.4-14.3,13.4-4.2,43.3-4.1,43.5,0,0,16.4,8,32.1,8s22.1-4.1,27.6-6.6c.4-.8,4.5-2.3,4.8-3.1,5.8-16.1,3.7-31.7-3.9-40.8Z"
                fill="#4d311b"
              />
            </>
          )}
        </g>

        {/* ===== 열정의 오라 (따뜻한 글로우 + 상승하는 에너지 스파클) ===== */}
        {hasFlame && (
          <g>
            {/* 따뜻한 오라 글로우 */}
            <ellipse
              cx="40"
              cy="60"
              rx="33"
              ry="40"
              fill={u("auraGlow")}
              className="aura-glow"
            />
            {/* 상승하는 스파클 */}
            {[
              { x: 22, y: 90, s: 2.6, d: "0s" },
              { x: 58, y: 86, s: 2.2, d: "0.5s" },
              { x: 40, y: 94, s: 3, d: "0.9s" },
              { x: 31, y: 84, s: 1.8, d: "0.3s" },
              { x: 49, y: 92, s: 2.4, d: "1.2s" },
              { x: 60, y: 76, s: 1.6, d: "0.75s" },
              { x: 20, y: 74, s: 1.8, d: "1.5s" },
            ].map((p, i) => (
              <path
                key={i}
                className="aura-spark"
                style={{ animationDelay: p.d }}
                d={`M${p.x},${p.y - p.s} L${p.x + p.s * 0.32},${p.y - p.s * 0.32} L${p.x + p.s},${p.y} L${p.x + p.s * 0.32},${p.y + p.s * 0.32} L${p.x},${p.y + p.s} L${p.x - p.s * 0.32},${p.y + p.s * 0.32} L${p.x - p.s},${p.y} L${p.x - p.s * 0.32},${p.y - p.s * 0.32} Z`}
                fill="#ffd66a"
              />
            ))}
          </g>
        )}
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
  { values: [4, 6], rowCount: 2 },
  { values: [5, 6], rowCount: 2 },
  { values: [5, 7], rowCount: 2 },
  { values: [6, 7], rowCount: 2 },
  { values: [6, 8], rowCount: 2 },
  { values: [6, 9], rowCount: 2 },
  { values: [7, 8], rowCount: 2 },
  { values: [7, 9], rowCount: 2 },
  { values: [8, 9], rowCount: 2 },
  { values: [1, 2], rowCount: 3 },
  { values: [2, 3], rowCount: 3 },
  { values: [1, 3], rowCount: 3 },
  { values: [3, 4], rowCount: 3 },
  { values: [4, 5], rowCount: 3 },
  { values: [2, 5], rowCount: 3 },
  { values: [3, 5], rowCount: 3 },
  { values: [3, 6], rowCount: 3 },
  { values: [3, 7], rowCount: 3 },
  { values: [4, 6], rowCount: 3 },
  { values: [4, 7], rowCount: 3 },
  { values: [4, 8], rowCount: 3 },
  { values: [5, 6], rowCount: 3 },
  { values: [5, 7], rowCount: 3 },
  { values: [5, 8], rowCount: 3 },
  { values: [5, 9], rowCount: 3 },
  { values: [6, 7], rowCount: 3 },
  { values: [6, 8], rowCount: 3 },
  { values: [6, 9], rowCount: 3 },
  { values: [7, 8], rowCount: 3 },
  { values: [7, 9], rowCount: 3 },
  { values: [2, 4], rowCount: 3 },
  { values: [1, 4], rowCount: 3 },
  { values: [8, 9], rowCount: 3 },
  // ----- 2개짜리 (rowCount 4) -----
  { values: [1, 2], rowCount: 4 },
  { values: [2, 3], rowCount: 4 },
  { values: [1, 3], rowCount: 4 },
  { values: [3, 4], rowCount: 4 },
  { values: [2, 4], rowCount: 4 },
  { values: [4, 5], rowCount: 4 },
  { values: [3, 5], rowCount: 4 },
  { values: [1, 4], rowCount: 4 },
  { values: [4, 6], rowCount: 4 },
  { values: [5, 6], rowCount: 4 },
  { values: [2, 5], rowCount: 4 },
  { values: [5, 7], rowCount: 4 },
  { values: [3, 6], rowCount: 4 },
  { values: [6, 7], rowCount: 4 },
  { values: [4, 7], rowCount: 4 },
  { values: [6, 8], rowCount: 4 },
  { values: [5, 8], rowCount: 4 },
  { values: [7, 8], rowCount: 4 },
  { values: [6, 9], rowCount: 4 },
  { values: [7, 9], rowCount: 4 },
  { values: [8, 9], rowCount: 4 },
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
  // 총 클리어 수 (배경 분위기 전환용)
  const [clearCount, setClearCount] = useState(0);
  // 선물상자를 클릭해서 열었는지 (모달 흐름)
  const [giftOpened, setGiftOpened] = useState(false);
  // 실제 캐릭터에 장착된 클리어 수 (선물을 열어야 반영)
  const [equippedCount, setEquippedCount] = useState(0);
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
    // 모달/일시정지/게임오버 중에는 터치로 캐릭터가 움직이지 않게
    if (congrats.open || paused || failBoardOpen) return;
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

          // 클리어 카운트 → 배경 분위기 전환 + 10클리어마다 축하 모달
          clearCountRef.current += 1;
          const cleared = clearCountRef.current;
          setClearCount(cleared);
          if (cleared % 10 === 0) {
            setGiftOpened(false);
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
    setGiftOpened(false);
    setCongrats((c) => ({ ...c, open: false }));
  };

  // 드리블 공 크기 (숫자는 머리 위 뱃지로 표시하므로 작은 고정 크기)
  const balloonSize = 30;

  // 배경 분위기: 10클리어마다 다음 단계 (8단계 순환)
  const theme = BG_THEMES[Math.floor(clearCount / 10) % BG_THEMES.length];

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
        background: theme.base,
        transition: "background 1.2s ease",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ===== 배경 (분위기 단계별) ===== */}
      {/* 하늘 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.sky,
          transition: "background 1.2s ease",
          pointerEvents: "none",
        }}
      />

      {/* 밤하늘 별 */}
      {theme.stars &&
        NIGHT_STARS.map((s, i) => (
          <div
            key={`star-${i}`}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y,
              width: s.s,
              height: s.s,
              borderRadius: "50%",
              background: "#fffdf0",
              boxShadow: "0 0 3px rgba(255,255,255,0.8)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        ))}

      {/* 태양 / 달 */}
      <div
        style={{
          position: "absolute",
          right: "14%",
          top: Math.max(8, vanishY * 0.22),
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: theme.orb,
          boxShadow: theme.orbGlow,
          transition: "background 1.2s ease, box-shadow 1.2s ease",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 구름 (분위기에 따라 투명도) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: theme.cloudOpacity,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
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
      </div>

      {/* Road SVG (잔디 + 도로 + 나무/꽃) */}
      {roadSvg}

      {/* 분위기 색 오버레이 (하늘+도로 전체에 무드 입힘) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.overlay,
          transition: "background 1.2s ease",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />

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

            {/* Character (유니폼 슬롯은 RunnerCharacter 내부에서 착용) */}
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
                <RunnerCharacter size={78} clearCount={equippedCount} />
              </div>
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
        <GameModal
          accent="#ffd24a"
          icon="🎉"
          title="축하합니다!"
          subtitle={`${congrats.count} 스테이지 클리어! 🔥`}
          zIndex={350}
        >
          {!giftOpened ? (
            /* 선물상자: 흔들흔들 → 클릭하면 열림 */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                onClick={() => {
                  setEquippedCount(congrats.count);
                  setGiftOpened(true);
                }}
                className="gift-wiggle"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  lineHeight: 0,
                }}
                aria-label="선물 열기"
              >
                <GiftBox size={150} />
              </button>
              <div
                style={{
                  fontFamily: "Fredoka",
                  fontWeight: 800,
                  fontSize: "clamp(13px, 3.6vw, 16px)",
                  color: "#ffd24a",
                  animation: "blinkHint 1.2s ease-in-out infinite",
                }}
              >
                🎁 선물을 눌러보세요!
              </div>
            </div>
          ) : (
            /* 공개: 아이템 + 계속하기 */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                animation: "revealPop 0.4s cubic-bezier(0.18,0.9,0.3,1.3)",
              }}
            >
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
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 90,
                        height: 90,
                        borderRadius: 18,
                        background:
                          "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
                        border: "2px solid rgba(255,255,255,0.3)",
                        boxShadow: `0 0 24px ${reward.glow}, inset 0 0 18px ${reward.glow}`,
                        animation: "trophyBounce 1.8s ease-in-out infinite",
                      }}
                    >
                      <ItemIcon id={reward.id} size={60} />
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
                style={{ ...MODAL_BTN.green, flex: "none", width: "100%" }}
              >
                계속하기
              </button>
            </div>
          )}
        </GameModal>
      )}

      {/* ===== 일시정지 모달 ===== */}
      {paused && !failBoardOpen && (
        <GameModal accent="#60a5fa" icon="⏸️" title="일시정지" zIndex={300}>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={togglePause} style={MODAL_BTN.green}>
              계속하기
            </button>
            <button onClick={handleRetry} style={MODAL_BTN.blue}>
              다시 시작
            </button>
          </div>
        </GameModal>
      )}

      {/* ===== 게임오버 모달 ===== */}
      {failBoardOpen && (
        <GameModal
          accent="#f87171"
          icon="💀"
          title="GAME OVER"
          subtitle={`STAGE ${stage + 1}`}
          zIndex={300}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRetry} style={MODAL_BTN.blue}>
              다시 도전
            </button>
            <button onClick={onExit} style={MODAL_BTN.gray}>
              나가기
            </button>
          </div>
        </GameModal>
      )}
    </div>
  );
};

export default NumberLaneGame;
