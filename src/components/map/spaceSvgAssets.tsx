import React from "react";

/* ===== Jetpack (캐릭터 등에 부착) ===== */
export const JetpackSvg: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg viewBox="0 0 48 56" width={size} height={(size * 56) / 48}>
    {/* 탱크 좌 */}
    <rect
      x="4"
      y="8"
      width="14"
      height="32"
      rx="5"
      fill="#5a6a7a"
      stroke="#3a4a5a"
      strokeWidth="1.2"
    />
    <rect
      x="6"
      y="10"
      width="4"
      height="8"
      rx="2"
      fill="rgba(255,255,255,0.15)"
    />
    {/* 탱크 우 */}
    <rect
      x="30"
      y="8"
      width="14"
      height="32"
      rx="5"
      fill="#5a6a7a"
      stroke="#3a4a5a"
      strokeWidth="1.2"
    />
    <rect
      x="32"
      y="10"
      width="4"
      height="8"
      rx="2"
      fill="rgba(255,255,255,0.15)"
    />
    {/* 연결바 */}
    <rect x="16" y="16" width="16" height="6" rx="2" fill="#4a5a6a" />
    {/* 노즐 좌 */}
    <path d="M7,40 L17,40 L15,48 L9,48Z" fill="#3a3a3a" />
    {/* 노즐 우 */}
    <path d="M31,40 L41,40 L39,48 L33,48Z" fill="#3a3a3a" />
    {/* 불꽃 좌 */}
    <ellipse
      cx="12"
      cy="52"
      rx="4"
      ry="4"
      fill="#ff6b20"
      opacity="0.9"
      className="engine-flame"
    />
    <ellipse
      cx="12"
      cy="52"
      rx="2.5"
      ry="3"
      fill="#ffcc40"
      className="engine-flame"
    />
    {/* 불꽃 우 */}
    <ellipse
      cx="36"
      cy="52"
      rx="4"
      ry="4"
      fill="#ff6b20"
      opacity="0.9"
      className="engine-flame"
    />
    <ellipse
      cx="36"
      cy="52"
      rx="2.5"
      ry="3"
      fill="#ffcc40"
      className="engine-flame"
    />
  </svg>
);

/* ===== Shield break hit overlay ===== */
const ShieldHit: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <g>
    <ellipse cx={w/2} cy={h/2} rx={w*0.48} ry={h*0.48} fill="none" stroke="#7df" strokeWidth="1.5" opacity="0.7" />
    <ellipse cx={w/2} cy={h/2} rx={w*0.38} ry={h*0.38} fill="cyan" opacity="0.08" />
    {/* hex cracks */}
    <path d={`M${w*0.25},${h*0.2} L${w*0.4},${h*0.15} L${w*0.55},${h*0.22}`} fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
    <path d={`M${w*0.6},${h*0.75} L${w*0.75},${h*0.7} L${w*0.8},${h*0.55}`} fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
    <path d={`M${w*0.15},${h*0.6} L${w*0.3},${h*0.7} L${w*0.25},${h*0.85}`} fill="none" stroke="#aef" strokeWidth="0.8" opacity="0.5" />
    {/* hex fragments */}
    <polygon points={`${w*0.3},${h*0.15} ${w*0.38},${h*0.1} ${w*0.45},${h*0.15} ${w*0.45},${h*0.25} ${w*0.38},${h*0.3} ${w*0.3},${h*0.25}`} fill="#7df" opacity="0.15" stroke="#aef" strokeWidth="0.5" />
    <polygon points={`${w*0.55},${h*0.65} ${w*0.63},${h*0.6} ${w*0.7},${h*0.65} ${w*0.7},${h*0.75} ${w*0.63},${h*0.8} ${w*0.55},${h*0.75}`} fill="#7df" opacity="0.15" stroke="#aef" strokeWidth="0.5" />
    {/* spark particles */}
    <circle cx={w*0.2} cy={h*0.3} r="1.5" fill="#fff" opacity="0.9" />
    <circle cx={w*0.75} cy={h*0.4} r="1" fill="#aef" opacity="0.7" />
    <circle cx={w*0.5} cy={h*0.85} r="1.2" fill="#fff" opacity="0.8" />
  </g>
);

/* ===== Scout UFO (정찰기 — 클래식 비행접시) ===== */
export const ScoutUfo: React.FC<{ size?: number; hit?: boolean }> = ({
  size = 40,
  hit,
}) => (
  <svg viewBox="0 0 40 32" width={size} height={(size * 32) / 40}>
    {/* 하부 빔 */}
    <ellipse cx="20" cy="28" rx="6" ry="2" fill="#0fa" opacity="0.25" className="engine-flame" />
    {/* 원반 본체 */}
    <ellipse cx="20" cy="20" rx="18" ry="7" fill="#1a6b5a" stroke="#0d4a3a" strokeWidth="1" />
    {/* 원반 상부 곡면 */}
    <ellipse cx="20" cy="19" rx="16" ry="5" fill="#238a6a" />
    {/* 라이트 라인 */}
    <ellipse cx="20" cy="22" rx="15" ry="3" fill="none" stroke="#0fa" strokeWidth="0.6" opacity="0.6" strokeDasharray="3 2" />
    {/* 돔 */}
    <ellipse cx="20" cy="16" rx="8" ry="8" fill="#40e8b8" opacity="0.35" />
    <path d="M12,16 Q20,4 28,16" fill="#2cd8a0" opacity="0.5" />
    {/* 돔 하이라이트 */}
    <ellipse cx="17" cy="12" rx="3" ry="2.5" fill="rgba(255,255,255,0.35)" />
    {/* 안테나 */}
    <line x1="20" y1="8" x2="20" y2="4" stroke="#0fa" strokeWidth="0.8" />
    <circle cx="20" cy="3.5" r="1.2" fill="#0fa" opacity="0.8" className="engine-flame" />
    {/* 사이드 라이트 */}
    <circle cx="6" cy="21" r="1.5" fill="#0fa" opacity="0.7" className="engine-flame" />
    <circle cx="34" cy="21" r="1.5" fill="#0fa" opacity="0.7" className="engine-flame" />
    {hit && <ShieldHit w={40} h={32} />}
  </svg>
);

/* ===== Fighter UFO (전투기 — 삼각 전투 비행접시) ===== */
export const FighterUfo: React.FC<{ size?: number; hit?: boolean }> = ({
  size = 50,
  hit,
}) => (
  <svg viewBox="0 0 50 44" width={size} height={(size * 44) / 50}>
    {/* 에너지 윙 좌 */}
    <path d="M3,30 L18,18 L16,32Z" fill="#ff4444" opacity="0.3" className="engine-flame" />
    {/* 에너지 윙 우 */}
    <path d="M47,30 L32,18 L34,32Z" fill="#ff4444" opacity="0.3" className="engine-flame" />
    {/* 날개 좌 */}
    <path d="M6,28 L20,16 L19,30 L10,32Z" fill="#8b2020" stroke="#5a1010" strokeWidth="0.8" />
    {/* 날개 우 */}
    <path d="M44,28 L30,16 L31,30 L40,32Z" fill="#8b2020" stroke="#5a1010" strokeWidth="0.8" />
    {/* 메인 동체 */}
    <path d="M25,3 L34,20 L32,36 L18,36 L16,20Z" fill="#c0392b" stroke="#8b2020" strokeWidth="1" />
    {/* 동체 디테일 */}
    <path d="M25,8 L30,20 L28,32 L22,32 L20,20Z" fill="#e05545" opacity="0.5" />
    {/* 콕핏 (외계인 눈) */}
    <ellipse cx="25" cy="15" rx="5" ry="4" fill="#1a1a1a" stroke="#ff6b4a" strokeWidth="0.6" />
    <ellipse cx="25" cy="14.5" rx="3.5" ry="2.5" fill="#ff4500" opacity="0.6" />
    <ellipse cx="24" cy="14" rx="1.5" ry="1" fill="#ffaa80" opacity="0.7" />
    {/* 캐논 포트 */}
    <circle cx="8" cy="30" r="2.5" fill="#5a1010" />
    <circle cx="8" cy="30" r="1.2" fill="#ff4400" opacity="0.6" className="engine-flame" />
    <circle cx="42" cy="30" r="2.5" fill="#5a1010" />
    <circle cx="42" cy="30" r="1.2" fill="#ff4400" opacity="0.6" className="engine-flame" />
    {/* 후미 엔진 */}
    <ellipse cx="22" cy="38" rx="3" ry="3" fill="#ff4500" opacity="0.5" className="engine-flame" />
    <ellipse cx="28" cy="38" rx="3" ry="3" fill="#ff4500" opacity="0.5" className="engine-flame" />
    {hit && <ShieldHit w={50} h={44} />}
  </svg>
);

