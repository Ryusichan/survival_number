import React, { useState } from "react";
import NumberLaneGame from "./map/NumberLaneGame";
import ZoombieGame from "./map/ZoombieGame";
import SpaceShooterMode from "./map/SpaceShooterMode";
import styled, { keyframes } from "styled-components";

/* ===== animations ===== */
const float = keyframes`
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-4px); }
`;
const burstLoop = keyframes`
  0%,8%  { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
  28%    { opacity: 1; }
  40%    { transform: translate(calc(var(--dx) * 3.5), calc(var(--dy) * 3.5)) scale(0); opacity: 0; }
  100%   { opacity: 0; }
`;
const scanMove = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;
const blink = keyframes`
  0%,100% { opacity: 1; }
  50%     { opacity: 0.3; }
`;

/* ===== layout ===== */
const Wrap = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #0a0a14;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: clamp(16px, 4vh, 48px) 24px clamp(16px, 3vh, 24px);
  box-sizing: border-box;
  position: relative;

  /* scanline overlay */
  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.08) 2px,
      rgba(0, 0, 0, 0.08) 4px
    );
    pointer-events: none;
    z-index: 100;
  }
`;

/* slow-moving scanline bar */
const ScanBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(34, 211, 238, 0.08);
  box-shadow: 0 0 12px 4px rgba(34, 211, 238, 0.06);
  animation: ${scanMove} 6s linear infinite;
  pointer-events: none;
  z-index: 99;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: clamp(12px, 3vh, 28px);
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

/* pixel firework particle */
const Px = styled.div<{ $c: string; $dx: string; $dy: string; $del: string }>`
  position: absolute;
  width: 5px;
  height: 5px;
  background: ${(p) => p.$c};
  image-rendering: pixelated;
  --dx: ${(p) => p.$dx};
  --dy: ${(p) => p.$dy};
  left: 50%;
  top: 50%;
  animation: ${burstLoop} 2.4s ${(p) => p.$del} ease-out infinite;
  pointer-events: none;
`;

/* firework data */
const FW: { c: string; dx: string; dy: string; d: string }[] = [
  { c: "#fbbf24", dx: "-38px", dy: "-28px", d: "0s" },
  { c: "#f97316", dx: "-50px", dy: "-10px", d: "0.05s" },
  { c: "#fbbf24", dx: "-30px", dy: "-44px", d: "0.1s" },
  { c: "#fde68a", dx: "-55px", dy: "-32px", d: "0.08s" },
  { c: "#f97316", dx: "-22px", dy: "-18px", d: "0.12s" },
  { c: "#fde68a", dx: "-44px", dy: "-48px", d: "0.03s" },
  { c: "#ef4444", dx: "40px", dy: "-30px", d: "0.6s" },
  { c: "#f472b6", dx: "52px", dy: "-14px", d: "0.65s" },
  { c: "#ef4444", dx: "28px", dy: "-46px", d: "0.7s" },
  { c: "#fca5a5", dx: "56px", dy: "-36px", d: "0.68s" },
  { c: "#f472b6", dx: "34px", dy: "-20px", d: "0.72s" },
  { c: "#fca5a5", dx: "48px", dy: "-50px", d: "0.63s" },
  { c: "#a855f7", dx: "-8px", dy: "-52px", d: "1.2s" },
  { c: "#60a5fa", dx: "10px", dy: "-58px", d: "1.25s" },
  { c: "#c084fc", dx: "-18px", dy: "-60px", d: "1.3s" },
  { c: "#60a5fa", dx: "22px", dy: "-50px", d: "1.28s" },
  { c: "#a855f7", dx: "4px", dy: "-66px", d: "1.22s" },
  { c: "#c084fc", dx: "-26px", dy: "-46px", d: "1.35s" },
  { c: "#4ade80", dx: "-48px", dy: "8px", d: "1.8s" },
  { c: "#34d399", dx: "-36px", dy: "16px", d: "1.85s" },
  { c: "#4ade80", dx: "-56px", dy: "-4px", d: "1.9s" },
  { c: "#6ee7b7", dx: "-42px", dy: "22px", d: "1.88s" },
  { c: "#22d3ee", dx: "46px", dy: "10px", d: "0.3s" },
  { c: "#67e8f9", dx: "38px", dy: "20px", d: "0.35s" },
  { c: "#22d3ee", dx: "54px", dy: "-2px", d: "0.38s" },
  { c: "#67e8f9", dx: "42px", dy: "26px", d: "0.32s" },
];

const Sub = styled.div`
  font-family: "Press Start 2P", monospace;
  font-weight: 400;
  font-size: clamp(8px, 2vw, 10px);
  color: rgba(255, 255, 255, 0.35);
  margin-top: 8px;
  letter-spacing: 2px;
