export const EXTENSION_ID = "openlapp.lapp-for-copilot";
export const EXTENSION_DISPLAY_NAME = "OpenLAPP for Copilot";
export const VENDOR_ID = "openlapp";
export const MODEL_ID_PREFIX = "lapp-";
export const MANAGER_VIEW_TYPE = "openlapp.manager";
export const OUTPUT_CHANNEL_NAME = "OpenLAPP for Copilot";

export const SUPPORTED_CHAT_PROTOCOLS = [
  "openai-chat-completions",
  "openai-responses",
  "anthropic-messages",
] as const;

export type SupportedChatProtocol = (typeof SUPPORTED_CHAT_PROTOCOLS)[number];

export const TEXT_MEDIA_TYPES = ["text/plain", "text/markdown", "application/json"] as const;
export const IMAGE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 10;
export const MAX_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024;

export const DEFAULT_INPUT_TOKENS = 28672;
export const DEFAULT_OUTPUT_TOKENS = 4096;
export const OUTPUT_ONLY_INPUT_TOKENS = 8192;

export const WATCH_DEBOUNCE_MS = 200;

export const UTILITY_SETTING_KEYS = {
  utilityModel: "chat.utilityModel",
  utilitySmallModel: "chat.utilitySmallModel",
  byokUtilityModelDefault: "chat.byokUtilityModelDefault",
} as const;

export const AGENT_HOST_SETTING_KEY = "chat.agentHost.byokModels.enabled";

export const BYOK_UTILITY_DEFAULTS = ["none", "mainAgent", "copilot"] as const;
export type ByokUtilityDefault = (typeof BYOK_UTILITY_DEFAULTS)[number];

export const LAPP_MAIN_DEFAULT = "chat";
export const LAPP_SUBAGENT_DEFAULT = "subagent";

export const SETTINGS_BACKUP_KEY = "openlapp.utilitySettingsBackup";
export const GLOBAL_STATE_LOCALE_KEY = "openlapp.locale";