/* ===== Bomber UFO (폭격기 — 대형 원반 UFO) ===== */
export const BomberUfo: React.FC<{ size?: number; hit?: boolean }> = ({
  size = 60,
  hit,
}) => (
  <svg viewBox="0 0 60 50" width={size} height={(size * 50) / 60}>
    {/* 하부 트랙터 빔 */}
    <path d="M22,40 L30,50 L38,40" fill="#a855f7" opacity="0.15" className="engine-flame" />
    {/* 외곽 에너지 링 */}
    <ellipse cx="30" cy="28" rx="28" ry="9" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" className="engine-flame" />
    {/* 메인 원반 하부 */}
    <ellipse cx="30" cy="28" rx="27" ry="10" fill="#3d1f56" stroke="#2a1040" strokeWidth="1" />
    {/* 메인 원반 상부 */}
    <ellipse cx="30" cy="25" rx="25" ry="8" fill="#5b2d80" stroke="#3d1f56" strokeWidth="0.8" />
    {/* 장갑 플레이트 */}
    <path d="M8,26 Q30,18 52,26" fill="#7c3aad" opacity="0.4" />
    {/* 라이트 링 */}
    <circle cx="12" cy="27" r="2" fill="#e879f9" opacity="0.6" className="engine-flame" />
    <circle cx="21" cy="25" r="2" fill="#c084fc" opacity="0.6" className="engine-flame" />
    <circle cx="30" cy="24.5" r="2" fill="#e879f9" opacity="0.6" className="engine-flame" />
    <circle cx="39" cy="25" r="2" fill="#c084fc" opacity="0.6" className="engine-flame" />
    <circle cx="48" cy="27" r="2" fill="#e879f9" opacity="0.6" className="engine-flame" />
    {/* 상부 돔 */}
    <path d="M20,22 Q30,8 40,22" fill="#7c3aad" stroke="#5b2d80" strokeWidth="0.8" />
    {/* 에너지 코어 */}
    <circle cx="30" cy="18" r="5" fill="#2a1040" />
    <circle cx="30" cy="18" r="3.5" fill="#a855f7" opacity="0.5" className="engine-flame" />
    <circle cx="29" cy="17" r="1.5" fill="#e0c0ff" opacity="0.6" />
    {/* 하부 캐논 */}
    <rect x="26" y="34" width="8" height="5" rx="2" fill="#2a1040" />
    <circle cx="30" cy="39" r="2" fill="#a855f7" opacity="0.4" className="engine-flame" />
    {hit && <ShieldHit w={60} h={50} />}
  </svg>
);

/* ===== Carrier UFO (모선 — 거대 외계 모함) ===== */
export const CarrierUfo: React.FC<{ size?: number; hit?: boolean }> = ({
  size = 80,
  hit,
}) => (
  <svg viewBox="0 0 80 40" width={size} height={(size * 40) / 80}>
    {/* 외곽 쉴드 */}
    <ellipse cx="40" cy="20" rx="39" ry="18" fill="none" stroke="#60a5fa" strokeWidth="0.6" opacity="0.2" className="boss-shield" />
    {/* 하부 구조물 */}
    <path d="M15,28 Q40,36 65,28 L60,34 Q40,40 20,34Z" fill="#2a3a4a" stroke="#1a2a3a" strokeWidth="0.8" />
    {/* 메인 선체 */}
    <path d="M5,22 Q40,4 75,22 L70,28 Q40,34 10,28Z" fill="#3d5060" stroke="#2a3a4a" strokeWidth="1" />
    {/* 상부 장갑 */}
    <path d="M12,22 Q40,10 68,22" fill="#4a6478" opacity="0.6" />
    {/* 함교 */}
    <rect x="30" y="12" width="20" height="8" rx="3" fill="#4a6478" stroke="#3d5060" strokeWidth="0.8" />
    <rect x="34" y="10" width="12" height="5" rx="2" fill="#5a7a90" />
    {/* 함교 창 */}
    <rect x="36" y="11" width="3" height="2.5" rx="1" fill="#88ccff" opacity="0.7" />
    <rect x="41" y="11" width="3" height="2.5" rx="1" fill="#88ccff" opacity="0.7" />
    {/* 측면 도킹 포트 */}
    <circle cx="14" cy="24" r="3" fill="#2a3a4a" stroke="#4488cc" strokeWidth="0.5" />
    <circle cx="14" cy="24" r="1.5" fill="#4488cc" opacity="0.5" className="engine-flame" />
    <circle cx="66" cy="24" r="3" fill="#2a3a4a" stroke="#4488cc" strokeWidth="0.5" />
    <circle cx="66" cy="24" r="1.5" fill="#4488cc" opacity="0.5" className="engine-flame" />
    {/* 하부 창문열 */}
    <circle cx="24" cy="26" r="1.5" fill="#88ccff" opacity="0.5" />
    <circle cx="32" cy="27" r="1.5" fill="#88ccff" opacity="0.5" />
    <circle cx="40" cy="27.5" r="1.5" fill="#88ccff" opacity="0.5" />
    <circle cx="48" cy="27" r="1.5" fill="#88ccff" opacity="0.5" />
    <circle cx="56" cy="26" r="1.5" fill="#88ccff" opacity="0.5" />
    {/* 엔진 글로우 */}
    <ellipse cx="22" cy="32" rx="4" ry="2.5" fill="#3498db" opacity="0.4" className="engine-flame" />
    <ellipse cx="40" cy="34" rx="5" ry="3" fill="#3498db" opacity="0.4" className="engine-flame" />
    <ellipse cx="58" cy="32" rx="4" ry="2.5" fill="#3498db" opacity="0.4" className="engine-flame" />
    {hit && <ShieldHit w={80} h={40} />}
  </svg>
);

/* ===== Elite UFO (엘리트 — 황금 다트형 외계 전투기) ===== */
export const EliteUfo: React.FC<{ size?: number; hit?: boolean }> = ({
  size = 48,
  hit,
}) => (
  <svg viewBox="0 0 48 48" width={size} height={size}>
    {/* 에너지 트레일 */}
    <path d="M4,26 L16,18 L16,34Z" fill="#f59e0b" opacity="0.25" className="engine-flame" />
    <path d="M44,26 L32,18 L32,34Z" fill="#f59e0b" opacity="0.25" className="engine-flame" />
    {/* 외곽 에너지 */}
    <path d="M24,2 L42,24 L24,46 L6,24Z" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
    {/* 메인 다이아몬드 선체 */}
    <path d="M24,5 L39,24 L24,43 L9,24Z" fill="#8b6914" stroke="#6b4f10" strokeWidth="1" />
    {/* 내부 장갑 */}
    <path d="M24,10 L34,24 L24,38 L14,24Z" fill="#b8860b" opacity="0.6" />
    {/* 중앙 코어 */}
    <path d="M24,16 L30,24 L24,32 L18,24Z" fill="#fbbf24" opacity="0.4" />
    {/* 외계인 눈 (단안) */}
    <ellipse cx="24" cy="22" rx="6" ry="4" fill="#1a1a1a" stroke="#fbbf24" strokeWidth="0.6" />
    <ellipse cx="24" cy="21.5" rx="4" ry="2.5" fill="#f59e0b" opacity="0.6" />
    <ellipse cx="23" cy="21" rx="1.8" ry="1.2" fill="#fde68a" opacity="0.7" />
    {/* 사이드 캐논 */}
    <circle cx="9" cy="24" r="2.5" fill="#6b4f10" />
    <circle cx="9" cy="24" r="1.2" fill="#fbbf24" opacity="0.5" className="engine-flame" />
    <circle cx="39" cy="24" r="2.5" fill="#6b4f10" />
    <circle cx="39" cy="24" r="1.2" fill="#fbbf24" opacity="0.5" className="engine-flame" />
    {/* 후미 엔진 */}
    <ellipse cx="24" cy="44" rx="4" ry="2.5" fill="#f59e0b" opacity="0.4" className="engine-flame" />
    {hit && <ShieldHit w={48} h={48} />}
  </svg>
);