`;

/* ===== pixel block title SVG ===== */
const BK = 9;
const BG_ = 1.5;
const BT = BK + BG_;
const ROWS = 7;
const ROW_GAP = 2;
const LETTER_GAP = 2;

const PX_FONT: Record<string, number[][]> = {
  M: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  I: [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
  N: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  G: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  E: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
};

const TITLE_WORDS = [
  { word: "MINI", colors: ["#fbbf24", "#22d3ee", "#ef4444", "#4ade80"] },
  { word: "GAME", colors: ["#4ade80", "#f97316", "#fbbf24", "#a855f7"] },
];

const wordCellWidth = (w: string) =>
  w.split("").reduce((sum, ch) => sum + PX_FONT[ch][0].length, 0) +
  (w.length - 1) * LETTER_GAP;
const MAX_COLS = Math.max(...TITLE_WORDS.map((r) => wordCellWidth(r.word)));
const SVG_W = MAX_COLS * BT;
const SVG_H = (ROWS * 2 + ROW_GAP) * BT;
const PAD = 14;

function PixelTitle() {
  const blocks: React.ReactNode[] = [];
  let k = 0;

  TITLE_WORDS.forEach((row, ri) => {
    const wCells = wordCellWidth(row.word);
    const ox = ((MAX_COLS - wCells) / 2) * BT;
    const oy = ri * (ROWS + ROW_GAP) * BT;
    let cx = ox;

    for (let li = 0; li < row.word.length; li++) {
      const grid = PX_FONT[row.word[li]];
      const color = row.colors[li];

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (!grid[r][c]) continue;
          const x = cx + c * BT;
          const y = oy + r * BT;
          blocks.push(
            <g key={k++}>
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={BK}
                height={BK}
                rx={1.5}
                fill="rgba(0,0,0,0.4)"
              />
              <rect x={x} y={y} width={BK} height={BK} rx={1.5} fill={color} />
              <rect
                x={x}
                y={y}
                width={BK}
                height={BK * 0.45}
                rx={1.5}
                fill="rgba(255,255,255,0.35)"
              />
              <rect
                x={x + 2}
                y={y + 1.5}
                width={3}
                height={2}
                rx={0.8}
                fill="rgba(255,255,255,0.5)"
              />
              <rect
                x={x}
                y={y + BK * 0.7}
                width={BK}
                height={BK * 0.3}
                rx={1}
                fill="rgba(0,0,0,0.15)"
              />
            </g>,
          );
        }
      }
      cx += (grid[0].length + LETTER_GAP) * BT;
    }
  });

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${SVG_W + PAD * 2} ${SVG_H + PAD * 2}`}
      style={{
        width: "clamp(260px, 68vw, 360px)",
        height: "auto",
        display: "block",
      }}
    >
      <defs>
        <filter id="pxGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="pxSweep" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#fff" stopOpacity={0} />
          <stop offset="42%" stopColor="#fff" stopOpacity={0} />
          <stop offset="50%" stopColor="#fff" stopOpacity={0.25} />
          <stop offset="58%" stopColor="#fff" stopOpacity={0} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g filter="url(#pxGlow)">{blocks}</g>
    </svg>
  );
}

/* ===== retro frame ===== */
const Frame = styled.div`
  width: 100%;
  max-width: 400px;
  background: #0c0c1e;
  position: relative;
  z-index: 2;

  /* pixel double border */
  border: 3px solid #22d3ee;
  outline: 3px solid #0e2a34;
  box-shadow:
    0 0 0 6px #163040,
    0 0 30px rgba(34, 211, 238, 0.12),
    inset 0 0 40px rgba(0, 0, 0, 0.4);

  padding: clamp(6px, 1.5vw, 10px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.5vw, 8px);
`;

/* corner pixel dots on the frame */
const CornerDot = styled.div<{ $pos: string }>`
  position: absolute;
  width: 6px;
  height: 6px;
  background: #22d3ee;
  box-shadow: 0 0 6px #22d3ee;
  z-index: 3;
  ${(p) => p.$pos};
`;

/* ===== retro game card ===== */
const Card = styled.div<{ $accent: string }>`
  cursor: pointer;
  position: relative;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 16 / 7;
  @media (max-height: 700px) {
    aspect-ratio: 16 / 6;
  }
  border: 2px solid ${(p) => p.$accent};
  background: #080814;
  image-rendering: auto;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  &:hover {
    border-color: #fff;
    box-shadow:
      0 0 12px ${(p) => p.$accent}55,
      inset 0 0 16px ${(p) => p.$accent}18;
  }
  &:active {
    filter: brightness(0.85);
  }
`;

const CardImg = styled.div<{ $bg: string }>`
  position: absolute;
  inset: 0;
  background-image: url(${(p) => p.$bg});
  background-size: cover;
  background-position: center;
`;

/* dark vignette overlay for the card */
const CardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.15) 0%,
    transparent 30%,
    transparent 60%,
    rgba(0, 0, 0, 0.5) 100%
  );
