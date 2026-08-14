export type AuthType = "none" | "bearer" | "header" | "query";
export type CredentialMode = "vault" | "env" | "plaintext";

export interface ProviderDraft {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  protocols: string;
  authType: AuthType;
  headerName: string;
  credentialMode: CredentialMode;
  envName: string;
  secret: string;
  overwrite: boolean;
  existing: boolean;
  originalId: string;
  originalAuth: string;
}

export function emptyProviderDraft(): ProviderDraft {
  return {
    id: "",
    name: "",
    enabled: true,
    baseUrl: "",
    protocols: "openai-chat-completions",
    authType: "bearer",
    headerName: "Authorization",
    credentialMode: "vault",
    envName: "",
    secret: "",
    overwrite: false,
    existing: false,
    originalId: "",
    originalAuth: "",
  };
}

export function authFingerprint(draft: Pick<ProviderDraft, "authType" | "headerName" | "credentialMode" | "envName">): string {
  const header = draft.authType === "header" || draft.authType === "query" ? draft.headerName : "";
  const env = draft.credentialMode === "env" ? draft.envName : "";
  return `${draft.authType}\0${header}\0${draft.authType === "none" ? "" : draft.credentialMode}\0${env}`;
}

export function envNameFromReference(reference: unknown): string {
  if (typeof reference !== "string") return "";
  if (reference.startsWith("env://")) return reference.slice(6);
  return "";
}

export function hydrateProviderDraft(provider: Record<string, unknown>): ProviderDraft {
  const auth = isRecord(provider.auth) ? provider.auth : undefined;
  const type = isAuthType(auth?.type) ? auth.type : "bearer";
  const credential = isRecord(auth?.credential) ? auth.credential : undefined;
  const scheme = credential?.scheme;
  const credentialMode: CredentialMode = scheme === "env" || scheme === "plaintext" || scheme === "vault" ? scheme : "vault";
  const draft: ProviderDraft = {
    id: String(provider.id ?? ""),
    name: String(provider.name ?? ""),
    enabled: provider.enabled !== false,
    baseUrl: String(provider.baseUrl ?? ""),
    protocols: Array.isArray(provider.protocols) ? provider.protocols.map(String).join(",") : "",
    authType: type,
    headerName: typeof auth?.name === "string" && auth.name ? auth.name : "Authorization",
    credentialMode,
    envName: envNameFromReference(credential?.reference),
    secret: "",
    overwrite: false,
    existing: true,
    originalId: String(provider.id ?? ""),
    originalAuth: "",
  };
  draft.originalAuth = authFingerprint(draft);
  return draft;
}

export function resolvedProviderId(draft: ProviderDraft): string {
  return draft.existing ? draft.originalId || draft.id : draft.id;
}

/** After a successful provider.set, lock identity and treat the next save as metadata-only. */
export function promoteSavedProviderDraft(draft: ProviderDraft): ProviderDraft {
  const id = resolvedProviderId(draft);
  if (!id) return { ...draft, secret: "" };
  return {
    ...draft,
    id,
    secret: "",
    existing: true,
    originalId: id,
    originalAuth: authFingerprint(draft),
  };
}

export type ManagedAuthPayload =
  | { type: "none" }
  | { type: "bearer"; credential: Record<string, unknown> }
  | { type: "header"; name: string; credential: Record<string, unknown> }
  | { type: "query"; name: string; credential: Record<string, unknown> };

export type ProviderSetPlan =
  | { ok: true; input: Record<string, unknown> }
  | { ok: false; error: string };

export function authShapeChanged(draft: ProviderDraft): boolean {
  return draft.existing && authFingerprint(draft) !== draft.originalAuth;
}

export function authShapeRequiresSecret(draft: Pick<ProviderDraft, "authType" | "credentialMode">): boolean {
  return draft.authType !== "none" && draft.credentialMode !== "env";
}

export function existingAuthShapeNeedsSecret(draft: ProviderDraft): boolean {
  return authShapeChanged(draft) && authShapeRequiresSecret(draft);
}

export function secretFieldVisible(draft: ProviderDraft): boolean {
  if (!authShapeRequiresSecret(draft)) return false;
  return !draft.existing || existingAuthShapeNeedsSecret(draft);
}

export function planProviderSet(draft: ProviderDraft): ProviderSetPlan {
  const input: Record<string, unknown> = {
    id: resolvedProviderId(draft),
    enabled: draft.enabled,
    baseUrl: draft.baseUrl,
    protocols: draft.protocols.split(",").map((value) => value.trim()).filter(Boolean),
  };
  if (draft.name) input.name = draft.name;

  if (draft.existing && !authShapeChanged(draft)) {
    return { ok: true, input };
  }

  const auth = buildManagedAuth(draft);
  if (!auth.ok) return auth;
  if (auth.auth) input.auth = auth.auth;
  return { ok: true, input };
}

function buildManagedAuth(draft: ProviderDraft): { ok: true; auth?: ManagedAuthPayload } | { ok: false; error: string } {
  if (draft.authType === "none") return { ok: true, auth: { type: "none" } };
  if (draft.credentialMode === "env") {
    if (!draft.envName.trim()) return { ok: false, error: "An environment variable name is required." };
    return { ok: true, auth: withCredential(draft.authType, draft.headerName, { storage: "env", name: draft.envName.trim() }) };
  }
  if (!draft.secret) {
    return {
      ok: false,
      error: draft.existing
        ? "A new credential is required to change this provider's auth shape."
        : "A credential is required to create this provider.",
    };
  }
  return {
    ok: true,
    auth: withCredential(draft.authType, draft.headerName, {
      secret: draft.secret,
      storage: draft.credentialMode,
      overwrite: draft.existing && draft.credentialMode === "vault" ? true : draft.overwrite,
    }),
  };
}

function withCredential(
  type: Exclude<AuthType, "none">,
  headerName: string,
  credential: Record<string, unknown>,
): ManagedAuthPayload {
  if (type === "bearer") return { type, credential };
  return { type, name: headerName, credential };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthType(value: unknown): value is AuthType {
  return value === "none" || value === "bearer" || value === "header" || value === "query";
}