/* ===== Space Boss (외계 대형 모선 보스) ===== */
export const SpaceBossSvg: React.FC<{
  size?: number;
  hpRatio?: number;
  hit?: boolean;
}> = ({ size = 160, hpRatio = 1, hit }) => {
  const phase = hpRatio > 0.5 ? 0 : hpRatio > 0.25 ? 1 : 2;
  const hull = ["#1a2a3a", "#3a1520", "#2a0a0a"][phase];
  const hullLight = ["#2a4a5a", "#5a2030", "#4a1515"][phase];
  const glow = ["#3498db", "#e74c3c", "#ff2200"][phase];
  const glowSoft = ["#60a5fa", "#ff6b6b", "#ff4444"][phase];
  const eye = ["#00e5ff", "#ff4444", "#ff0000"][phase];
  return (
    <svg viewBox="0 0 160 120" width={size} height={(size * 120) / 160}>
      {/* 외곽 에너지 쉴드 */}
      <ellipse cx="80" cy="58" rx="78" ry="52" fill="none" stroke={glow} strokeWidth="1.2" opacity="0.2" className="boss-shield" />
      <ellipse cx="80" cy="58" rx="72" ry="48" fill="none" stroke={glow} strokeWidth="0.6" opacity="0.1" className="boss-shield" />

      {/* 하부 트랙터 빔 */}
      <path d="M60,95 L80,118 L100,95" fill={glow} opacity="0.1" className="engine-flame" />

      {/* 날개 좌 — 외계 유기체 느낌 */}
      <path d="M30,55 Q15,50 2,62 Q8,72 20,70 L30,65Z" fill={hull} stroke={hullLight} strokeWidth="0.8" />
      <path d="M20,58 Q10,55 6,62 Q10,67 16,66" fill={hullLight} opacity="0.3" />
      {/* 날개 우 */}
      <path d="M130,55 Q145,50 158,62 Q152,72 140,70 L130,65Z" fill={hull} stroke={hullLight} strokeWidth="0.8" />
      <path d="M140,58 Q150,55 154,62 Q150,67 144,66" fill={hullLight} opacity="0.3" />

      {/* 메인 선체 — 넓은 비행접시 */}
      <ellipse cx="80" cy="62" rx="55" ry="22" fill={hull} stroke={hullLight} strokeWidth="1.2" />
      {/* 상부 장갑 곡면 */}
      <ellipse cx="80" cy="58" rx="50" ry="16" fill={hullLight} opacity="0.5" />

      {/* 라이트 링 */}
      <ellipse cx="80" cy="68" rx="48" ry="12" fill="none" stroke={glow} strokeWidth="0.8" opacity="0.4" strokeDasharray="5 3" className="engine-flame" />

      {/* 포트홀 라이트 */}
      <circle cx="40" cy="64" r="3" fill={glow} opacity="0.5" className="engine-flame" />
      <circle cx="55" cy="62" r="2.5" fill={glowSoft} opacity="0.5" className="engine-flame" />
      <circle cx="80" cy="61" r="3" fill={glow} opacity="0.6" className="engine-flame" />
      <circle cx="105" cy="62" r="2.5" fill={glowSoft} opacity="0.5" className="engine-flame" />
      <circle cx="120" cy="64" r="3" fill={glow} opacity="0.5" className="engine-flame" />

      {/* 상부 돔 — 함교 */}
      <path d="M55,50 Q80,22 105,50" fill={hull} stroke={hullLight} strokeWidth="1" />
      <path d="M60,48 Q80,28 100,48" fill={hullLight} opacity="0.4" />

      {/* 중앙 대형 외계인 눈 */}
      <ellipse cx="80" cy="42" rx="14" ry="10" fill="#0a0a1a" stroke={glow} strokeWidth="1" />
      <ellipse cx="80" cy="41" rx="10" ry="7" fill={eye} opacity="0.5" />
      <ellipse cx="80" cy="40" rx="6" ry="4" fill={eye} opacity="0.8" />
      <ellipse cx="78" cy="39" rx="3" ry="2" fill="#fff" opacity="0.5" />

      {/* 사이드 눈 (작은) */}
      <ellipse cx="55" cy="48" rx="6" ry="4" fill="#0a0a1a" stroke={glow} strokeWidth="0.6" />
      <ellipse cx="55" cy="47.5" rx="4" ry="2.5" fill={eye} opacity="0.4" />
      <ellipse cx="105" cy="48" rx="6" ry="4" fill="#0a0a1a" stroke={glow} strokeWidth="0.6" />
      <ellipse cx="105" cy="47.5" rx="4" ry="2.5" fill={eye} opacity="0.4" />

      {/* 하부 캐논 포트 */}
      <circle cx="35" cy="72" r="5" fill="#0a0a15" stroke={glow} strokeWidth="0.6" />
      <circle cx="35" cy="72" r="2.5" fill={glow} opacity="0.4" className="engine-flame" />
      <circle cx="125" cy="72" r="5" fill="#0a0a15" stroke={glow} strokeWidth="0.6" />
      <circle cx="125" cy="72" r="2.5" fill={glow} opacity="0.4" className="engine-flame" />
      <circle cx="65" cy="78" r="4" fill="#0a0a15" stroke={glow} strokeWidth="0.5" />
      <circle cx="65" cy="78" r="2" fill={glow} opacity="0.3" className="engine-flame" />
      <circle cx="95" cy="78" r="4" fill="#0a0a15" stroke={glow} strokeWidth="0.5" />
      <circle cx="95" cy="78" r="2" fill={glow} opacity="0.3" className="engine-flame" />

      {/* 하부 중앙 무기 */}
      <rect x="74" y="80" width="12" height="8" rx="3" fill="#0a0a15" stroke={glow} strokeWidth="0.5" />
      <circle cx="80" cy="88" r="3" fill={glow} opacity="0.4" className="engine-flame" />

      {/* 엔진 글로우 */}
      <ellipse cx="45" cy="82" rx="6" ry="4" fill={glow} opacity="0.3" className="engine-flame" />
      <ellipse cx="80" cy="85" rx="8" ry="5" fill={glow} opacity="0.35" className="engine-flame" />
      <ellipse cx="115" cy="82" rx="6" ry="4" fill={glow} opacity="0.3" className="engine-flame" />

      {/* 촉수/안테나 디테일 */}
      <path d="M30,58 Q20,45 25,35" fill="none" stroke={hullLight} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="25" cy="34" r="2" fill={glow} opacity="0.5" className="engine-flame" />
      <path d="M130,58 Q140,45 135,35" fill="none" stroke={hullLight} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="135" cy="34" r="2" fill={glow} opacity="0.5" className="engine-flame" />

      {hit && <ShieldHit w={160} h={120} />}
    </svg>
  );
};

/* ===== 적 에너지 탄환 ===== */
export const EnemyBulletSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 10,
  color = "#e74c3c",
}) => (
  <svg viewBox="0 0 10 10" width={size} height={size}>
    <circle cx="5" cy="5" r="4.5" fill={color} opacity="0.8" />
    <circle cx="5" cy="5" r="2.5" fill="#fff" opacity="0.5" />
  </svg>
);

/* ===== 제트팩 불꽃 (캐릭터 아래 분사) ===== */
export const JetpackFlameSvg: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg
    viewBox="0 0 40 48"
    width={size}
    height={(size * 48) / 40}
    style={{ overflow: "visible" }}
  >
    {/* 좌 불꽃 - 외곽 (주황) */}
    <ellipse
      cx="11"
      cy="8"
      rx="6"
      ry="16"
      fill="#ff6b20"
      opacity="0.8"
      className="jetpack-flame-outer"
    />
    {/* 좌 불꽃 - 내부 (노랑) */}
    <ellipse
      cx="11"
      cy="6"
      rx="3.5"
      ry="10"
      fill="#ffcc40"
      opacity="0.9"
      className="jetpack-flame-inner"
    />
    {/* 좌 불꽃 - 코어 (흰색) */}
    <ellipse
      cx="11"
      cy="4"
      rx="1.8"
      ry="5"
      fill="#fff8e0"
      opacity="0.85"
      className="jetpack-flame-core"
    />

    {/* 우 불꽃 - 외곽 */}
    <ellipse
      cx="29"
      cy="8"
      rx="6"
      ry="16"
      fill="#ff6b20"
      opacity="0.8"
      className="jetpack-flame-outer"
    />
    {/* 우 불꽃 - 내부 */}
    <ellipse
      cx="29"
      cy="6"
      rx="3.5"
      ry="10"
      fill="#ffcc40"
      opacity="0.9"
      className="jetpack-flame-inner"
    />
    {/* 우 불꽃 - 코어 */}
    <ellipse
      cx="29"
      cy="4"
      rx="1.8"
      ry="5"
      fill="#fff8e0"
      opacity="0.85"
      className="jetpack-flame-core"
    />

    {/* 파티클 - 좌 */}
    <circle
      cx="9"
      cy="28"
      r="2"
      fill="#ff8c00"
      opacity="0.5"
      className="jetpack-flame-particle"
    />
    <circle
      cx="13"
      cy="32"
      r="1.5"
      fill="#ffa040"
      opacity="0.4"
      className="jetpack-flame-particle-slow"
    />
    {/* 파티클 - 우 */}
    <circle
      cx="27"
      cy="30"
      r="2"
      fill="#ff8c00"
      opacity="0.5"
      className="jetpack-flame-particle-slow"
    />
    <circle
      cx="31"
      cy="28"
      r="1.5"
      fill="#ffa040"
      opacity="0.4"
      className="jetpack-flame-particle"
    />
  </svg>
);

/* ===== 아이템: 무기 상자 (Weapon crate) ===== */
export const ItemWeaponSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    {/* 배경 원 */}
    <circle cx="14" cy="14" r="13" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" />
    {/* 총 아이콘 */}
    <rect x="6" y="11" width="14" height="6" rx="1.5" fill="#92400e" />
    <rect x="18" y="9" width="4" height="10" rx="1" fill="#92400e" />
    <rect x="9" y="14" width="3" height="5" rx="1" fill="#78350f" />
    <circle cx="21" cy="14" r="1.2" fill="#fde68a" />
  </svg>
);

