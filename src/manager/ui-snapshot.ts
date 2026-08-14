import type { ProfileSnapshot } from "../profile.js";
import { extractProfileDefaults } from "../shared/defaults.js";
import type { ManagerUiSnapshot } from "../shared/protocol.js";
import { readUtilitySettings } from "./settings.js";
import { AGENT_HOST_SETTING_KEY } from "../constants.js";

export function buildManagerUiSnapshot(input: {
  snapshot: ProfileSnapshot;
  manager: unknown;
  platform: ManagerUiSnapshot["platform"];
  locale: "en" | "zh-cn";
  registered: boolean;
  config: {
    inspect(section: string): { globalValue?: unknown; defaultValue?: unknown } | undefined;
    get?(key: string): unknown;
  };
}): ManagerUiSnapshot {
  const inspected = input.config.inspect(AGENT_HOST_SETTING_KEY);
  const defaults = extractProfileDefaults(input.manager);
  return {
    revision: input.snapshot.revision,
    profileInitialized: input.snapshot.initialized,
    profileRootLabel: "<lapp-root>",
    platform: { ...input.platform, registered: input.registered },
    diagnostics: input.snapshot.diagnostics,
    utility: readUtilitySettings(input.config),
    defaults,
    agentHost: {
      enabled: typeof inspected?.globalValue === "boolean"
        ? inspected.globalValue
        : typeof inspected?.defaultValue === "boolean" ? inspected.defaultValue : undefined,
      inspected: true,
      preview: true,
    },
    locale: input.locale,
    providerRegistered: input.registered,
    eligibleModelCount: input.snapshot.catalog.models.length,
    hashedModels: input.snapshot.catalog.models.map((model) => ({
      publicId: model.publicId,
      selector: model.selector,
      name: model.name,
      providerLabel: model.providerLabel,
      enabled: true,
      toolCalling: model.toolCalling,
      imageInput: model.imageInput,
      streaming: model.streaming,
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: model.maxOutputTokens,
    })),
  };
}
