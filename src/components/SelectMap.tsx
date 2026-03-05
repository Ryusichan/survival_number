import React, { useState } from "react";
import NumberLaneGame from "./map/NumberLaneGame";
import ZoombieGame from "./map/ZoombieGame";
import SpaceShooterMode from "./map/SpaceShooterMode";
import styled from "styled-components";

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const Bg = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  opacity: 0.9;
`;

const Box = styled.div`
  display: flex;
  width: 100%;
  max-width: 450px;
  justify-content: center;
  flex-direction: column;
  background-color: #ffffff96;
  padding: 24px;
  border-radius: 24px;
  margin: clamp(2rem, 20vh, 12rem) 1rem 2rem 1rem;
  z-index: 5;
  & > div {
    margin-bottom: 14px;
  }
`;

const ButtonBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  & > div {
    cursor: pointer;
    display: flex;
    align-items: flex-end;
    width: calc(50% - 6px);
    padding: 12px;
    border-radius: 12px;
    box-sizing: border-box;
    min-height: clamp(80px, 15vh, 140px);
    opacity: 0.5;
    border: 4px solid #fff;
    transition: opacity 0.3s;
  }
  & > div:hover {
    opacity: 1;
  }
`;

const SelectMap = () => {
  const [select, setSelect] = useState<
    "" | "addGame" | "zoombieGame" | "spaceGame"
  >("");
  const backSelectMode = () => {
    setSelect("");
  };

  if (select === "addGame") {
    return <NumberLaneGame key={select} onExit={backSelectMode} />;
  }

  if (select === "zoombieGame") {
    return <ZoombieGame key={select} onExit={backSelectMode} />;
  }

  if (select === "spaceGame") {
    return <SpaceShooterMode key={select} onExit={backSelectMode} />;
  }
  return (
    <Container>
      <Bg className="select_container" />
      <Box>
        <div
          style={{
            fontSize: 40,
            fontFamily: "Fredoka",
            fontWeight: 600,
          }}
        >
          MiniGame
        </div>
        <div
          style={{
            fontSize: 16,
            fontFamily: "Fredoka",
            fontWeight: 600,
            color: "#525252",
          }}
        >
          원하는 미니게임을 선택하세요
        </div>
        <ButtonBox>
          <div
            className="zoombie_box"
            onClick={() => setSelect("zoombieGame")}
            style={{
              fontSize: 16,
              fontFamily: "Fredoka",
              fontWeight: 600,
              color: "#2e2e2e",
              backgroundColor: "#c2c2c2",
              transition: "1s",
            }}
          >
            좀비를 무찔러라!!
          </div>
          <div
            className="count_box"
            onClick={() => setSelect("addGame")}
            style={{
              fontSize: 16,
              fontFamily: "Fredoka",
              fontWeight: 600,
              color: "#2e2e2e",
              transition: "1s",
            }}
          >
            숫자를 더하라!!!
          </div>
          <div
            onClick={() => setSelect("spaceGame")}
            style={{
              fontSize: 16,
              fontFamily: "Fredoka",
              fontWeight: 600,
              color: "#e0e0e0",
              backgroundColor: "#1a1a3e",
              transition: "1s",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            우주를 지켜라!! 🚀
          </div>
        </ButtonBox>
      </Box>
    </Container>
  );
};

export default SelectMap;
