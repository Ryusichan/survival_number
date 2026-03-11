import React from "react";

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  padding: 0,
};

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
    <rect x="5" y="3" width="5" height="18" rx="1.5" />
    <rect x="14" y="3" width="5" height="18" rx="1.5" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
    <path d="M6 3.5v17a1 1 0 001.5.86l14-8.5a1 1 0 000-1.72l-14-8.5A1 1 0 006 3.5z" />
  </svg>
);

const BackButton = ({
  onExit,
  onPause,
  isPaused,
}: {
  onExit: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "max(10px, env(safe-area-inset-top))",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 12px",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <button onClick={onExit} style={{ ...btnStyle, pointerEvents: "auto" }}>
        <BackIcon />
      </button>
      {onPause && (
        <button
          onClick={onPause}
          style={{ ...btnStyle, pointerEvents: "auto" }}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>
      )}
    </div>
  );
};

export default BackButton;