/* ===== 아이템: 샷건 무기 — 오렌지 확산 ===== */
export const ItemShotgunSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="sgg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    {/* 배경 원 */}
    <circle cx="14" cy="14" r="13" fill="url(#sgg)" stroke="#92400e" strokeWidth="1.2" />
    {/* 확산 총알 3발 */}
    <rect x="6" y="10" width="3" height="8" rx="1.5" fill="#fff" opacity="0.9" transform="rotate(-20 7.5 14)" />
    <rect x="12.5" y="6" width="3" height="10" rx="1.5" fill="#fff" />
    <rect x="19" y="10" width="3" height="8" rx="1.5" fill="#fff" opacity="0.9" transform="rotate(20 20.5 14)" />
    {/* 발사 플래시 */}
    <circle cx="14" cy="20" r="3" fill="#fde68a" opacity="0.6" />
    <circle cx="14" cy="20" r="1.5" fill="#fff" opacity="0.7" />
  </svg>
);

/* ===== 아이템: 레이저 무기 — 전기 에너지 블루 ===== */
export const ItemLaserSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <radialGradient id="lzrg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00e5ff" />
        <stop offset="100%" stopColor="#0277bd" />
      </radialGradient>
    </defs>
    {/* 배경 원 + 글로우 */}
    <circle cx="14" cy="14" r="13" fill="url(#lzrg)" stroke="#01579b" strokeWidth="1.2" />
    {/* 전기 스파크 외곽 */}
    <path d="M7,10 L10,13 L7,16" fill="none" stroke="#b3e5fc" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M21,10 L18,13 L21,16" fill="none" stroke="#b3e5fc" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M12,5 L13,8 L11,8" fill="none" stroke="#b3e5fc" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    <path d="M16,5 L15,8 L17,8" fill="none" stroke="#b3e5fc" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    {/* 중앙 레이저 빔 */}
    <rect x="12.5" y="7" width="3" height="14" rx="1.5" fill="#fff" opacity="0.9" />
    {/* 중앙 코어 빛 */}
    <circle cx="14" cy="14" r="4" fill="#fff" opacity="0.3" />
    {/* 상하 스파크 */}
    <path d="M14,3 L13,6 L15,6Z" fill="#e0f7fa" />
    <path d="M14,25 L13,22 L15,22Z" fill="#e0f7fa" />
  </svg>
);

/* ===== 아이템: 연사 부스트 (Fire rate) — 번개 ===== */
export const ItemFireRateSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <circle cx="14" cy="14" r="13" fill="#2563eb" stroke="#1e40af" strokeWidth="1.2" />
    {/* 번개 bolt */}
    <path d="M16,3 L10,15 L14,15 L12,25 L20,12 L15,12 L18,3Z" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />
  </svg>
);

/* ===== 아이템: 데미지 업 — 위쪽 화살표 ===== */
export const ItemDamageUpSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <circle cx="14" cy="14" r="13" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.2" />
    {/* 위쪽 화살표 */}
    <path d="M14,5 L21,15 L17,15 L17,23 L11,23 L11,15 L7,15Z" fill="#fff" />
  </svg>
);

/* ===== 아이템: 관통 — 보라 에너지 다이아몬드 ===== */
export const ItemPierceSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="pcg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    {/* 다이아몬드 배경 */}
    <path d="M14,2 L26,14 L14,26 L2,14Z" fill="url(#pcg)" stroke="#5b21b6" strokeWidth="1.2" />
    {/* 에너지 화살촉 */}
    <path d="M14,5 L17.5,12 L15,11 L15,21 L14,23 L13,21 L13,11 L10.5,12Z" fill="#e9d5ff" />
    {/* 중심 코어 */}
    <path d="M14,7 L15,11 L14.5,10.5 L14.5,19 L14,21 L13.5,19 L13.5,10.5 L13,11Z" fill="#fff" opacity="0.8" />
  </svg>
);

/* ===== 아이템: 클론 추가 — 사람x2 ===== */
export const ItemCloneSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <circle cx="14" cy="14" r="13" fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.2" />
    {/* 왼쪽 사람 */}
    <circle cx="10" cy="10" r="3" fill="#ede9fe" />
    <path d="M10,13 L10,20" stroke="#ede9fe" strokeWidth="2.5" strokeLinecap="round" />
    {/* 오른쪽 사람 */}
    <circle cx="18" cy="10" r="3" fill="#c4b5fd" />
    <path d="M18,13 L18,20" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
    {/* x2 */}
    <text x="14" y="26" textAnchor="middle" fontSize="5" fontWeight="900" fill="#fff">x2</text>
  </svg>
);

/* ===== 아이템: HP 회복 — 병원 십자가 (붉은계열) ===== */
export const ItemHealPillSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    {/* 붉은 배경 원 */}
    <circle cx="14" cy="14" r="13" fill="#fff" stroke="#dc2626" strokeWidth="1.5" />
    <circle cx="14" cy="14" r="11" fill="#dc2626" />
    {/* 병원 십자가 (흰색) */}
    <rect x="11" y="6" width="6" height="16" rx="1.5" fill="#fff" />
    <rect x="6" y="11" width="16" height="6" rx="1.5" fill="#fff" />
  </svg>
);

/* ===== 폭발 이펙트 ===== */
export const ExplosionSvg: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <circle cx="20" cy="20" r="18" fill="#ff6600" opacity="0.7" />
    <circle cx="20" cy="20" r="12" fill="#ffaa00" opacity="0.8" />
    <circle cx="20" cy="20" r="6" fill="#fff" opacity="0.9" />
    {/* 파편 */}
    <line x1="20" y1="2" x2="20" y2="8" stroke="#ff4400" strokeWidth="2" />
    <line x1="38" y1="20" x2="32" y2="20" stroke="#ff4400" strokeWidth="2" />
    <line x1="20" y1="38" x2="20" y2="32" stroke="#ff4400" strokeWidth="2" />
    <line x1="2" y1="20" x2="8" y2="20" stroke="#ff4400" strokeWidth="2" />
    <line x1="33" y1="7" x2="29" y2="11" stroke="#ff6600" strokeWidth="1.5" />
    <line x1="33" y1="33" x2="29" y2="29" stroke="#ff6600" strokeWidth="1.5" />
    <line x1="7" y1="33" x2="11" y2="29" stroke="#ff6600" strokeWidth="1.5" />
    <line x1="7" y1="7" x2="11" y2="11" stroke="#ff6600" strokeWidth="1.5" />
  </svg>
);

/* =====================================================================
   CHAPTER 2: FIRE ALIENS — 불의 외계인들
   ===================================================================== */

const FireShieldHit: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <g>
    <ellipse cx={w/2} cy={h/2} rx={w*0.48} ry={h*0.48} fill="none" stroke="#f90" strokeWidth="1.5" opacity="0.7" />
    <ellipse cx={w/2} cy={h/2} rx={w*0.38} ry={h*0.38} fill="#ff6600" opacity="0.08" />
    <path d={`M${w*0.25},${h*0.2} L${w*0.4},${h*0.15} L${w*0.55},${h*0.22}`} fill="none" stroke="#ff0" strokeWidth="1" opacity="0.8" />
    <path d={`M${w*0.6},${h*0.75} L${w*0.75},${h*0.7} L${w*0.8},${h*0.55}`} fill="none" stroke="#ff0" strokeWidth="1" opacity="0.6" />
    <path d={`M${w*0.15},${h*0.6} L${w*0.3},${h*0.7} L${w*0.25},${h*0.85}`} fill="none" stroke="#f90" strokeWidth="0.8" opacity="0.5" />
    <polygon points={`${w*0.3},${h*0.15} ${w*0.38},${h*0.1} ${w*0.45},${h*0.15} ${w*0.45},${h*0.25} ${w*0.38},${h*0.3} ${w*0.3},${h*0.25}`} fill="#f90" opacity="0.15" stroke="#ff0" strokeWidth="0.5" />
    <polygon points={`${w*0.55},${h*0.65} ${w*0.63},${h*0.6} ${w*0.7},${h*0.65} ${w*0.7},${h*0.75} ${w*0.63},${h*0.8} ${w*0.55},${h*0.75}`} fill="#f90" opacity="0.15" stroke="#ff0" strokeWidth="0.5" />
    <circle cx={w*0.2} cy={h*0.3} r="1.5" fill="#ff0" opacity="0.9" />
    <circle cx={w*0.75} cy={h*0.4} r="1" fill="#f90" opacity="0.7" />
    <circle cx={w*0.5} cy={h*0.85} r="1.2" fill="#ff0" opacity="0.8" />
  </g>
);

