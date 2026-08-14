import { describe, expect, it } from "vitest";
import {
  authFingerprint,
  authShapeChanged,
  emptyProviderDraft,
  hydrateProviderDraft,
  planProviderSet,
  promoteSavedProviderDraft,
  type ProviderDraft,
} from "../../src/shared/provider-update.js";

function draft(over: Partial<ProviderDraft> = {}): ProviderDraft {
  const base: ProviderDraft = {
    id: "demo",
    name: "Demo",
    enabled: true,
    baseUrl: "https://api.example.test/v1",
    protocols: "openai-chat-completions",
    authType: "bearer",
    headerName: "Authorization",
    credentialMode: "vault",
    envName: "",
    secret: "",
    overwrite: false,
    existing: true,
    originalId: "demo",
    originalAuth: "",
  };
  const next = { ...base, ...over };
  next.originalAuth = over.originalAuth ?? authFingerprint(next);
  return next;
}

describe("provider metadata updates", () => {
  it("omits auth for metadata-only edits across none/env/vault/header/query", () => {
    const cases: Array<Partial<ProviderDraft>> = [
      { authType: "none" },
      { authType: "bearer", credentialMode: "vault" },
      { authType: "bearer", credentialMode: "env", envName: "OPENAI_KEY" },
      { authType: "header", headerName: "X-Api-Key", credentialMode: "vault" },
      { authType: "query", headerName: "key", credentialMode: "env", envName: "QKEY" },
    ];
    for (const item of cases) {
      const planned = planProviderSet(draft({ ...item, name: "Renamed" }));
      expect(planned.ok).toBe(true);
      if (planned.ok) {
        expect(planned.input.auth).toBeUndefined();
        expect(planned.input.name).toBe("Renamed");
      }
    }
  });

  it("does not rewrite credentials when a secret is typed on an unchanged existing provider", () => {
    const planned = planProviderSet(draft({ secret: "should-not-go-to-provider-set" }));
    expect(planned.ok).toBe(true);
    if (planned.ok) expect(planned.input.auth).toBeUndefined();
  });

  it("sends none and env auth changes without a secret", () => {
    const toNone = planProviderSet(draft({ originalAuth: authFingerprint({ authType: "bearer", headerName: "", credentialMode: "vault", envName: "" }), authType: "none" }));
    expect(toNone.ok).toBe(true);
    if (toNone.ok) expect(toNone.input.auth).toEqual({ type: "none" });

    const toEnv = planProviderSet(draft({
      originalAuth: authFingerprint({ authType: "none", headerName: "", credentialMode: "vault", envName: "" }),
      authType: "bearer",
      credentialMode: "env",
      envName: "LAPP_KEY",
    }));
    expect(toEnv.ok).toBe(true);
    if (toEnv.ok) {
      expect(toEnv.input.auth).toEqual({
        type: "bearer",
        credential: { storage: "env", name: "LAPP_KEY" },
      });
    }
  });

  it("rejects a secretless vault/plaintext/header/query shape change on an existing provider", () => {
    const planned = planProviderSet(draft({
      originalAuth: authFingerprint({ authType: "bearer", headerName: "Authorization", credentialMode: "vault", envName: "" }),
      authType: "header",
      headerName: "X-Api-Key",
      credentialMode: "vault",
      secret: "",
    }));
    expect(planned.ok).toBe(false);
    if (!planned.ok) expect(planned.error).toMatch(/new credential is required/i);
  });

  it("submits an atomic provider.set when an existing auth shape is replaced with a secret", () => {
    const cases: Array<{ over: Partial<ProviderDraft>; auth: Record<string, unknown> }> = [
      {
        over: { authType: "bearer", credentialMode: "vault", secret: "vault-secret" },
        auth: { type: "bearer", credential: { secret: "vault-secret", storage: "vault", overwrite: true } },
      },
      {
        over: { authType: "bearer", credentialMode: "plaintext", secret: "plain-secret" },
        auth: { type: "bearer", credential: { secret: "plain-secret", storage: "plaintext", overwrite: false } },
      },
      {
        over: { authType: "header", headerName: "X-Api-Key", credentialMode: "vault", secret: "header-secret" },
        auth: { type: "header", name: "X-Api-Key", credential: { secret: "header-secret", storage: "vault", overwrite: true } },
      },
      {
        over: { authType: "query", headerName: "api_key", credentialMode: "plaintext", secret: "query-secret" },
        auth: { type: "query", name: "api_key", credential: { secret: "query-secret", storage: "plaintext", overwrite: false } },
      },
    ];
    for (const item of cases) {
      const planned = planProviderSet(draft({
        originalAuth: authFingerprint({ authType: "none", headerName: "", credentialMode: "vault", envName: "" }),
        ...item.over,
      }));
      expect(planned.ok).toBe(true);
      if (planned.ok) {
        expect(planned.input.auth).toEqual(item.auth);
        expect(planned.input.id).toBe("demo");
      }
    }
  });

  it("hydrates sanitized auth without a secret", () => {
    const hydrated = hydrateProviderDraft({
      id: "demo",
      name: "Demo",
      enabled: true,
      baseUrl: "https://api.example.test/v1",
      protocols: ["openai-chat-completions"],
      auth: {
        type: "header",
        name: "X-Api-Key",
        credential: { scheme: "env", reference: "env://DEMO_KEY", available: true, plaintextWarning: false },
      },
    });
    expect(hydrated.secret).toBe("");
    expect(hydrated.authType).toBe("header");
    expect(hydrated.envName).toBe("DEMO_KEY");
    expect(hydrated.originalId).toBe("demo");
    expect(planProviderSet({ ...hydrated, name: "Still Demo" }).ok).toBe(true);
  });

  it("keeps the original provider id when an existing draft is renamed in memory", () => {
    const planned = planProviderSet(draft({ id: "renamed" }));
    expect(planned.ok).toBe(true);
    if (planned.ok) expect(planned.input.id).toBe("demo");
  });

  it("promotes a created provider so the next save is metadata-only", () => {
    const created = promoteSavedProviderDraft({
      ...emptyProviderDraft(),
      id: "demo",
      name: "Demo",
      baseUrl: "https://api.example.test/v1",
      protocols: "openai-chat-completions",
      authType: "none",
      secret: "must-clear",
    });
    expect(created.existing).toBe(true);
    expect(created.originalId).toBe("demo");
    expect(created.secret).toBe("");
    const planned = planProviderSet({ ...created, name: "Renamed" });
    expect(planned.ok).toBe(true);
    if (planned.ok) {
      expect(planned.input.auth).toBeUndefined();
      expect(planned.input.name).toBe("Renamed");
    }
  });

  it("promotes after an auth-shape change so a second save does not rotate the secret", () => {
    const changing = draft({
      originalAuth: authFingerprint({ authType: "none", headerName: "", credentialMode: "vault", envName: "" }),
      authType: "header",
      headerName: "X-Api-Key",
      secret: "replacement-secret",
    });
    expect(authShapeChanged(changing)).toBe(true);
    const first = planProviderSet(changing);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.input.auth).toBeDefined();

    const promoted = promoteSavedProviderDraft(changing);
    expect(authShapeChanged(promoted)).toBe(false);
    const second = planProviderSet({ ...promoted, name: "Still Demo", secret: "typed-again" });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.input.auth).toBeUndefined();
  });
});
