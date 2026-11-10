import { describe, expect, it } from "vitest";
import App from "./App";
import { WealthTrackApp } from "./components/WealthTrackApp";

describe("application entry view", () => {
  it("mounts the finance workspace", () => {
    expect(App()).toMatchObject({ type: WealthTrackApp });
  });
});
