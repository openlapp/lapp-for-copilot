<script setup lang="ts">
import { t } from "../i18n";
import { providers, state } from "../store";

const emit = defineEmits<{ store: []; remove: [] }>();

function authOf(provider: Record<string, unknown>): Record<string, unknown> | undefined {
  return provider.auth as Record<string, unknown> | undefined;
}
</script>

<template>
  <section aria-labelledby="vault-heading">
    <h1 id="vault-heading">{{ t(state.locale, "vault") }}</h1>
    <p class="notice">{{ t(state.locale, "vaultNeverShown") }}</p>
    <table>
      <thead>
        <tr><th>provider</th><th>scheme</th><th>available</th><th>binding</th></tr>
      </thead>
      <tbody>
        <tr v-for="provider in providers()" :key="String(provider.id)">
          <td>{{ provider.id }}</td>
          <td>{{ (authOf(provider)?.credential as Record<string, unknown> | undefined)?.scheme ?? authOf(provider)?.type }}</td>
          <td>{{ (authOf(provider)?.credential as Record<string, unknown> | undefined)?.available }}</td>
          <td>{{ (authOf(provider)?.credential as Record<string, unknown> | undefined)?.bindingMatches }}</td>
        </tr>
      </tbody>
    </table>
    <form class="grid" @submit.prevent="emit('store')">
      <p>{{ t(state.locale, "noSecret") }}</p>
      <label class="field">provider
        <input v-model="state.providerDraft.id" required />
      </label>
      <label class="field">new secret
        <input v-model="state.providerDraft.secret" type="password" autocomplete="new-password" required />
      </label>
      <label class="row"><input v-model="state.providerDraft.overwrite" type="checkbox" /> {{ t(state.locale, "rotate") }}</label>
      <div class="row">
        <button type="submit" class="primary">{{ t(state.locale, "createCredential") }}</button>
        <button type="button" class="danger" @click="emit('remove')">{{ t(state.locale, "deleteCredential") }}</button>
      </div>
    </form>
  </section>
</template>