/* ===== Fire Scout (불꽃 정찰기) ===== */
export const FireScoutUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 40, hit }) => (
  <svg viewBox="0 0 40 32" width={size} height={(size * 32) / 40}>
    {/* 하부 화염빔 */}
    <ellipse cx="20" cy="28" rx="6" ry="2" fill="#ff4400" opacity="0.3" className="engine-flame" />
    {/* 원반 본체 */}
    <ellipse cx="20" cy="20" rx="18" ry="7" fill="#8b3a0a" stroke="#5a2005" strokeWidth="1" />
    {/* 원반 상부 (용암 표면) */}
    <ellipse cx="20" cy="19" rx="16" ry="5" fill="#c4500f" />
    {/* 균열선 */}
    <path d="M8,19 Q14,17 20,19 Q26,21 32,19" fill="none" stroke="#ff6600" strokeWidth="0.5" opacity="0.6" />
    {/* 라이트 링 */}
    <ellipse cx="20" cy="22" rx="15" ry="3" fill="none" stroke="#ff6600" strokeWidth="0.6" opacity="0.6" strokeDasharray="3 2" />
    {/* 돔 */}
    <ellipse cx="20" cy="16" rx="8" ry="8" fill="#ff8c42" opacity="0.35" />
    <path d="M12,16 Q20,4 28,16" fill="#ff6600" opacity="0.4" />
    {/* 돔 하이라이트 */}
    <ellipse cx="17" cy="12" rx="3" ry="2.5" fill="rgba(255,200,100,0.35)" />
    {/* 안테나 불꽃 */}
    <line x1="20" y1="8" x2="20" y2="4" stroke="#ff6600" strokeWidth="0.8" />
    <circle cx="20" cy="3.5" r="1.5" fill="#ff4400" opacity="0.9" className="engine-flame" />
    {/* 사이드 화염 */}
    <circle cx="6" cy="21" r="1.5" fill="#ff6600" opacity="0.7" className="engine-flame" />
    <circle cx="34" cy="21" r="1.5" fill="#ff6600" opacity="0.7" className="engine-flame" />
    {hit && <FireShieldHit w={40} h={32} />}
  </svg>
);

/* ===== Fire Fighter (화염 전투기) ===== */
export const FireFighterUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 50, hit }) => (
  <svg viewBox="0 0 50 44" width={size} height={(size * 44) / 50}>
    {/* 화염 윙 좌 */}
    <path d="M3,30 L18,18 L16,32Z" fill="#ff4400" opacity="0.3" className="engine-flame" />
    {/* 화염 윙 우 */}
    <path d="M47,30 L32,18 L34,32Z" fill="#ff4400" opacity="0.3" className="engine-flame" />
    {/* 메인 바디 */}
    <path d="M25,6 L40,34 L25,30 L10,34Z" fill="#e64500" stroke="#801a00" strokeWidth="1" />
    {/* 내부 아머 */}
    <path d="M25,12 L36,32 L25,28 L14,32Z" fill="#cc3300" opacity="0.6" />
    {/* 용암 균열 */}
    <line x1="25" y1="14" x2="25" y2="26" stroke="#ff8800" strokeWidth="0.5" opacity="0.5" />
    <line x1="20" y1="20" x2="30" y2="20" stroke="#ff8800" strokeWidth="0.5" opacity="0.4" />
    {/* 화염 눈 (콕핏) */}
    <ellipse cx="25" cy="18" rx="4" ry="3" fill="#1a0500" />
    <ellipse cx="25" cy="18" rx="2.5" ry="1.8" fill="#ffcc00" opacity="0.9" />
    <circle cx="25" cy="18" r="1" fill="#ff4400" />
    {/* 캐논 화염 */}
    <circle cx="12" cy="32" r="2" fill="#ff6600" opacity="0.6" className="engine-flame" />
    <circle cx="38" cy="32" r="2" fill="#ff6600" opacity="0.6" className="engine-flame" />
    {/* 엔진 화염 */}
    <ellipse cx="25" cy="36" rx="4" ry="2" fill="#ff4400" opacity="0.5" className="engine-flame" />
    {hit && <FireShieldHit w={50} h={44} />}
  </svg>
);

/* ===== Fire Bomber (용암 폭격기) ===== */
export const FireBomberUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 60, hit }) => (
  <svg viewBox="0 0 60 50" width={size} height={(size * 50) / 60}>
    {/* 하부 용암빔 */}
    <ellipse cx="30" cy="46" rx="8" ry="3" fill="#ff4400" opacity="0.15" className="engine-flame" />
    {/* 메인 디스크 */}
    <ellipse cx="30" cy="28" rx="27" ry="12" fill="#5a1a00" stroke="#3a0a00" strokeWidth="1.2" />
    {/* 상부 아머 */}
    <ellipse cx="30" cy="26" rx="24" ry="9" fill="#8b3a10" />
    {/* 용암 균열선 */}
    <path d="M10,28 Q20,24 30,28 Q40,32 50,28" fill="none" stroke="#ff4400" strokeWidth="0.7" opacity="0.5" />
    <path d="M15,24 L25,26 L35,23 L45,26" fill="none" stroke="#ff6600" strokeWidth="0.4" opacity="0.4" />
    {/* 에너지 코어 */}
    <circle cx="30" cy="26" r="6" fill="#ff4400" opacity="0.5" className="engine-flame" />
    <circle cx="30" cy="26" r="3" fill="#ffaa00" opacity="0.7" />
    {/* 라이트 링 */}
    {[0,1,2,3,4,5,6,7].map(i => {
      const a = (i / 8) * Math.PI * 2;
      return <circle key={i} cx={30 + Math.cos(a) * 20} cy={28 + Math.sin(a) * 8} r="1.2"
        fill={i % 2 === 0 ? "#ff6600" : "#ffaa00"} opacity="0.7" className="engine-flame" />;
    })}
    {/* 하부 캐논 */}
    <rect x="27" y="36" width="6" height="4" rx="1" fill="#3a0a00" />
    <circle cx="30" cy="42" r="2" fill="#ff4400" opacity="0.6" className="engine-flame" />
    {hit && <FireShieldHit w={60} h={50} />}
  </svg>
);

/* ===== Fire Carrier (화산 모선) ===== */
export const FireCarrierUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 80, hit }) => (
  <svg viewBox="0 0 80 40" width={size} height={(size * 40) / 80}>
    {/* 실드 링 */}
    <ellipse cx="40" cy="22" rx="38" ry="16" fill="none" stroke="#ff6600" strokeWidth="0.5" opacity="0.2" strokeDasharray="4 3" />
    {/* 메인 선체 */}
    <ellipse cx="40" cy="22" rx="36" ry="13" fill="#4a1a0a" stroke="#2a0a05" strokeWidth="1" />
    {/* 상부 */}
    <ellipse cx="40" cy="20" rx="32" ry="10" fill="#6b2a10" />
    {/* 용암 균열 */}
    <path d="M12,22 Q26,18 40,22 Q54,26 68,22" fill="none" stroke="#ff4400" strokeWidth="0.6" opacity="0.5" />
    <path d="M20,18 L32,20 L48,17 L60,20" fill="none" stroke="#ff6600" strokeWidth="0.4" opacity="0.4" />
    <path d="M16,24 L28,26 L40,23 L52,26 L64,24" fill="none" stroke="#ff4400" strokeWidth="0.3" opacity="0.3" />
    {/* 브릿지 */}
    <rect x="32" y="12" width="16" height="8" rx="3" fill="#5a2010" stroke="#3a0a05" strokeWidth="0.8" />
    <rect x="35" y="14" width="10" height="4" rx="2" fill="#ff6600" opacity="0.25" />
    {/* 도킹 포트 */}
    <circle cx="18" cy="22" r="3" fill="#3a0a05" stroke="#ff4400" strokeWidth="0.5" />
    <circle cx="18" cy="22" r="1.5" fill="#ff4400" opacity="0.5" className="engine-flame" />
    <circle cx="62" cy="22" r="3" fill="#3a0a05" stroke="#ff4400" strokeWidth="0.5" />
    <circle cx="62" cy="22" r="1.5" fill="#ff4400" opacity="0.5" className="engine-flame" />
    {/* 윈도우 */}
    {[26,32,38,44,50,56].map((x,i) => <rect key={i} x={x} y="20" width="2.5" height="1.5" rx="0.5" fill="#ffaa44" opacity="0.5" />)}
    {/* 엔진 */}
    <ellipse cx="14" cy="30" rx="4" ry="2" fill="#ff8800" opacity="0.5" className="engine-flame" />
    <ellipse cx="40" cy="32" rx="5" ry="2" fill="#ff8800" opacity="0.5" className="engine-flame" />
    <ellipse cx="66" cy="30" rx="4" ry="2" fill="#ff8800" opacity="0.5" className="engine-flame" />
    {hit && <FireShieldHit w={80} h={40} />}
  </svg>
);

