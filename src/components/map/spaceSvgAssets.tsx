import React from "react";

/* ===== Jetpack (캐릭터 등에 부착) ===== */
export const JetpackSvg: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg viewBox="0 0 48 56" width={size} height={size * 56 / 48}>
    {/* 탱크 좌 */}
    <rect x="4" y="8" width="14" height="32" rx="5" fill="#5a6a7a" stroke="#3a4a5a" strokeWidth="1.2" />
    <rect x="6" y="10" width="4" height="8" rx="2" fill="rgba(255,255,255,0.15)" />
    {/* 탱크 우 */}
    <rect x="30" y="8" width="14" height="32" rx="5" fill="#5a6a7a" stroke="#3a4a5a" strokeWidth="1.2" />
    <rect x="32" y="10" width="4" height="8" rx="2" fill="rgba(255,255,255,0.15)" />
    {/* 연결바 */}
    <rect x="16" y="16" width="16" height="6" rx="2" fill="#4a5a6a" />
    {/* 노즐 좌 */}
    <path d="M7,40 L17,40 L15,48 L9,48Z" fill="#3a3a3a" />
    {/* 노즐 우 */}
    <path d="M31,40 L41,40 L39,48 L33,48Z" fill="#3a3a3a" />
    {/* 불꽃 좌 */}
    <ellipse cx="12" cy="52" rx="4" ry="4" fill="#ff6b20" opacity="0.9" className="engine-flame" />
    <ellipse cx="12" cy="52" rx="2.5" ry="3" fill="#ffcc40" className="engine-flame" />
    {/* 불꽃 우 */}
    <ellipse cx="36" cy="52" rx="4" ry="4" fill="#ff6b20" opacity="0.9" className="engine-flame" />
    <ellipse cx="36" cy="52" rx="2.5" ry="3" fill="#ffcc40" className="engine-flame" />
  </svg>
);

/* ===== Scout UFO (작은 정찰기, 초록) ===== */
export const ScoutUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 40, hit }) => (
  <svg viewBox="0 0 40 30" width={size} height={size * 30 / 40}>
    {hit && <rect x="0" y="0" width="40" height="30" fill="white" opacity="0.6" rx="8" />}
    {/* 동체 */}
    <ellipse cx="20" cy="18" rx="18" ry="8" fill="#1a8a6a" stroke="#0d6b50" strokeWidth="1" />
    {/* 콕핏 */}
    <ellipse cx="20" cy="14" rx="8" ry="6" fill="#40d8a8" opacity="0.8" />
    <ellipse cx="18" cy="12" rx="3" ry="2" fill="rgba(255,255,255,0.4)" />
    {/* 엔진 */}
    <circle cx="8" cy="22" r="3" fill="#0fa" opacity="0.5" className="engine-flame" />
    <circle cx="32" cy="22" r="3" fill="#0fa" opacity="0.5" className="engine-flame" />
  </svg>
);

/* ===== Fighter UFO (전투기, 빨강) ===== */
export const FighterUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 50, hit }) => (
  <svg viewBox="0 0 50 40" width={size} height={size * 40 / 50}>
    {hit && <rect x="0" y="0" width="50" height="40" fill="white" opacity="0.6" rx="8" />}
    {/* 날개 */}
    <path d="M5,28 L20,15 L20,28Z" fill="#c0392b" stroke="#922b21" strokeWidth="0.8" />
    <path d="M45,28 L30,15 L30,28Z" fill="#c0392b" stroke="#922b21" strokeWidth="0.8" />
    {/* 동체 */}
    <path d="M25,4 L32,18 L30,34 L20,34 L18,18Z" fill="#e74c3c" stroke="#c0392b" strokeWidth="1" />
    {/* 콕핏 */}
    <ellipse cx="25" cy="14" rx="4" ry="5" fill="#f5b7b1" opacity="0.7" />
    <ellipse cx="24" cy="12" rx="1.5" ry="2" fill="rgba(255,255,255,0.35)" />
    {/* 캐논 */}
    <rect x="6" y="26" width="3" height="8" rx="1" fill="#7b241c" />
    <rect x="41" y="26" width="3" height="8" rx="1" fill="#7b241c" />
    {/* 엔진 */}
    <ellipse cx="25" cy="36" rx="4" ry="3" fill="#ff4500" opacity="0.6" className="engine-flame" />
  </svg>
);

/* ===== Bomber UFO (폭격기, 보라) ===== */
export const BomberUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 60, hit }) => (
  <svg viewBox="0 0 60 50" width={size} height={size * 50 / 60}>
    {hit && <rect x="0" y="0" width="60" height="50" fill="white" opacity="0.6" rx="12" />}
    {/* 본체 */}
    <ellipse cx="30" cy="25" rx="28" ry="16" fill="#6c3483" stroke="#512e5f" strokeWidth="1.2" />
    {/* 외곽 링 */}
    <ellipse cx="30" cy="28" rx="26" ry="10" fill="none" stroke="#a569bd" strokeWidth="1" opacity="0.5" />
    {/* 코어 */}
    <circle cx="30" cy="22" r="10" fill="#8e44ad" />
    <circle cx="30" cy="22" r="6" fill="#d2b4de" opacity="0.6" className="engine-flame" />
    <circle cx="28" cy="20" r="2.5" fill="rgba(255,255,255,0.35)" />
    {/* 하부 */}
    <ellipse cx="30" cy="38" rx="8" ry="4" fill="#4a235a" />
  </svg>
);

