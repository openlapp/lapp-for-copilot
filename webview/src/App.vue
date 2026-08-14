<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ManagerSection } from "@shared/protocol";
import { listen, post } from "./bridge";
import { t } from "./i18n";
import { planProviderSet, resolvedProviderId } from "@shared/provider-update";
import { applyHostMessage, chosenUtilitySettings, clearPendingSave, emptyModel, emptyProvider, parseOptionalTokenLimit, resolvedModelIdentity, snapshotRevision, state, providers } from "./store";
import OverviewView from "./views/OverviewView.vue";
import ProvidersView from "./views/ProvidersView.vue";
import ModelsView from "./views/ModelsView.vue";
import VaultView from "./views/VaultView.vue";
import DefaultsView from "./views/DefaultsView.vue";
import CopilotView from "./views/CopilotView.vue";
import AgentHostView from "./views/AgentHostView.vue";
import DiagnosticsView from "./views/DiagnosticsView.vue";

const sections: ManagerSection[] = [
  "overview",
  "providers",
  "vault",
  "models",
  "defaults",
  "copilot",
  "agentHost",
  "diagnostics",
];

const main = ref<HTMLElement | null>(null);
let stop: (() => void) | undefined;

onMounted(() => {
  stop = listen(applyHostMessage);
  post({ type: "ready" });
  post({ type: "getSnapshot" });
});

onUnmounted(() => stop?.());

const title = computed(() => t(state.locale, "title"));

function go(section: ManagerSection): void {
  if (state.dirty && !window.confirm(t(state.locale, "discard"))) return;
  if (state.dirty) {
    state.providerDraft = emptyProvider();
    state.modelDraft = emptyModel();
    state.dirty = false;
    clearPendingSave();
  }
  state.section = section;
  main.value?.focus();
}

function onNavKey(event: KeyboardEvent): void {
  const index = sections.indexOf(state.section);
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    go(sections[(index + 1) % sections.length]!);
  }
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    go(sections[(index - 1 + sections.length) % sections.length]!);
  }
}

function refresh(): void {
  post({ type: "refresh" });
}

function reload(): void {
  post({ type: "reloadWindow" });
}

function setLocale(locale: "en" | "zh-cn"): void {
  post({ type: "setLocale", locale });
}

function saveProvider(): void {
  const planned = planProviderSet(state.providerDraft);
  if (!planned.ok) {
    state.error = planned.error;
    return;
  }
  state.pendingSave = { kind: "provider", id: resolvedProviderId(state.providerDraft) };
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: {
      type: "provider.set",
      input: planned.input,
    },
  });
}

function deleteProvider(id: string): void {
  if (!window.confirm(t(state.locale, "delete"))) return;
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: { type: "provider.delete", providerId: id },
  });
}

function saveModel(): void {
  const draft = state.modelDraft;
  const identity = resolvedModelIdentity(draft);
  const contextWindow = parseOptionalTokenLimit(draft.contextWindow);
  const maxOutputTokens = parseOptionalTokenLimit(draft.maxOutputTokens);
  if (!contextWindow.ok) {
    state.error = contextWindow.error;
    return;
  }
  if (!maxOutputTokens.ok) {
    state.error = maxOutputTokens.error;
    return;
  }
  state.pendingSave = { kind: "model", providerId: identity.providerId, id: identity.id };
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: {
      type: "model.set",
      input: {
        providerId: identity.providerId,
        id: identity.id,
        name: draft.name || undefined,
        enabled: draft.enabled,
        protocols: draft.protocols ? draft.protocols.split(",").map((value) => value.trim()).filter(Boolean) : undefined,
        inputModalities: draft.inputModalities.split(",").map((value) => value.trim()).filter(Boolean),
        outputModalities: draft.outputModalities.split(",").map((value) => value.trim()).filter(Boolean),
        capabilities: draft.capabilities.split(",").map((value) => value.trim()).filter(Boolean),
        contextWindow: contextWindow.value,
        maxOutputTokens: maxOutputTokens.value,
      },
    },
  });
}

function deleteModel(providerId: string, model: string): void {
  if (!window.confirm(t(state.locale, "delete"))) return;
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: { type: "model.delete", target: { providerId, model } },
  });
}

function setDefault(task: string, providerId: string, model: string): void {
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: { type: "default.set", task, target: { providerId, model } },
  });
}

function clearDefault(task: string): void {
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: { type: "default.delete", task },
  });
}

function storeCredential(): void {
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: {
      type: "credential.set",
      providerId: state.providerDraft.id,
      secret: state.providerDraft.secret,
      overwrite: state.providerDraft.overwrite,
    },
  });
  state.providerDraft.secret = "";
}

