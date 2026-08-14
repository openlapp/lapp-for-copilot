export interface RuntimeContext {
  extension: { extensionKind: number };
}

export interface RuntimeEnvironment {
  platform: NodeJS.Platform;
  arch: string;
  remoteName?: string;
}

export interface RuntimeCheck {
  ok: boolean;
  code?: "REMOTE_EXTENSION_HOST" | "UNSUPPORTED_OS" | "UNSUPPORTED_ARCH";
  message?: string;
  extensionKind: "ui" | "workspace" | "unknown";
}

const KIND_UI = 1;
const KIND_WORKSPACE = 2;

export function inspectRuntime(context: RuntimeContext, env: RuntimeEnvironment = {
  platform: process.platform,
  arch: process.arch,
}): RuntimeCheck {
  const kind = context.extension.extensionKind === KIND_UI
    ? "ui"
    : context.extension.extensionKind === KIND_WORKSPACE
      ? "workspace"
      : "unknown";

  if (kind === "workspace") {
    return {
      ok: false,
      extensionKind: kind,
      code: "REMOTE_EXTENSION_HOST",
      message: "OpenLAPP for Copilot is a local UI extension and refuses to register providers in a remote extension host.",
    };
  }
  if (env.platform !== "win32") {
    return {
      ok: false,
      extensionKind: kind,
      code: "UNSUPPORTED_OS",
      message: `OpenLAPP for Copilot supports Windows x64 only (received ${env.platform}/${env.arch}).`,
    };
  }
  if (env.arch !== "x64") {
    return {
      ok: false,
      extensionKind: kind,
      code: "UNSUPPORTED_ARCH",
      message: `OpenLAPP for Copilot supports Windows x64 only (received ${env.platform}/${env.arch}).`,
    };
  }
  return { ok: true, extensionKind: kind };
}