`;

/* title label - top left pixel tag */
const TitleTag = styled.div<{ $accent: string }>`
  position: absolute;
  top: 0;
  left: 0;
  padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
  background: rgba(0, 0, 0, 0.8);
  border-right: 2px solid ${(p) => p.$accent};
  border-bottom: 2px solid ${(p) => p.$accent};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TitleText = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: clamp(16px, 3.2vw, 16px);
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  line-height: 1.4;
`;

/* PLAY button - right side */
const PlayBtn = styled.div<{ $accent: string }>`
  position: absolute;
  right: clamp(6px, 1.5vw, 10px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: clamp(5px, 1.2vw, 7px) clamp(8px, 2vw, 14px);
  background: rgba(0, 0, 0, 0.75);
  border: 2px solid ${(p) => p.$accent};
  font-family: "Press Start 2P", monospace;
  font-size: clamp(8px, 2vw, 10px);
  color: ${(p) => p.$accent};
  letter-spacing: 1px;
  transition: all 0.15s;

  ${Card}:hover & {
    background: ${(p) => p.$accent};
    color: #000;
    box-shadow: 0 0 10px ${(p) => p.$accent}88;
    animation: ${float} 1s ease-in-out infinite;
  }

  /* play triangle */
  &::before {
    content: "";
    display: block;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 8px solid currentColor;
  }
`;

/* ===== decorative stars ===== */
const twinkle = keyframes`
  0%,100% { opacity: 0.1; }
  50%     { opacity: 0.5; }
`;
const Star = styled.div<{ $x: string; $y: string; $d: string; $s: number }>`
  position: fixed;
  left: ${(p) => p.$x};
  top: ${(p) => p.$y};
  width: ${(p) => p.$s}px;
  height: ${(p) => p.$s}px;
  background: #fff;
  animation: ${twinkle} ${(p) => p.$d} ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
`;

const STARS = [
  { x: "5%", y: "10%", d: "2.5s", s: 2 },
  { x: "20%", y: "5%", d: "3.2s", s: 2 },
  { x: "75%", y: "7%", d: "2.8s", s: 2 },
  { x: "92%", y: "15%", d: "3.6s", s: 2 },
  { x: "12%", y: "88%", d: "3.0s", s: 2 },
  { x: "50%", y: "94%", d: "2.2s", s: 2 },
  { x: "85%", y: "80%", d: "3.4s", s: 2 },
  { x: "35%", y: "3%", d: "2.6s", s: 2 },
  { x: "60%", y: "90%", d: "3.1s", s: 2 },
  { x: "45%", y: "50%", d: "4.0s", s: 1 },
  { x: "88%", y: "45%", d: "3.5s", s: 1 },
  { x: "8%", y: "55%", d: "2.9s", s: 1 },
];

/* blinking cursor decoration on frame bottom */
const Cursor = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: 8px;
  color: #22d3ee;
  text-align: center;
  padding: 4px 0 2px;
  animation: ${blink} 1s step-end infinite;
  letter-spacing: 1px;
`;

/* ===== component ===== */
const GAMES = [
  {
    id: "zoombieGame" as const,
    img: "/bg/zombie_open.webp",
    accent: "#4ade80",
    title: "좀비를 무찔러라!!",
  },
  {
    id: "addGame" as const,
    img: "/bg/number_open.webp",
    accent: "#60a5fa",
    title: "숫자를 더하라!!!",
  },
  {
    id: "spaceGame" as const,
    img: "/bg/space_open.webp",
    accent: "#a78bfa",
    title: "우주를 지켜라!!",
  },
];

const SelectMap = () => {
  const [select, setSelect] = useState<
    "" | "addGame" | "zoombieGame" | "spaceGame"
  >("");
  const backSelectMode = () => setSelect("");

  if (select === "addGame")
    return <NumberLaneGame key={select} onExit={backSelectMode} />;
  if (select === "zoombieGame")
    return <ZoombieGame key={select} onExit={backSelectMode} />;
  if (select === "spaceGame")
    return <SpaceShooterMode key={select} onExit={backSelectMode} />;

  return (
    <Wrap>
      <ScanBar />
      {STARS.map((s, i) => (
        <Star key={i} $x={s.x} $y={s.y} $d={s.d} $s={s.s} />
      ))}

      <Header>
        {FW.map((p, i) => (
          <Px key={i} $c={p.c} $dx={p.dx} $dy={p.dy} $del={p.d} />
        ))}
        <PixelTitle />
        <Sub>SELECT YOUR GAME</Sub>
      </Header>

      <Frame>
        <Cursor>▼ SELECT ▼</Cursor>
        {/* corner dots */}
        <CornerDot $pos="top: -4px; left: -4px;" />
        <CornerDot $pos="top: -4px; right: -4px;" />
        <CornerDot $pos="bottom: -4px; left: -4px;" />
        <CornerDot $pos="bottom: -4px; right: -4px;" />

        {GAMES.map((g) => (
          <Card key={g.id} $accent={g.accent} onClick={() => setSelect(g.id)}>
            <CardImg $bg={g.img} />
            <CardOverlay />
            <TitleTag $accent={g.accent}>
              <TitleText>{g.title}</TitleText>
            </TitleTag>
            <PlayBtn $accent={g.accent}>PLAY</PlayBtn>
          </Card>
        ))}
      </Frame>
    </Wrap>
  );
};

export default SelectMap;
