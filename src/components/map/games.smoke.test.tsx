import React from "react";
import { act, render } from "@testing-library/react";
import NumberLaneGame from "components/map/NumberLaneGame";
import ZoombieGame from "components/map/ZoombieGame";
import SpaceShooterMode from "components/map/SpaceShooterMode";

/**
 * 세 게임 모두 requestAnimationFrame 루프로 굴러가므로, 마운트만 해서는
 * 루프 안의 회귀를 잡을 수 없다. rAF 를 직접 몰아서 실제로 프레임을 돌린다.
 *
 * StrictMode 로 감싸는 것이 중요하다. App.tsx 가 StrictMode 를 쓰고 있고,
 * 게임 루프의 상태 업데이터 안에는 부수효과가 들어 있어서
 * 업데이터가 두 번 호출될 때 깨지는지가 실제 위험 지점이다.
 */

let rafCallbacks: FrameRequestCallback[] = [];
let clock = 0;

/** rAF 를 우리가 직접 몰 수 있게 바꿔 끼운다. 가짜 타이머를 켜면 rAF 도 같이
 *  덮어써지므로, 그 뒤에 다시 불러 우리 것으로 되돌려야 한다. */
const installRafMock = () => {
  jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
};

beforeEach(() => {
  rafCallbacks = [];
  clock = 0;
  installRafMock();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** 16ms 씩 n 프레임을 실제로 실행한다 */
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    const pending = rafCallbacks;
    rafCallbacks = [];
    clock += 16;
    act(() => {
      pending.forEach((cb) => cb(clock));
    });
  }
};

describe("게임 루프 스모크", () => {
  test("숫자를 더하라: 120프레임 동안 죽지 않는다", () => {
    render(
      <React.StrictMode>
        <NumberLaneGame onExit={() => {}} />
      </React.StrictMode>,
    );
    expect(() => runFrames(120)).not.toThrow();
    expect(rafCallbacks.length).toBeGreaterThan(0); // 루프가 계속 살아 있다
  });

  test("좀비를 무찔러라: 180프레임 동안 죽지 않는다", () => {
    render(
      <React.StrictMode>
        <ZoombieGame onExit={() => {}} />
      </React.StrictMode>,
    );
    expect(() => runFrames(180)).not.toThrow();
    expect(rafCallbacks.length).toBeGreaterThan(0);
  });

  test("우주를 지켜라: 챕터 연출을 지나 120프레임 동안 죽지 않는다", async () => {
    render(
      <React.StrictMode>
        <SpaceShooterMode onExit={() => {}} />
      </React.StrictMode>,
    );

    // "chapter" 모드는 1.2초 뒤 자동으로 playing 으로 넘어간다.
    // 가짜 타이머를 쓰면 rAF 까지 같이 덮여서 루프 제어가 꼬이므로 실제로 기다린다.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });

    expect(() => runFrames(120)).not.toThrow();
    expect(rafCallbacks.length).toBeGreaterThan(0);
  });
});
