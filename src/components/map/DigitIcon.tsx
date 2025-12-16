// DigitIcon.tsx
import React from "react";

interface DigitIconProps {
  value: number;
  size?: number; // px
}

const DigitIcon: React.FC<DigitIconProps> = ({ value, size = 64 }) => {
  // 혹시 12 같은 숫자가 들어와도 한 자리만 쓰고 싶으면:
  const digit = Math.max(0, Math.min(9, Number(String(value).slice(-1))));

  return (
    <img
      src={`/count/${digit}.svg`} // public/digits/0.svg ~ 9.svg
      alt={String(digit)}
      style={{
        width: size,
        height: "auto",
        display: "block",
        pointerEvents: "none",
        userSelect: "none",
        margin: "0 -12px",
      }}
    />
  );
};

export default DigitIcon;
