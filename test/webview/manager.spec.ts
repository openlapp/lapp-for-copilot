import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../webview/src/App.vue";
import { applyHostMessage, emptyModel, emptyProvider, parseOptionalTokenLimit, promoteSavedModelDraft, resetProviderDraft, state } from "../../webview/src/store.ts";

const posts: unknown[] = [];

vi.mock("../../webview/src/bridge", () => ({
  post: (message: unknown) => {
    posts.push(message);
  },
  listen: () => () => undefined,
}));

describe("manager webview", () => {
  beforeEach(() => {
    posts.length = 0;
    state.locale = "en";
    state.section = "overview";
    state.dirty = false;
    state.error = "";
    state.phase = "ready";
    state.providerDraft = emptyProvider();
    state.modelDraft = emptyModel();
    state.preview = undefined;
    state.previewOperationId = "";
    state.previewInFlight = false;
    state.pendingSave = undefined;
    state.ui = {
      revision: "rev",
      profileInitialized: true,
      profileRootLabel: "<lapp-root>",
      platform: {
        ok: true,
        platform: "win32",
        arch: "x64",
        extensionKind: "ui",
        vscodeVersion: "1.133.0",
        vscodeQuality: "stable",
        registered: true,
      },
      diagnostics: [],
      utility: {},
      defaults: {},
      agentHost: { enabled: undefined, inspected: true, preview: true },
      locale: "en",
      sharedProfileConsent: true,
      providerRegistered: true,
      eligibleModelCount: 0,
      hashedModels: [],
    };
    state.manager = { revision: "rev", profile: { providers: [] } };
  });

  it("renders overview and switches sections with keyboard labels", async () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Overview");
    expect(wrapper.text()).toMatch(/not per-app isolation/i);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    expect(wrapper.text()).toContain("Providers");
    expect(wrapper.get(".skip-link").attributes("href")).toBe("#manager-main");
    expect(wrapper.find("[aria-live]").exists()).toBe(true);
  });

  it("creates a provider through the validated host message", async () => {
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    await wrapper.get("input[pattern]").setValue("demo");
    const inputs = wrapper.findAll("input");
    await inputs[2]!.setValue("https://api.example.test/v1");
    state.providerDraft.authType = "none";
    await wrapper.get("form").trigger("submit");
    expect(posts.some((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact")).toBe(true);
    expect(state.dirty).toBe(true);
    applyHostMessage({ type: "transactionResult", ok: false, error: { code: "PROFILE_CONFLICT", message: "stale" }, operation: "provider.set" });
    expect(state.dirty).toBe(true);
    expect(state.pendingSave).toBeUndefined();
    await wrapper.get("form").trigger("submit");
    applyHostMessage({ type: "transactionResult", ok: true, revision: "next", warnings: [], operation: "provider.set" });
    expect(state.dirty).toBe(false);
  });

  it("supports Chinese copy and Copilot confirmation flow", async () => {
    state.locale = "zh-cn";
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("概览");
    await wrapper.get("nav button:nth-of-type(6)").trigger("click");
    expect(wrapper.text()).toContain("chat.utilityModel");
    const apply = wrapper.findAll("button.primary").at(-1);
    expect(apply?.attributes("disabled")).toBeDefined();
  });

  it("lets Copilot utility fields be chosen independently when models exist", async () => {
    state.ui = {
      ...state.ui!,
      eligibleModelCount: 2,
      hashedModels: [
        { publicId: "lapp-a", selector: "openlapp/lapp-a", name: "A", providerLabel: "P", enabled: true, toolCalling: true, imageInput: false, streaming: true, maxInputTokens: 1, maxOutputTokens: 1 },
        { publicId: "lapp-b", selector: "openlapp/lapp-b", name: "B", providerLabel: "P", enabled: true, toolCalling: true, imageInput: false, streaming: true, maxInputTokens: 1, maxOutputTokens: 1 },
      ],
    };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(6)").trigger("click");
    const selects = wrapper.findAll("select");
    await selects[1]!.setValue("openlapp/lapp-a");
    await selects[2]!.setValue("openlapp/lapp-b");
    await selects[3]!.setValue("mainAgent");
    expect(wrapper.findAll("button.primary").at(-1)?.attributes("disabled")).toBeUndefined();
  });

  it("hides the secret on an existing provider until the auth shape changes", async () => {
    state.manager = {
      revision: "rev",
      profile: {
        providers: [{
          id: "demo",
          name: "Demo",
          enabled: true,
          baseUrl: "https://api.example.test/v1",
          protocols: ["openai-chat-completions"],
          auth: { type: "bearer", credential: { scheme: "vault", available: true } },
        }],
      },
    };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    const edit = wrapper.findAll("button").find((button) => button.text() === "Edit");
    await edit!.trigger("click");
    expect(wrapper.text()).toContain("Existing credentials are kept");
    expect(wrapper.find("input[type=password]").exists()).toBe(false);
    expect(wrapper.find("[data-testid=auth-shape-secret-notice]").exists()).toBe(false);
  });

  it("requires a visible secret and submits provider.set when existing auth shape changes", async () => {
    state.manager = {
      revision: "rev",
      profile: {
        providers: [{
          id: "demo",
          name: "Demo",
          enabled: true,
          baseUrl: "https://api.example.test/v1",
          protocols: ["openai-chat-completions"],
          auth: { type: "bearer", credential: { scheme: "vault", available: true } },
        }],
      },
    };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    const edit = wrapper.findAll("button").find((button) => button.text() === "Edit");
    await edit!.trigger("click");
    const authSelect = wrapper.get("form").findAll("select")[0]!;
    await authSelect.setValue("header");
    expect(wrapper.find("[data-testid=auth-shape-secret-notice]").exists()).toBe(true);
    expect(wrapper.text()).toContain("Changing the auth shape requires a new secret");
    const secret = wrapper.get("input[type=password]");
    expect(secret.attributes("required")).toBeDefined();
    await secret.setValue("replacement-secret");
    await wrapper.get("form").trigger("submit");
    const transact = posts.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact") as {
      operation?: { type?: string; input?: { auth?: unknown } };
    } | undefined;
    expect(transact?.operation?.type).toBe("provider.set");
    expect(transact?.operation?.input?.auth).toEqual({
      type: "header",
      name: "Authorization",
      credential: { secret: "replacement-secret", storage: "vault", overwrite: true },
    });
  });

  it("selects later models from the same provider as defaults", async () => {
    state.manager = {
      revision: "rev",
      profile: {
        providers: [{
          id: "demo",
          models: [{ id: "one" }, { id: "two" }],
        }],
        global: { defaults: { chat: { providerId: "demo", modelId: "two" } } },
      },
    };
    state.ui = { ...state.ui!, defaults: { chat: { providerId: "demo", model: "two" } } };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(5)").trigger("click");
    expect(wrapper.text()).toContain("demo/two");
    expect((wrapper.findAll("select")[1]?.element as HTMLSelectElement).value.endsWith("two")).toBe(true);
  });

  it("locks an existing provider id and still submits the original identity", async () => {
    state.manager = {
      revision: "rev",
      profile: {
        providers: [{
          id: "demo",
          name: "Demo",
          enabled: true,
          baseUrl: "https://api.example.test/v1",
          protocols: ["openai-chat-completions"],
          auth: { type: "none" },
        }],
      },
    };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    const edit = wrapper.findAll("button").find((button) => button.text() === "Edit");
    await edit!.trigger("click");
    const idInput = wrapper.get("[data-testid=provider-id]");
    expect(idInput.attributes("readonly")).toBeDefined();
    state.providerDraft.id = "renamed";
    await wrapper.get("form").trigger("submit");
    const transact = posts.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact") as {
      operation?: { type?: string; input?: { id?: string } };
    } | undefined;
    expect(transact?.operation?.type).toBe("provider.set");
    expect(transact?.operation?.input?.id).toBe("demo");
  });

  it("locks an existing model identity and still submits the original pair", async () => {
    state.manager = {
      revision: "rev",
      profile: {
        providers: [{
          id: "demo",
          models: [{ id: "one", name: "One", protocols: ["openai-chat-completions"], capabilities: ["chat"] }],
        }],
      },
    };
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(4)").trigger("click");
    const edit = wrapper.findAll("button").find((button) => button.text() === "Edit");
    await edit!.trigger("click");
    expect(wrapper.get("[data-testid=model-id]").attributes("readonly")).toBeDefined();
    expect(wrapper.get("[data-testid=model-provider-id]").attributes("readonly")).toBeDefined();
    state.modelDraft.id = "two";
    state.modelDraft.providerId = "other";
    await wrapper.get("form").trigger("submit");
    const transact = posts.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact") as {
      operation?: { type?: string; input?: { id?: string; providerId?: string } };
    } | undefined;
    expect(transact?.operation?.type).toBe("model.set");
    expect(transact?.operation?.input).toMatchObject({ providerId: "demo", id: "one" });
  });

  it("ignores a late discovery result after cancel", () => {
    state.previewOperationId = "11111111-1111-1111-1111-111111111111";
    state.previewInFlight = true;
    applyHostMessage({
      type: "previewResult",
      ok: true,
      preview: { previewId: "keep" },
      operationId: "11111111-1111-1111-1111-111111111111",
    });
    expect(state.preview).toEqual({ previewId: "keep" });

    state.previewInFlight = false;
    state.preview = undefined;
    state.previewOperationId = "";
    applyHostMessage({
      type: "previewResult",
      ok: true,
      preview: { previewId: "stale" },
      operationId: "11111111-1111-1111-1111-111111111111",
    });
    expect(state.preview).toBeUndefined();
  });

  it("promotes a created provider draft so the next save omits auth", async () => {
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    await wrapper.get("input[pattern]").setValue("demo");
    const inputs = wrapper.findAll("input");
    await inputs[2]!.setValue("https://api.example.test/v1");
    state.providerDraft.authType = "none";
    await wrapper.get("form").trigger("submit");
    expect(state.pendingSave).toEqual({ kind: "provider", id: "demo" });
    applyHostMessage({ type: "transactionResult", ok: true, revision: "next", warnings: [], operation: "provider.set" });
    expect(state.providerDraft.existing).toBe(true);
    expect(state.providerDraft.originalId).toBe("demo");
    expect(state.pendingSave).toBeUndefined();
    posts.length = 0;
    state.providerDraft.name = "Renamed";
    await wrapper.get("form").trigger("submit");
    const transact = posts.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact") as {
      operation?: { input?: { auth?: unknown; name?: string; id?: string } };
    } | undefined;
    expect(transact?.operation?.input?.id).toBe("demo");
    expect(transact?.operation?.input?.name).toBe("Renamed");
    expect(transact?.operation?.input?.auth).toBeUndefined();
  });

  it("promotes a created model after model.set so a second save keeps the original identity", async () => {
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(4)").trigger("click");
    await wrapper.get("[data-testid=model-provider-id]").setValue("demo");
    await wrapper.get("[data-testid=model-id]").setValue("one");
    await wrapper.get("form").trigger("submit");
    expect(state.pendingSave).toEqual({ kind: "model", providerId: "demo", id: "one" });
    applyHostMessage({ type: "transactionResult", ok: true, revision: "next", warnings: [], operation: "model.set" });
    expect(state.modelDraft.existing).toBe(true);
    expect(state.modelDraft.originalId).toBe("one");
    expect(state.modelDraft.originalProviderId).toBe("demo");
    posts.length = 0;
    state.modelDraft.id = "two";
    await wrapper.get("form").trigger("submit");
    const transact = posts.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "transact") as {
      operation?: { input?: { id?: string; providerId?: string } };
    } | undefined;
    expect(transact?.operation?.input).toMatchObject({ providerId: "demo", id: "one" });
  });

  it("promotes a saved model identity and rejects non-integer token limits", () => {
    const promoted = promoteSavedModelDraft({
      ...emptyModel(),
      providerId: "demo",
      id: "one",
    });
    expect(promoted.existing).toBe(true);
    expect(promoted.originalId).toBe("one");
    expect(promoted.originalProviderId).toBe("demo");
    expect(parseOptionalTokenLimit("").ok).toBe(true);
    expect(parseOptionalTokenLimit("4096")).toEqual({ ok: true, value: 4096 });
    expect(parseOptionalTokenLimit("abc").ok).toBe(false);
    expect(parseOptionalTokenLimit("0").ok).toBe(false);
  });

  it("does not promote a replacement draft when a cancelled save later succeeds", async () => {
    const wrapper = mount(App);
    await wrapper.get("nav button:nth-of-type(2)").trigger("click");
    await wrapper.get("input[pattern]").setValue("demo");
    const inputs = wrapper.findAll("input");
    await inputs[2]!.setValue("https://api.example.test/v1");
    state.providerDraft.authType = "none";
    await wrapper.get("form").trigger("submit");
    expect(state.pendingSave).toEqual({ kind: "provider", id: "demo" });
    resetProviderDraft();
    state.providerDraft.id = "other";
    state.providerDraft.baseUrl = "https://api.example.test/v2";
    state.providerDraft.authType = "none";
    state.providerDraft.secret = "keep-me";
    state.dirty = true;
    applyHostMessage({ type: "transactionResult", ok: true, revision: "next", warnings: [], operation: "provider.set" });
    expect(state.providerDraft.existing).toBe(false);
    expect(state.providerDraft.id).toBe("other");
    expect(state.providerDraft.secret).toBe("keep-me");
    expect(state.dirty).toBe(true);
    expect(state.pendingSave).toBeUndefined();
  });

  it("does not promote a create draft when a delete transaction succeeds", () => {
    state.providerDraft = {
      ...emptyProvider(),
      id: "demo",
      baseUrl: "https://api.example.test/v1",
      authType: "none",
      secret: "still-needed",
    };
    state.dirty = true;
    state.pendingSave = { kind: "provider", id: "demo" };
    applyHostMessage({ type: "transactionResult", ok: true, revision: "next", warnings: [], operation: "provider.delete" });
    expect(state.providerDraft.existing).toBe(false);
    expect(state.providerDraft.secret).toBe("still-needed");
    expect(state.dirty).toBe(true);
    expect(state.pendingSave).toEqual({ kind: "provider", id: "demo" });
  });
});
