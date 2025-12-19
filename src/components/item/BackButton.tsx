import React from "react";

const BackButton = ({ onExit }: { onExit: () => void }) => {
  return (
    <button
      onClick={onExit}
      style={{ position: "absolute", top: 12, left: 12, zIndex: 50 }}
    >
      ←
    </button>
  );
};

export default BackButton;