function deleteCredential(): void {
  if (!window.confirm(t(state.locale, "delete"))) return;
  post({
    type: "transact",
    expectedRevision: snapshotRevision(),
    operation: { type: "credential.delete", providerId: state.providerDraft.id },
  });
}

function previewDiscovery(): void {
  const operationId = crypto.randomUUID();
  const identity = resolvedModelIdentity(state.modelDraft);
  state.previewOperationId = operationId;
  state.previewInFlight = true;
  state.preview = undefined;
  post({
    type: "previewModels",
    providerId: identity.providerId || state.providerDraft.id,
    expectedRevision: snapshotRevision(),
    operationId,
  });
}

function cancelDiscovery(): void {
  if (!state.previewOperationId) return;
  post({ type: "cancelPreview", operationId: state.previewOperationId });
  state.previewInFlight = false;
  state.preview = undefined;
  state.previewOperationId = "";
}

function applyDiscovery(): void {
  const preview = state.preview as { previewId?: string } | undefined;
  if (!preview?.previewId) return;
  post({ type: "applyModels", previewId: preview.previewId, expectedRevision: snapshotRevision() });
}

function testConnection(): void {
  const identity = resolvedModelIdentity(state.modelDraft);
  post({
    type: "testConnection",
    providerId: identity.providerId,
    model: identity.id,
    expectedRevision: snapshotRevision(),
  });
}

function previewUtility(): void {
  post({ type: "previewUtilitySettings", next: chosenUtilitySettings() });
}

function applyUtility(): void {
  if (!(state.ui?.hashedModels.length)) return;
  if (!window.confirm(t(state.locale, "utilityConfirm"))) return;
  post({ type: "applyUtilitySettings", next: chosenUtilitySettings(), confirmed: true });
}

defineExpose({
  go,
  saveProvider,
  deleteProvider,
  saveModel,
  deleteModel,
  setDefault,
  clearDefault,
  storeCredential,
  deleteCredential,
  previewDiscovery,
  applyDiscovery,
  testConnection,
  previewUtility,
  applyUtility,
  providers,
  emptyProvider,
  emptyModel,
});
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#manager-main">{{ t(state.locale, "skip") }}</a>
    <nav :aria-label="t(state.locale, 'nav')" @keydown="onNavKey">
      <p><strong>{{ title }}</strong></p>
      <button
        v-for="section in sections"
        :key="section"
        type="button"
        :aria-current="state.section === section ? 'page' : undefined"
        @click="go(section)"
      >
        {{ t(state.locale, section === "agentHost" ? "agentHost" : section) }}
      </button>
    </nav>
    <main id="manager-main" ref="main" tabindex="-1">
      <div class="toolbar">
        <button type="button" class="primary" @click="refresh">{{ t(state.locale, "refresh") }}</button>
        <button type="button" @click="reload">{{ t(state.locale, "reload") }}</button>
        <label class="field">
          {{ t(state.locale, "language") }}
          <select :value="state.locale" @change="setLocale(($event.target as HTMLSelectElement).value as 'en' | 'zh-cn')">
            <option value="en">English</option>
            <option value="zh-cn">中文</option>
          </select>
        </label>
      </div>
      <div class="sr-only" :aria-live="state.politeness">{{ state.announcement }}</div>
      <p v-if="state.phase === 'loading'" class="status">{{ t(state.locale, "loading") }}</p>
      <p v-if="state.error" class="status" data-kind="error" role="alert">{{ state.error }}</p>
      <p v-if="state.dirty" class="notice">{{ t(state.locale, "dirty") }}</p>
      <OverviewView v-if="state.section === 'overview'" />
      <ProvidersView
        v-else-if="state.section === 'providers'"
        @save="saveProvider"
        @delete="deleteProvider"
      />
      <VaultView
        v-else-if="state.section === 'vault'"
        @store="storeCredential"
        @remove="deleteCredential"
      />
      <ModelsView
        v-else-if="state.section === 'models'"
        @save="saveModel"
        @delete="deleteModel"
        @discover="previewDiscovery"
        @apply="applyDiscovery"
        @cancel-preview="cancelDiscovery"
        @test="testConnection"
      />
      <DefaultsView v-else-if="state.section === 'defaults'" @set="setDefault" @clear="clearDefault" />
      <CopilotView
        v-else-if="state.section === 'copilot'"
        @preview="previewUtility"
        @apply="applyUtility"
        @restore="post({ type: 'restoreUtilitySettings' })"
      />
      <AgentHostView v-else-if="state.section === 'agentHost'" />
      <DiagnosticsView v-else />
    </main>
  </div>
</template>
