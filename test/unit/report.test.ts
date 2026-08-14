import { describe, expect, it } from "vitest";
import { buildDiagnosticsReport } from "../../src/manager/report.js";
import type { ProfileSnapshot } from "../../src/profile.js";
import type { ManagerUiSnapshot } from "../../src/shared/protocol.js";

describe("diagnostics report", () => {
  it("includes sanitized profile defaults instead of an empty stub", () => {
    const snapshot = {
      initialized: true,
      profileRevision: "rev-1",
      vaultRevision: "00000000-0000-0000-0000-000000000000",
      catalog: { models: [] },
      diagnostics: [],
    } as unknown as ProfileSnapshot;
    const ui = {
      defaults: {
        chat: { providerId: "demo", model: "chat" },
        subagent: { providerId: "demo", model: "helper" },
      },
      hashedModels: [{
        publicId: "lapp-a",
        selector: "openlapp/lapp-a",
        name: "A",
        providerLabel: "P",
        enabled: true,
        toolCalling: true,
        imageInput: false,
        streaming: true,
        maxInputTokens: 1,
        maxOutputTokens: 1,
      }],
      utility: {},
      agentHost: { enabled: undefined, inspected: true, preview: true },
      platform: {
        platform: "win32",
        arch: "x64",
        extensionKind: "ui",
        vscodeVersion: "1.133.0",
        vscodeQuality: "stable",
        registered: true,
      },
    } as ManagerUiSnapshot;
    const report = JSON.parse(buildDiagnosticsReport(snapshot, ui)) as {
      defaults: { chat?: { providerId: string; model: string }; subagent?: { providerId: string; model: string } };
    };
    expect(report.defaults).toEqual({
      chat: { providerId: "demo", model: "chat" },
      subagent: { providerId: "demo", model: "helper" },
    });
  });
});
