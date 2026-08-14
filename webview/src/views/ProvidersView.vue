<script setup lang="ts">
import { computed } from "vue";
import {
  existingAuthShapeNeedsSecret,
  hydrateProviderDraft,
  secretFieldVisible,
} from "@shared/provider-update";
import { t } from "../i18n";
import { clearPendingSave, resetProviderDraft, providers, state } from "../store";

const emit = defineEmits<{ save: []; delete: [id: string] }>();

function edit(provider: Record<string, unknown>): void {
  clearPendingSave();
  state.providerDraft = hydrateProviderDraft(provider);
  state.dirty = true;
}

const showSecret = computed(() => secretFieldVisible(state.providerDraft));
const showShapeSecretNotice = computed(() => existingAuthShapeNeedsSecret(state.providerDraft));
</script>

<template>
  <section aria-labelledby="providers-heading">
    <h1 id="providers-heading">{{ t(state.locale, "providers") }}</h1>
    <p v-if="!providers().length" class="empty">{{ t(state.locale, "emptyProviders") }}</p>
    <table v-else>
      <thead>
        <tr><th>id</th><th>URL</th><th>enabled</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="provider in providers()" :key="String(provider.id)">
          <td>{{ provider.id }}</td>
          <td>{{ provider.baseUrl }}</td>
          <td>{{ provider.enabled !== false }}</td>
          <td class="row">
            <button type="button" @click="edit(provider)">{{ t(state.locale, "edit") }}</button>
            <button type="button" class="danger" @click="emit('delete', String(provider.id))">{{ t(state.locale, "delete") }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <form class="grid" @submit.prevent="emit('save')">
      <label class="field">id
        <input
          v-model="state.providerDraft.id"
          required
          pattern="[a-z0-9][a-z0-9._-]{0,63}"
          :readonly="state.providerDraft.existing"
          :aria-readonly="state.providerDraft.existing ? 'true' : undefined"
          data-testid="provider-id"
          @input="state.dirty = true"
        />
      </label>
      <label class="field">name
        <input v-model="state.providerDraft.name" @input="state.dirty = true" />
      </label>
      <label class="field">base URL
        <input v-model="state.providerDraft.baseUrl" required type="url" @input="state.dirty = true" />
      </label>
      <label class="field">protocols
        <input v-model="state.providerDraft.protocols" required @input="state.dirty = true" />
      </label>
      <label class="field">auth
        <select v-model="state.providerDraft.authType" @change="state.dirty = true">
          <option value="none">none</option>
          <option value="bearer">bearer</option>
          <option value="header">header</option>
          <option value="query">query</option>
        </select>
      </label>
      <label v-if="state.providerDraft.authType === 'header' || state.providerDraft.authType === 'query'" class="field">header/query name
        <input v-model="state.providerDraft.headerName" @input="state.dirty = true" />
      </label>
      <label v-if="state.providerDraft.authType !== 'none'" class="field">credential
        <select v-model="state.providerDraft.credentialMode" @change="state.dirty = true">
          <option value="vault">vault</option>
          <option value="env">env</option>
          <option value="plaintext">plaintext</option>
        </select>
      </label>
      <label v-if="state.providerDraft.authType !== 'none' && state.providerDraft.credentialMode === 'env'" class="field">env name
        <input v-model="state.providerDraft.envName" @input="state.dirty = true" />
      </label>
      <p v-if="state.providerDraft.existing && !showShapeSecretNotice" class="notice">{{ t(state.locale, "authPreserved") }}</p>
      <p v-if="showShapeSecretNotice" class="notice" data-testid="auth-shape-secret-notice">{{ t(state.locale, "authShapeSecretRequired") }}</p>
      <label v-if="showSecret" class="field">{{ showShapeSecretNotice ? t(state.locale, "newSecret") : t(state.locale, "secret") }}
        <input v-model="state.providerDraft.secret" type="password" autocomplete="new-password" required @input="state.dirty = true" />
      </label>
      <label class="row"><input v-model="state.providerDraft.enabled" type="checkbox" /> {{ t(state.locale, "enable") }}</label>
      <div class="row">
        <button type="submit" class="primary">{{ t(state.locale, "save") }}</button>
        <button type="button" @click="resetProviderDraft()">{{ t(state.locale, "cancel") }}</button>
      </div>
    </form>
  </section>
</template>