/* ===== Carrier UFO (모선, 회색) ===== */
export const CarrierUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 80, hit }) => (
  <svg viewBox="0 0 80 36" width={size} height={size * 36 / 80}>
    {hit && <rect x="0" y="0" width="80" height="36" fill="white" opacity="0.6" rx="8" />}
    {/* 본체 */}
    <path d="M10,20 Q40,2 70,20 L65,30 Q40,36 15,30Z" fill="#5d6d7e" stroke="#4a5568" strokeWidth="1" />
    {/* 상부 구조물 */}
    <rect x="28" y="10" width="24" height="10" rx="4" fill="#717d8a" />
    <rect x="33" y="8" width="14" height="6" rx="3" fill="#85929e" />
    {/* 창문들 */}
    <circle cx="24" cy="22" r="2.5" fill="#aed6f1" opacity="0.7" />
    <circle cx="36" cy="22" r="2.5" fill="#aed6f1" opacity="0.7" />
    <circle cx="48" cy="22" r="2.5" fill="#aed6f1" opacity="0.7" />
    <circle cx="60" cy="22" r="2.5" fill="#aed6f1" opacity="0.7" />
    {/* 엔진 */}
    <ellipse cx="20" cy="32" rx="4" ry="2" fill="#3498db" opacity="0.5" className="engine-flame" />
    <ellipse cx="40" cy="34" rx="4" ry="2" fill="#3498db" opacity="0.5" className="engine-flame" />
    <ellipse cx="60" cy="32" rx="4" ry="2" fill="#3498db" opacity="0.5" className="engine-flame" />
  </svg>
);

/* ===== Elite UFO (엘리트, 금색) ===== */
export const EliteUfo: React.FC<{ size?: number; hit?: boolean }> = ({ size = 48, hit }) => (
  <svg viewBox="0 0 48 48" width={size} height={size}>
    {hit && <rect x="0" y="0" width="48" height="48" fill="white" opacity="0.6" rx="8" />}
    {/* 에너지 날개 */}
    <path d="M4,24 L18,16 L18,32Z" fill="#f1c40f" opacity="0.4" className="engine-flame" />
    <path d="M44,24 L30,16 L30,32Z" fill="#f1c40f" opacity="0.4" className="engine-flame" />
    {/* 다이아몬드 본체 */}
    <path d="M24,4 L38,24 L24,44 L10,24Z" fill="#d4ac0d" stroke="#b7950b" strokeWidth="1" />
    {/* 내부 */}
    <path d="M24,12 L32,24 L24,36 L16,24Z" fill="#f9e154" opacity="0.6" />
    {/* 콕핏 */}
    <circle cx="24" cy="22" r="5" fill="#fdebd0" opacity="0.7" />
    <circle cx="23" cy="20" r="2" fill="rgba(255,255,255,0.4)" />
  </svg>
);

/* ===== Space Boss (대형 보스, stage 30) ===== */
export const SpaceBossSvg: React.FC<{ size?: number; hpRatio?: number; hit?: boolean }> = ({
  size = 160,
  hpRatio = 1,
  hit,
}) => {
  const bodyColor = hpRatio > 0.5 ? "#2c3e50" : hpRatio > 0.25 ? "#922b21" : "#641e16";
  const glowColor = hpRatio > 0.5 ? "#3498db" : hpRatio > 0.25 ? "#e74c3c" : "#ff0000";
  return (
    <svg viewBox="0 0 160 120" width={size} height={size * 120 / 160}>
      {hit && <rect x="0" y="0" width="160" height="120" fill="white" opacity="0.5" rx="12" />}
      {/* 쉴드 */}
      <ellipse cx="80" cy="60" rx="78" ry="55" fill="none" stroke={glowColor} strokeWidth="1.5" opacity="0.3" className="boss-shield" />
      {/* 메인 동체 */}
      <path d="M30,60 Q80,10 130,60 L120,90 Q80,110 40,90Z" fill={bodyColor} stroke="#1a252f" strokeWidth="1.5" />
      {/* 날개 좌 */}
      <path d="M30,60 L4,75 L10,55 L30,50Z" fill={bodyColor} stroke="#1a252f" strokeWidth="1" />
      {/* 날개 우 */}
      <path d="M130,60 L156,75 L150,55 L130,50Z" fill={bodyColor} stroke="#1a252f" strokeWidth="1" />
      {/* 상부 구조물 */}
      <path d="M60,35 Q80,15 100,35 L95,50 Q80,55 65,50Z" fill="#34495e" stroke="#2c3e50" strokeWidth="1" />
      {/* 코어 */}
      <circle cx="80" cy="55" r="14" fill={glowColor} opacity="0.3" className="engine-flame" />
      <circle cx="80" cy="55" r="8" fill={glowColor} opacity="0.6" />
      <circle cx="78" cy="52" r="3" fill="rgba(255,255,255,0.4)" />
      {/* 캐논 포트 */}
      <rect x="20" y="70" width="8" height="16" rx="2" fill="#1a252f" />
      <rect x="132" y="70" width="8" height="16" rx="2" fill="#1a252f" />
      <rect x="55" y="80" width="6" height="12" rx="2" fill="#1a252f" />
      <rect x="99" y="80" width="6" height="12" rx="2" fill="#1a252f" />
      {/* 엔진 */}
      <ellipse cx="50" cy="95" rx="8" ry="5" fill="#e74c3c" opacity="0.5" className="engine-flame" />
      <ellipse cx="80" cy="100" rx="10" ry="6" fill="#e74c3c" opacity="0.5" className="engine-flame" />
      <ellipse cx="110" cy="95" rx="8" ry="5" fill="#e74c3c" opacity="0.5" className="engine-flame" />
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
