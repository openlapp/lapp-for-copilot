export const CONSENT_STATE_KEY = "openlapp.sharedProfileConsent";
export const CONSENT_VERSION = 1;
export const TEST_CONSENT_ENV = "OPENLAPP_ACCEPT_SHARED_PROFILE";

export interface ConsentRecord {
  version: number;
  acceptedAt: string;
}

export function parseConsentRecord(value: unknown): ConsentRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as { version?: unknown; acceptedAt?: unknown };
  if (typeof record.version !== "number" || !Number.isSafeInteger(record.version) || record.version < 1) {
    return undefined;
  }
  if (typeof record.acceptedAt !== "string" || record.acceptedAt.length === 0) return undefined;
  return { version: record.version, acceptedAt: record.acceptedAt };
}

export function isConsentCurrent(value: unknown, requiredVersion = CONSENT_VERSION): boolean {
  const record = parseConsentRecord(value);
  return Boolean(record && record.version >= requiredVersion);
}

export function grantConsent(now = () => new Date().toISOString(), version = CONSENT_VERSION): ConsentRecord {
  return { version, acceptedAt: now() };
}

export function testConsentBypass(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[TEST_CONSENT_ENV] === "1";
}

export function consentCopy(locale: "en" | "zh-cn"): {
  message: string;
  detail: string;
  accept: string;
  decline: string;
  later: string;
  keep: string;
  withdraw: string;
} {
  if (locale === "zh-cn") {
    return {
      message: "OpenLAPP for Copilot 会使用当前 Windows 用户的共享 LAPP 位置。",
      detail: [
        "默认目录是本机用户下的 .lapp（若设置了 LAPP_HOME 则用该路径），凭据写入当前用户的系统凭据库。",
        "同一 Windows 账户下的其他 LAPP 兼容应用也可以读写这份配置，并解析同一套 Vault 凭据。这不是按应用隔离。",
        "错误或恶意的配置可能把密钥和对话内容发到非预期的上游。Copilot 请求会直连你配置的提供方。",
        "未同意前，本扩展不会监视、创建该目录，也不会向 Copilot 注册模型。",
      ].join("\n\n"),
      accept: "我已了解并同意",
      decline: "暂不使用",
      later: "需要先同意共享 LAPP 位置，才会读取配置或注册模型。",
      keep: "继续使用",
      withdraw: "撤回并重载窗口",
    };
  }
  return {
    message: "OpenLAPP for Copilot uses this Windows user's shared LAPP location.",
    detail: [
      "The default folder is .lapp under your user profile (or LAPP_HOME when set). Credentials go in the current-user OS Vault.",
      "Other LAPP-compatible apps for the same Windows account can read and write that profile and resolve the same Vault secrets. This is not per-app isolation.",
      "A wrong or malicious profile can send keys and chat content to an unexpected provider. Copilot requests go directly to the providers you configure.",
      "Until you accept, this extension will not watch or create that folder, and will not register models with Copilot.",
    ].join("\n\n"),
    accept: "I understand and accept",
    decline: "Not now",
    later: "Accept the shared LAPP location before this extension can read the profile or register models.",
    keep: "Keep using",
    withdraw: "Withdraw and reload window",
  };
}