/* ===== Fire Elite (불꽃 엘리트) ===== */
export const FireEliteUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 48, hit }) => (
  <svg viewBox="0 0 48 48" width={size} height={size}>
    {/* 화염 트레일 */}
    <path d="M24,46 L20,38 L24,40 L28,38Z" fill="#ff4400" opacity="0.25" className="engine-flame" />
    {/* 다이아몬드 바디 */}
    <path d="M24,4 L44,24 L24,44 L4,24Z" fill="#8b2a00" stroke="#5a1a00" strokeWidth="1" />
    {/* 내부 아머 */}
    <path d="M24,10 L38,24 L24,38 L10,24Z" fill="#cc4400" opacity="0.6" />
    {/* 코어 */}
    <path d="M24,16 L32,24 L24,32 L16,24Z" fill="#ff6600" opacity="0.4" />
    {/* 용암 균열 */}
    <line x1="24" y1="8" x2="24" y2="40" stroke="#ff8800" strokeWidth="0.4" opacity="0.4" />
    <line x1="8" y1="24" x2="40" y2="24" stroke="#ff8800" strokeWidth="0.4" opacity="0.4" />
    {/* 화염 눈 */}
    <ellipse cx="24" cy="22" rx="5" ry="4" fill="#1a0500" />
    <ellipse cx="24" cy="22" rx="3.5" ry="2.5" fill="#ffcc00" opacity="0.9" />
    <circle cx="24" cy="22" r="1.5" fill="#ff4400" />
    {/* 사이드 캐논 */}
    <circle cx="8" cy="24" r="2.5" fill="#5a1a00" stroke="#ff6600" strokeWidth="0.5" />
    <circle cx="8" cy="24" r="1" fill="#ff8800" opacity="0.7" className="engine-flame" />
    <circle cx="40" cy="24" r="2.5" fill="#5a1a00" stroke="#ff6600" strokeWidth="0.5" />
    <circle cx="40" cy="24" r="1" fill="#ff8800" opacity="0.7" className="engine-flame" />
    {hit && <FireShieldHit w={48} h={48} />}
  </svg>
);

/* ===== Fire Boss (화산 보스 모선) ===== */
export const FireBossSvg: React.FC<{ size?: number; hpRatio?: number; hit?: boolean }> = ({ size = 160, hpRatio = 1, hit }) => {
  const phase = hpRatio > 0.5 ? 0 : hpRatio > 0.25 ? 1 : 2;
  const C = [
    { hull: "#3a1a0a", hullLt: "#5a2a10", glow: "#ff6600", eye: "#ffcc00", crack: "#ff4400" },
    { hull: "#2a0a05", hullLt: "#4a1510", glow: "#ff4400", eye: "#ff8800", crack: "#ff2200" },
    { hull: "#1a0500", hullLt: "#3a0a08", glow: "#ff2200", eye: "#ff0000", crack: "#cc0000" },
  ][phase];
  const w = 160, h = 120;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={(size * h) / w}>
      {/* 화염 오라 */}
      <ellipse cx="80" cy="60" rx="75" ry="52" fill={C.glow} opacity="0.06" className="boss-shield" />
      {/* 메인 선체 */}
      <ellipse cx="80" cy="62" rx="70" ry="28" fill={C.hull} stroke={C.crack} strokeWidth="0.8" opacity="0.9" />
      <ellipse cx="80" cy="58" rx="65" ry="24" fill={C.hullLt} />
      {/* 용암 균열 */}
      <path d="M20,60 Q50,50 80,60 Q110,70 140,60" fill="none" stroke={C.crack} strokeWidth="1" opacity="0.6" />
      <path d="M30,52 L55,56 L80,50 L105,56 L130,52" fill="none" stroke={C.glow} strokeWidth="0.6" opacity="0.4" />
      <path d="M25,68 L50,72 L80,66 L110,72 L135,68" fill="none" stroke={C.crack} strokeWidth="0.5" opacity="0.3" />
      {/* 화염 촉수 (안테나) */}
      <path d="M30,42 Q20,20 15,10" fill="none" stroke={C.glow} strokeWidth="1.5" opacity="0.6" />
      <circle cx="15" cy="10" r="3" fill={C.eye} opacity="0.7" className="engine-flame" />
      <path d="M130,42 Q140,20 145,10" fill="none" stroke={C.glow} strokeWidth="1.5" opacity="0.6" />
      <circle cx="145" cy="10" r="3" fill={C.eye} opacity="0.7" className="engine-flame" />
      {/* 브릿지 */}
      <path d="M60,38 Q80,20 100,38" fill={C.hullLt} stroke={C.crack} strokeWidth="0.6" />
      <path d="M65,38 Q80,26 95,38" fill={C.glow} opacity="0.15" />
      {/* 중앙 대형 눈 */}
      <ellipse cx="80" cy="48" rx="12" ry="8" fill="#0a0200" stroke={C.glow} strokeWidth="1" />
      <ellipse cx="80" cy="48" rx="8" ry="5" fill={C.eye} opacity="0.8" />
      <ellipse cx="80" cy="48" rx="4" ry="3" fill={C.crack} opacity="0.9" />
      <ellipse cx="78" cy="46" rx="2" ry="1.5" fill="rgba(255,255,200,0.5)" />
      {/* 사이드 눈 */}
      <ellipse cx="45" cy="54" rx="5" ry="3.5" fill="#0a0200" />
      <ellipse cx="45" cy="54" rx="3" ry="2" fill={C.eye} opacity="0.7" />
      <ellipse cx="115" cy="54" rx="5" ry="3.5" fill="#0a0200" />
      <ellipse cx="115" cy="54" rx="3" ry="2" fill={C.eye} opacity="0.7" />
      {/* 캐논 포트 */}
      {[30,55,105,130].map((x,i) => (
        <React.Fragment key={i}>
          <rect x={x-3} y="72" width="6" height="8" rx="2" fill={C.hull} stroke={C.crack} strokeWidth="0.4" />
          <circle cx={x} cy="82" r="2.5" fill={C.glow} opacity="0.6" className="engine-flame" />
        </React.Fragment>
      ))}
      {/* 라이트 링 */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={80 + Math.cos(a) * 55} cy={62 + Math.sin(a) * 22} r="1.8"
          fill={i % 2 === 0 ? C.glow : C.eye} opacity="0.6" className="engine-flame" />;
      })}
      {/* 엔진 화염 */}
      <ellipse cx="35" cy="80" rx="8" ry="3" fill={C.glow} opacity="0.5" className="engine-flame" />
      <ellipse cx="80" cy="85" rx="10" ry="4" fill={C.glow} opacity="0.5" className="engine-flame" />
      <ellipse cx="125" cy="80" rx="8" ry="3" fill={C.glow} opacity="0.5" className="engine-flame" />
      {/* 엠버 파티클 */}
      <circle cx="25" cy="40" r="1.5" fill={C.eye} opacity="0.5" className="engine-flame" />
      <circle cx="135" cy="45" r="1.2" fill={C.eye} opacity="0.4" className="engine-flame" />
      <circle cx="60" cy="30" r="1" fill={C.glow} opacity="0.5" className="engine-flame" />
      <circle cx="100" cy="32" r="1.3" fill={C.glow} opacity="0.4" className="engine-flame" />
      {hit && <FireShieldHit w={w} h={h} />}
    </svg>
  );
};

/* =====================================================================
   CHAPTER 3: DARK ALIENS — 어둠의 외계인들
   ===================================================================== */

const DarkShieldHit: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <g>
    <ellipse cx={w/2} cy={h/2} rx={w*0.48} ry={h*0.48} fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
    <ellipse cx={w/2} cy={h/2} rx={w*0.38} ry={h*0.38} fill="#7c3aed" opacity="0.08" />
    <path d={`M${w*0.25},${h*0.2} L${w*0.4},${h*0.15} L${w*0.55},${h*0.22}`} fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.8" />
    <path d={`M${w*0.6},${h*0.75} L${w*0.75},${h*0.7} L${w*0.8},${h*0.55}`} fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
    <path d={`M${w*0.15},${h*0.6} L${w*0.3},${h*0.7} L${w*0.25},${h*0.85}`} fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.5" />
    <polygon points={`${w*0.3},${h*0.15} ${w*0.38},${h*0.1} ${w*0.45},${h*0.15} ${w*0.45},${h*0.25} ${w*0.38},${h*0.3} ${w*0.3},${h*0.25}`} fill="#7c3aed" opacity="0.15" stroke="#c084fc" strokeWidth="0.5" />
    <polygon points={`${w*0.55},${h*0.65} ${w*0.63},${h*0.6} ${w*0.7},${h*0.65} ${w*0.7},${h*0.75} ${w*0.63},${h*0.8} ${w*0.55},${h*0.75}`} fill="#7c3aed" opacity="0.15" stroke="#c084fc" strokeWidth="0.5" />
    <circle cx={w*0.2} cy={h*0.3} r="1.5" fill="#c084fc" opacity="0.9" />
    <circle cx={w*0.75} cy={h*0.4} r="1" fill="#a855f7" opacity="0.7" />
    <circle cx={w*0.5} cy={h*0.85} r="1.2" fill="#c084fc" opacity="0.8" />
  </g>
);

