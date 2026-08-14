import { describe, expect, it } from "vitest";
import { defaultOptionValue, extractProfileDefaults, parseDefaultOptionValue } from "../../src/shared/defaults.js";

describe("defaults identity", () => {
  it("keeps provider and model together so siblings stay selectable", () => {
    const first = defaultOptionValue({ providerId: "demo", model: "one" });
    const second = defaultOptionValue({ providerId: "demo", model: "two" });
    expect(first).not.toBe(second);
    expect(parseDefaultOptionValue(second)).toEqual({ providerId: "demo", model: "two" });
  });

  it("hydrates chat and subagent defaults from either model or modelId", () => {
    const defaults = extractProfileDefaults({
      profile: {
        global: {
          defaults: {
            chat: { providerId: "demo", modelId: "one" },
            subagent: { providerId: "demo", model: "two" },
          },
        },
      },
    });
    expect(defaults.chat).toEqual({ providerId: "demo", model: "one" });
    expect(defaults.subagent).toEqual({ providerId: "demo", model: "two" });
  });
});
