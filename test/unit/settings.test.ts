import { describe, expect, it } from "vitest";
import {
  applyUtilityWrite,
  previewUtilityWrite,
  restoreUtilityWrite,
  UtilitySettingsError,
  type UtilityField,
  type UtilitySettingsStore,
} from "../../src/manager/settings.js";
import type { UtilitySettingsView } from "../../src/shared/protocol.js";

function memoryStore(
  initial: UtilitySettingsView,
  backup?: UtilitySettingsView,
  failAt?: Partial<Record<UtilityField, Set<number>>>,
): UtilitySettingsStore & { values: UtilitySettingsView; writes: UtilityField[] } {
  const values = { ...initial };
  let storedBackup = backup;
  const counts: Partial<Record<UtilityField, number>> = {};
  const writes: UtilityField[] = [];
  return {
    values,
    writes,
    read: () => ({ ...values }),
    write: async (field, value) => {
      const index = counts[field] ?? 0;
      counts[field] = index + 1;
      writes.push(field);
      if (failAt?.[field]?.has(index)) {
        throw new Error(`injected failure: ${field}#${index}`);
      }
      if (value === undefined) delete values[field];
      else values[field] = value;
    },
    getBackup: () => storedBackup,
    setBackup: async (value) => {
      storedBackup = value;
    },
  };
}

describe("utility settings", () => {
  it("previews the stored backup, not a draft key", () => {
    const preview = previewUtilityWrite(
      { utilityModel: "openlapp/lapp-old", byokUtilityModelDefault: "copilot" },
      { utilityModel: "openlapp/lapp-new", byokUtilityModelDefault: "none" },
      { utilityModel: "openlapp/lapp-original" },
    );
    expect(preview.backup?.utilityModel).toBe("openlapp/lapp-original");
    expect(preview.next.utilityModel).toBe("openlapp/lapp-new");
  });

  it("keeps the original restore point across repeated apply", async () => {
    const store = memoryStore({
      utilityModel: "openlapp/lapp-a",
      utilitySmallModel: "openlapp/lapp-s",
      byokUtilityModelDefault: "none",
    });
    await applyUtilityWrite({
      utilityModel: "openlapp/lapp-b",
      utilitySmallModel: "openlapp/lapp-s",
      byokUtilityModelDefault: "mainAgent",
    }, store);
    await applyUtilityWrite({
      utilityModel: "openlapp/lapp-c",
      utilitySmallModel: "openlapp/lapp-s2",
      byokUtilityModelDefault: "copilot",
    }, store);
    expect(store.getBackup()?.utilityModel).toBe("openlapp/lapp-a");
    const restored = await restoreUtilityWrite(store);
    expect(restored?.utilityModel).toBe("openlapp/lapp-a");
    expect(restored?.byokUtilityModelDefault).toBe("none");
  });

  it("rolls back a failed apply", async () => {
    const store = memoryStore({
      utilityModel: "openlapp/lapp-a",
      utilitySmallModel: "openlapp/lapp-s",
      byokUtilityModelDefault: "none",
    }, undefined, { utilitySmallModel: new Set([0]) });
    await expect(applyUtilityWrite({
      utilityModel: "openlapp/lapp-b",
      utilitySmallModel: "openlapp/lapp-s2",
      byokUtilityModelDefault: "copilot",
    }, store)).rejects.toBeInstanceOf(UtilitySettingsError);
    expect(store.values.utilityModel).toBe("openlapp/lapp-a");
    expect(store.values.utilitySmallModel).toBe("openlapp/lapp-s");
  });

  it("reports a partial rollback failure", async () => {
    const store = memoryStore({
      utilityModel: "openlapp/lapp-a",
      utilitySmallModel: "openlapp/lapp-s",
      byokUtilityModelDefault: "none",
    }, undefined, { utilitySmallModel: new Set([0]), utilityModel: new Set([1]) });
    await expect(applyUtilityWrite({
      utilityModel: "openlapp/lapp-b",
      utilitySmallModel: "openlapp/lapp-s2",
      byokUtilityModelDefault: "copilot",
    }, store)).rejects.toMatchObject({ code: "PARTIAL_ROLLBACK_FAILED" });
  });
});