/* ===== Dark Scout (그림자 정찰기) ===== */
export const DarkScoutUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 40, hit }) => (
  <svg viewBox="0 0 40 32" width={size} height={(size * 32) / 40}>
    {/* 하부 공허빔 */}
    <ellipse cx="20" cy="28" rx="6" ry="2" fill="#7c3aed" opacity="0.25" className="engine-flame" />
    {/* 원반 본체 */}
    <ellipse cx="20" cy="20" rx="18" ry="7" fill="#1a0a2a" stroke="#0d0518" strokeWidth="1" />
    {/* 상부 */}
    <ellipse cx="20" cy="19" rx="16" ry="5" fill="#2a1040" />
    {/* 그림자 맥 */}
    <path d="M8,19 Q14,17 20,19 Q26,21 32,19" fill="none" stroke="#7c3aed" strokeWidth="0.4" opacity="0.4" />
    {/* 라이트 링 */}
    <ellipse cx="20" cy="22" rx="15" ry="3" fill="none" stroke="#7c3aed" strokeWidth="0.6" opacity="0.5" strokeDasharray="3 2" />
    {/* 돔 */}
    <ellipse cx="20" cy="16" rx="8" ry="8" fill="#6b21a8" opacity="0.3" />
    <path d="M12,16 Q20,4 28,16" fill="#7c3aed" opacity="0.35" />
    {/* 돔 하이라이트 */}
    <ellipse cx="17" cy="12" rx="3" ry="2.5" fill="rgba(192,132,252,0.25)" />
    {/* 안테나 */}
    <line x1="20" y1="8" x2="20" y2="4" stroke="#a855f7" strokeWidth="0.8" />
    <circle cx="20" cy="3.5" r="1.2" fill="#a855f7" opacity="0.8" className="engine-flame" />
    {/* 사이드 라이트 */}
    <circle cx="6" cy="21" r="1.5" fill="#7c3aed" opacity="0.6" className="engine-flame" />
    <circle cx="34" cy="21" r="1.5" fill="#7c3aed" opacity="0.6" className="engine-flame" />
    {hit && <DarkShieldHit w={40} h={32} />}
  </svg>
);

/* ===== Dark Fighter (암흑 전투기) ===== */
export const DarkFighterUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 50, hit }) => (
  <svg viewBox="0 0 50 44" width={size} height={(size * 44) / 50}>
    {/* 그림자 윙 좌 */}
    <path d="M3,30 L18,18 L16,32Z" fill="#7c3aed" opacity="0.2" className="engine-flame" />
    {/* 그림자 윙 우 */}
    <path d="M47,30 L32,18 L34,32Z" fill="#7c3aed" opacity="0.2" className="engine-flame" />
    {/* 메인 바디 */}
    <path d="M25,6 L40,34 L25,30 L10,34Z" fill="#2d0a4a" stroke="#1a0530" strokeWidth="1" />
    {/* 내부 */}
    <path d="M25,12 L36,32 L25,28 L14,32Z" fill="#3d1060" opacity="0.6" />
    {/* 공허 눈 */}
    <ellipse cx="25" cy="18" rx="4" ry="3" fill="#0a0210" />
    <ellipse cx="25" cy="18" rx="2.5" ry="1.8" fill="#c084fc" opacity="0.9" />
    <circle cx="25" cy="18" r="1" fill="#7c3aed" />
    {/* 그림자 맥 */}
    <line x1="25" y1="14" x2="25" y2="26" stroke="#a855f7" strokeWidth="0.4" opacity="0.3" />
    {/* 캐논 */}
    <circle cx="12" cy="32" r="2" fill="#6b21a8" opacity="0.5" className="engine-flame" />
    <circle cx="38" cy="32" r="2" fill="#6b21a8" opacity="0.5" className="engine-flame" />
    {/* 엔진 */}
    <ellipse cx="25" cy="36" rx="4" ry="2" fill="#7c3aed" opacity="0.4" className="engine-flame" />
    {hit && <DarkShieldHit w={50} h={44} />}
  </svg>
);

/* ===== Dark Bomber (공허 폭격기) ===== */
export const DarkBomberUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 60, hit }) => (
  <svg viewBox="0 0 60 50" width={size} height={(size * 50) / 60}>
    {/* 어둠 오라 */}
    <ellipse cx="30" cy="28" rx="28" ry="16" fill="#7c3aed" opacity="0.06" />
    {/* 하부 공허빔 */}
    <ellipse cx="30" cy="46" rx="8" ry="3" fill="#6b21a8" opacity="0.12" className="engine-flame" />
    {/* 메인 디스크 */}
    <ellipse cx="30" cy="28" rx="27" ry="12" fill="#0d0520" stroke="#08031a" strokeWidth="1.2" />
    {/* 상부 */}
    <ellipse cx="30" cy="26" rx="24" ry="9" fill="#1a0a30" />
    {/* 그림자 맥 */}
    <path d="M10,28 Q20,24 30,28 Q40,32 50,28" fill="none" stroke="#7c3aed" strokeWidth="0.5" opacity="0.35" />
    {/* 에너지 코어 */}
    <circle cx="30" cy="26" r="6" fill="#7c3aed" opacity="0.4" className="engine-flame" />
    <circle cx="30" cy="26" r="3" fill="#c084fc" opacity="0.6" />
    {/* 라이트 링 */}
    {[0,1,2,3,4,5,6,7].map(i => {
      const a = (i / 8) * Math.PI * 2;
      return <circle key={i} cx={30 + Math.cos(a) * 20} cy={28 + Math.sin(a) * 8} r="1.2"
        fill={i % 2 === 0 ? "#7c3aed" : "#a855f7"} opacity="0.5" className="engine-flame" />;
    })}
    {/* 하부 캐논 */}
    <rect x="27" y="36" width="6" height="4" rx="1" fill="#08031a" />
    <circle cx="30" cy="42" r="2" fill="#6b21a8" opacity="0.5" className="engine-flame" />
    {hit && <DarkShieldHit w={60} h={50} />}
  </svg>
);

/* ===== Dark Carrier (그림자 모선) ===== */
export const DarkCarrierUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 80, hit }) => (
  <svg viewBox="0 0 80 40" width={size} height={(size * 40) / 80}>
    {/* 그림자 오라 */}
    <ellipse cx="40" cy="22" rx="39" ry="18" fill="#7c3aed" opacity="0.04" />
    {/* 실드 링 */}
    <ellipse cx="40" cy="22" rx="38" ry="16" fill="none" stroke="#7c3aed" strokeWidth="0.4" opacity="0.15" strokeDasharray="4 3" />
    {/* 메인 선체 */}
    <ellipse cx="40" cy="22" rx="36" ry="13" fill="#0d0518" stroke="#08030f" strokeWidth="1" />
    {/* 상부 */}
    <ellipse cx="40" cy="20" rx="32" ry="10" fill="#1a0a28" />
    {/* 그림자 정맥 */}
    <path d="M12,22 Q26,18 40,22 Q54,26 68,22" fill="none" stroke="#7c3aed" strokeWidth="0.4" opacity="0.35" />
    <path d="M20,18 L32,20 L48,17 L60,20" fill="none" stroke="#a855f7" strokeWidth="0.3" opacity="0.25" />
    <path d="M16,24 L28,26 L40,23 L52,26 L64,24" fill="none" stroke="#6b21a8" strokeWidth="0.3" opacity="0.2" />
    {/* 브릿지 */}
    <rect x="32" y="12" width="16" height="8" rx="3" fill="#150825" stroke="#7c3aed" strokeWidth="0.5" opacity="0.8" />
    <rect x="35" y="14" width="10" height="4" rx="2" fill="#7c3aed" opacity="0.15" />
    {/* 도킹 포트 */}
    <circle cx="18" cy="22" r="3" fill="#08030f" stroke="#a855f7" strokeWidth="0.4" />
    <circle cx="18" cy="22" r="1.5" fill="#a855f7" opacity="0.4" className="engine-flame" />
    <circle cx="62" cy="22" r="3" fill="#08030f" stroke="#a855f7" strokeWidth="0.4" />
    <circle cx="62" cy="22" r="1.5" fill="#a855f7" opacity="0.4" className="engine-flame" />
    {/* 윈도우 */}
    {[26,32,38,44,50,56].map((x,i) => <rect key={i} x={x} y="20" width="2.5" height="1.5" rx="0.5" fill="#c084fc" opacity="0.35" />)}
    {/* 엔진 */}
    <ellipse cx="14" cy="30" rx="4" ry="2" fill="#6b21a8" opacity="0.4" className="engine-flame" />
    <ellipse cx="40" cy="32" rx="5" ry="2" fill="#6b21a8" opacity="0.4" className="engine-flame" />
    <ellipse cx="66" cy="30" rx="4" ry="2" fill="#6b21a8" opacity="0.4" className="engine-flame" />
    {hit && <DarkShieldHit w={80} h={40} />}
  </svg>
);

