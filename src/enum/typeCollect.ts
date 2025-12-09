export type Player = {
  lane: number; // 0,1,2...
  value: number; // 내가 들고 있는 숫자
};

export type FallingNum = {
  id: number;
  lane: number;
  y: number; // 위에서 아래로 내려오는 위치 (0~1 사이 비율)
  value: number;
};
