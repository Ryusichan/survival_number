import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("첫 화면에 세 게임의 선택 카드가 뜬다", () => {
  render(<App />);
  expect(screen.getByText("숫자를 더하라!!!")).toBeInTheDocument();
  expect(screen.getByText("좀비를 무찔러라!!")).toBeInTheDocument();
  expect(screen.getByText("우주를 지켜라!!")).toBeInTheDocument();
});