/* ===== Dark Elite (공허 엘리트) ===== */
export const DarkEliteUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 48, hit }) => (
  <svg viewBox="0 0 48 48" width={size} height={size}>
    {/* 공허 트레일 */}
    <path d="M24,46 L20,38 L24,40 L28,38Z" fill="#6b21a8" opacity="0.2" className="engine-flame" />
    {/* 다이아몬드 바디 */}
    <path d="M24,4 L44,24 L24,44 L4,24Z" fill="#1a0530" stroke="#0d0218" strokeWidth="1" />
    {/* 내부 */}
    <path d="M24,10 L38,24 L24,38 L10,24Z" fill="#2d0a4a" opacity="0.6" />
    {/* 코어 */}
    <path d="M24,16 L32,24 L24,32 L16,24Z" fill="#7c3aed" opacity="0.3" />
    {/* 공허 맥 */}
    <line x1="24" y1="8" x2="24" y2="40" stroke="#a855f7" strokeWidth="0.3" opacity="0.3" />
    <line x1="8" y1="24" x2="40" y2="24" stroke="#a855f7" strokeWidth="0.3" opacity="0.3" />
    {/* 공허 눈 */}
    <ellipse cx="24" cy="22" rx="5" ry="4" fill="#0a0210" />
    <ellipse cx="24" cy="22" rx="3.5" ry="2.5" fill="#c084fc" opacity="0.85" />
    <circle cx="24" cy="22" r="1.5" fill="#7c3aed" />
    {/* 사이드 캐논 */}
    <circle cx="8" cy="24" r="2.5" fill="#0d0218" stroke="#a855f7" strokeWidth="0.4" />
    <circle cx="8" cy="24" r="1" fill="#a855f7" opacity="0.5" className="engine-flame" />
    <circle cx="40" cy="24" r="2.5" fill="#0d0218" stroke="#a855f7" strokeWidth="0.4" />
    <circle cx="40" cy="24" r="1" fill="#a855f7" opacity="0.5" className="engine-flame" />
    {hit && <DarkShieldHit w={48} h={48} />}
  </svg>
);

/* ===== Dark Boss (공허 보스) ===== */
export const DarkBossSvg: React.FC<{ size?: number; hpRatio?: number; hit?: boolean }> = ({ size = 160, hpRatio = 1, hit }) => {
  const phase = hpRatio > 0.5 ? 0 : hpRatio > 0.25 ? 1 : 2;
  const C = [
    { hull: "#0d0518", hullLt: "#1a0a30", glow: "#7c3aed", eye: "#c084fc", vein: "#6b21a8" },
    { hull: "#08030f", hullLt: "#150825", glow: "#6b21a8", eye: "#a855f7", vein: "#581c87" },
    { hull: "#050208", hullLt: "#0d0518", glow: "#581c87", eye: "#9333ea", vein: "#4c1d95" },
  ][phase];
  const w = 160, h = 120;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={(size * h) / w}>
      {/* 어둠 오라 (빛 흡수) */}
      <ellipse cx="80" cy="60" rx="78" ry="56" fill="#000" opacity="0.15" />
      <ellipse cx="80" cy="60" rx="75" ry="52" fill={C.glow} opacity="0.05" className="boss-shield" />
      {/* 메인 선체 */}
      <ellipse cx="80" cy="62" rx="70" ry="28" fill={C.hull} stroke={C.vein} strokeWidth="0.8" opacity="0.95" />
      <ellipse cx="80" cy="58" rx="65" ry="24" fill={C.hullLt} />
      {/* 공허 정맥 */}
      <path d="M20,60 Q50,50 80,60 Q110,70 140,60" fill="none" stroke={C.vein} strokeWidth="0.8" opacity="0.5" />
      <path d="M30,52 L55,56 L80,50 L105,56 L130,52" fill="none" stroke={C.glow} strokeWidth="0.5" opacity="0.3" />
      <path d="M25,68 L50,72 L80,66 L110,72 L135,68" fill="none" stroke={C.vein} strokeWidth="0.4" opacity="0.25" />
      <path d="M40,55 Q60,48 80,55 Q100,62 120,55" fill="none" stroke={C.glow} strokeWidth="0.3" opacity="0.2" />
      {/* 공허 촉수 */}
      <path d="M30,42 Q18,22 12,8" fill="none" stroke={C.glow} strokeWidth="1.5" opacity="0.5" />
      <path d="M25,45 Q15,28 8,15" fill="none" stroke={C.vein} strokeWidth="0.8" opacity="0.3" />
      <circle cx="12" cy="8" r="2.5" fill={C.eye} opacity="0.5" className="engine-flame" />
      <path d="M130,42 Q142,22 148,8" fill="none" stroke={C.glow} strokeWidth="1.5" opacity="0.5" />
      <path d="M135,45 Q145,28 152,15" fill="none" stroke={C.vein} strokeWidth="0.8" opacity="0.3" />
      <circle cx="148" cy="8" r="2.5" fill={C.eye} opacity="0.5" className="engine-flame" />
      {/* 추가 촉수 (어둠 고유) */}
      <path d="M45,46 Q35,30 28,18" fill="none" stroke={C.vein} strokeWidth="1" opacity="0.3" />
      <path d="M115,46 Q125,30 132,18" fill="none" stroke={C.vein} strokeWidth="1" opacity="0.3" />
      {/* 브릿지 */}
      <path d="M60,38 Q80,20 100,38" fill={C.hullLt} stroke={C.glow} strokeWidth="0.5" />
      <path d="M65,38 Q80,26 95,38" fill={C.glow} opacity="0.1" />
      {/* 중앙 대형 눈 */}
      <ellipse cx="80" cy="48" rx="13" ry="9" fill="#020108" stroke={C.glow} strokeWidth="1" />
      <ellipse cx="80" cy="48" rx="9" ry="6" fill={C.eye} opacity="0.7" />
      <ellipse cx="80" cy="48" rx="5" ry="3.5" fill={C.glow} opacity="0.8" />
      <circle cx="80" cy="48" r="2" fill="#fff" opacity="0.3" />
      <ellipse cx="78" cy="46" rx="2" ry="1.5" fill="rgba(192,132,252,0.4)" />
      {/* 사이드 눈 */}
      <ellipse cx="45" cy="54" rx="5" ry="3.5" fill="#020108" />
      <ellipse cx="45" cy="54" rx="3" ry="2" fill={C.eye} opacity="0.6" />
      <circle cx="45" cy="54" r="1" fill={C.glow} />
      <ellipse cx="115" cy="54" rx="5" ry="3.5" fill="#020108" />
      <ellipse cx="115" cy="54" rx="3" ry="2" fill={C.eye} opacity="0.6" />
      <circle cx="115" cy="54" r="1" fill={C.glow} />
      {/* 추가 작은 눈 (어둠 고유) */}
      <ellipse cx="60" cy="58" rx="3" ry="2" fill="#020108" />
      <ellipse cx="60" cy="58" rx="1.8" ry="1.2" fill={C.eye} opacity="0.5" />
      <ellipse cx="100" cy="58" rx="3" ry="2" fill="#020108" />
      <ellipse cx="100" cy="58" rx="1.8" ry="1.2" fill={C.eye} opacity="0.5" />
      {/* 캐논 포트 */}
      {[30,55,105,130].map((x,i) => (
        <React.Fragment key={i}>
          <rect x={x-3} y="72" width="6" height="8" rx="2" fill={C.hull} stroke={C.vein} strokeWidth="0.4" />
          <circle cx={x} cy="82" r="2.5" fill={C.glow} opacity="0.5" className="engine-flame" />
        </React.Fragment>
      ))}
      {/* 라이트 링 */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={80 + Math.cos(a) * 55} cy={62 + Math.sin(a) * 22} r="1.5"
          fill={i % 2 === 0 ? C.glow : C.eye} opacity="0.4" className="engine-flame" />;
      })}
      {/* 엔진 */}
      <ellipse cx="35" cy="80" rx="8" ry="3" fill={C.glow} opacity="0.35" className="engine-flame" />
      <ellipse cx="80" cy="85" rx="10" ry="4" fill={C.glow} opacity="0.35" className="engine-flame" />
      <ellipse cx="125" cy="80" rx="8" ry="3" fill={C.glow} opacity="0.35" className="engine-flame" />
      {/* 어둠 파티클 */}
      <circle cx="22" cy="38" r="1.5" fill={C.eye} opacity="0.3" className="engine-flame" />
      <circle cx="138" cy="42" r="1.2" fill={C.eye} opacity="0.25" className="engine-flame" />
      <circle cx="55" cy="28" r="1" fill={C.glow} opacity="0.3" className="engine-flame" />
      <circle cx="105" cy="30" r="1.3" fill={C.glow} opacity="0.25" className="engine-flame" />
      {hit && <DarkShieldHit w={w} h={h} />}
    </svg>
  );
};
