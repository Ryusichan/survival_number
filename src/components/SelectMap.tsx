import React, { useState } from "react";
import NumberLaneGame from "./map/NumberLaneGame";
import ZoombieGame from "./map/ZoombieGame";
import styled from "styled-components";

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  /* background-color: #cecece; */
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Box = styled.div`
  display: flex;
  width: 100%;
  max-width: 450px;
  min-height: 360px;
  justify-content: center;
  flex-direction: column;
  background-color: #ffffff96;
  padding: 48px;
  border-radius: 36px;
  margin: 12rem 2rem 2rem 2rem;
  & > div {
    margin-bottom: 18px;
  }
`;

const ButtonBox = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 2;
  & > div {
    cursor: pointer;
    display: flex;
    /* align-items: center;
    justify-content: start; */
    width: calc(50% - 12px);
    padding: 12px;
    border-radius: 12px;
    box-sizing: border-box;
    min-height: 180px;
    opacity: 0.5;
    border: 8px solid #fff;
  }
  & > div:hover {
    opacity: 1;
  }
`;

const SelectMap = () => {
  const [select, setSelect] = useState<"" | "addGame" | "zoombieGame">("");
  const backSelectMode = () => {
    setSelect("");
  };

  if (select === "addGame") {
    return <NumberLaneGame key={select} onExit={backSelectMode} />;
  }

  if (select === "zoombieGame") {
    return <ZoombieGame key={select} onExit={backSelectMode} />;
  }
  return (
    <Container className="select_container">
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
        </ButtonBox>
      </Box>
    </Container>
  );
};

export default SelectMap;
