import { EXTENSION_DISPLAY_NAME, EXTENSION_ID } from "../constants.js";
import type { ProfileSnapshot } from "../profile.js";
import { sanitizeText } from "../sanitize.js";
import type { ManagerUiSnapshot } from "../shared/protocol.js";

export function buildDiagnosticsReport(snapshot: ProfileSnapshot, ui: ManagerUiSnapshot): string {
  const body = {
    extension: EXTENSION_ID,
    name: EXTENSION_DISPLAY_NAME,
    platform: {
      os: ui.platform.platform,
      arch: ui.platform.arch,
      extensionKind: ui.platform.extensionKind,
      vscodeVersion: ui.platform.vscodeVersion,
      vscodeQuality: ui.platform.vscodeQuality,
      registered: ui.platform.registered,
    },
    profile: {
      initialized: snapshot.initialized,
      root: "<lapp-root>",
      revision: snapshot.profileRevision,
      vaultRevisionPresent: snapshot.vaultRevision !== "00000000-0000-0000-0000-000000000000",
      eligibleModels: snapshot.catalog.models.length,
    },
    defaults: {
      ...(ui.defaults.chat
        ? { chat: { providerId: sanitizeText(ui.defaults.chat.providerId), model: sanitizeText(ui.defaults.chat.model) } }
        : {}),
      ...(ui.defaults.subagent
        ? { subagent: { providerId: sanitizeText(ui.defaults.subagent.providerId), model: sanitizeText(ui.defaults.subagent.model) } }
        : {}),
    },
    diagnostics: snapshot.diagnostics.map((item) => ({
      level: item.level,
      code: item.code,
      message: sanitizeText(item.message),
      location: item.location ? sanitizeText(item.location) : undefined,
    })),
    utility: {
      utilityModelSet: Boolean(ui.utility.utilityModel),
      utilitySmallModelSet: Boolean(ui.utility.utilitySmallModel),
      byokUtilityModelDefault: ui.utility.byokUtilityModelDefault,
    },
    agentHost: {
      preview: true,
      enabled: ui.agentHost.enabled,
    },
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}
