import React from "react";

const BackButton = ({ onExit }: { onExit: () => void }) => {
  return (
    <button
      onClick={onExit}
      style={{ position: "absolute", top: 12, left: 12, zIndex: 50, borderRadius: '50%', padding: '8px', width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}
    >
      ←
    </button>
  );
};

export default BackButton;
