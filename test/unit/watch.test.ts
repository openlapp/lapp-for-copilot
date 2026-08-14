import { describe, expect, it, vi } from "vitest";
import { debounceLeadingTrailing } from "../../src/watch.js";

describe("watcher debounce", () => {
  it("debounces 200ms and can flush a stable reread", () => {
    vi.useFakeTimers();
    let hits = 0;
    const clock = { now: () => Date.now() };
    const { trigger, flush } = debounceLeadingTrailing(() => {
      hits += 1;
    }, 200, clock);
    trigger();
    trigger();
    expect(hits).toBe(1);
    vi.advanceTimersByTime(200);
    trigger();
    flush();
    expect(hits).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});
