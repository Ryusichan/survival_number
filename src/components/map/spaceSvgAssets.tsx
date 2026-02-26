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
    <defs>
      <linearGradient id="wcg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <rect x="2" y="6" width="24" height="18" rx="3" fill="url(#wcg)" stroke="#92400e" strokeWidth="1.2" />
    <rect x="4" y="8" width="8" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
    <rect x="11" y="13" width="6" height="3" rx="1" fill="#92400e" />
    <circle cx="14" cy="14.5" r="1.5" fill="#fde68a" />
    <line x1="7" y1="6" x2="7" y2="3" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="6" x2="14" y2="2" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="21" y1="6" x2="21" y2="3" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ===== 아이템: 연사 부스트 (Fire rate) ===== */
export const ItemFireRateSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="frg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <polygon points="14,2 18,10 26,11 20,17 22,26 14,21 6,26 8,17 2,11 10,10" fill="url(#frg)" stroke="#1e40af" strokeWidth="0.8" />
    <polygon points="14,7 16,12 21,12.5 17,16 18,21 14,18 10,21 11,16 7,12.5 12,12" fill="#93c5fd" opacity="0.5" />
    <path d="M11,12 L14,8 L17,12" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M12,15 L14,11 L16,15" fill="none" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/* ===== 아이템: 데미지 업 ===== */
export const ItemDamageUpSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="dug" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <circle cx="14" cy="14" r="12" fill="url(#dug)" stroke="#065f46" strokeWidth="1" />
    <circle cx="14" cy="14" r="8" fill="#065f46" opacity="0.3" />
    <path d="M14,6 L16,12 L22,12 L17,16 L19,22 L14,18 L9,22 L11,16 L6,12 L12,12Z" fill="#a7f3d0" opacity="0.6" />
    <path d="M14,8 L14,20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M8,14 L20,14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ===== 아이템: 관통 ===== */
export const ItemPierceSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="pig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
    </defs>
    <path d="M14,2 L26,14 L14,26 L2,14Z" fill="url(#pig)" stroke="#9d174d" strokeWidth="1" />
    <path d="M14,7 L21,14 L14,21 L7,14Z" fill="#fce7f3" opacity="0.35" />
    <path d="M14,4 L14,24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    <path d="M10,10 L14,4 L18,10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <path d="M10,18 L14,12 L18,18" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
  </svg>
);

/* ===== 아이템: 클론 추가 ===== */
export const ItemCloneSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="clg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <circle cx="14" cy="14" r="12" fill="url(#clg)" stroke="#5b21b6" strokeWidth="1" />
    <circle cx="10" cy="11" r="4" fill="#ede9fe" opacity="0.7" />
    <rect x="7" y="16" width="6" height="7" rx="2" fill="#ede9fe" opacity="0.5" />
    <circle cx="19" cy="11" r="3.5" fill="#ddd6fe" opacity="0.6" />
    <rect x="16.5" y="15.5" width="5" height="6" rx="2" fill="#ddd6fe" opacity="0.4" />
    <circle cx="14" cy="22" r="1" fill="#fff" opacity="0.6" />
  </svg>
);

/* ===== 아이템: HP 회복 알약 (Heal pill) ===== */
export const ItemHealPillSvg: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size}>
    <defs>
      <linearGradient id="hpg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6b6b" />
        <stop offset="50%" stopColor="#ff6b6b" />
        <stop offset="50%" stopColor="#fff" />
        <stop offset="100%" stopColor="#e8e8e8" />
      </linearGradient>
      <filter id="pillGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* 글로우 */}
    <ellipse cx="14" cy="14" rx="10" ry="12" fill="#ff6b6b" opacity="0.2" className="engine-flame" />
    {/* 캡슐 본체 */}
    <rect x="6" y="4" width="16" height="20" rx="8" fill="url(#hpg1)" stroke="#d44" strokeWidth="1" />
    {/* 캡슐 분리선 */}
    <line x1="6" y1="14" x2="22" y2="14" stroke="#d44" strokeWidth="0.8" opacity="0.6" />
    {/* 십자 마크 */}
    <rect x="12" y="6.5" width="4" height="10" rx="1" fill="#fff" opacity="0.85" />
    <rect x="9" y="9" width="10" height="4" rx="1" fill="#fff" opacity="0.85" />
    {/* 하이라이트 */}
    <rect x="8.5" y="6" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.4)" />
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
