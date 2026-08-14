<script setup lang="ts">
import { computed } from "vue";
import { t } from "../i18n";
import { clearPendingSave, hydrateModelDraft, providers, state } from "../store";

const emit = defineEmits<{
  save: [];
  delete: [providerId: string, model: string];
  discover: [];
  apply: [];
  cancelPreview: [];
  test: [];
}>();

const rows = computed(() => {
  const all = providers().flatMap((provider) => {
    const models = Array.isArray(provider.models) ? provider.models as Array<Record<string, unknown>> : [];
    return models.map((model) => ({ providerId: String(provider.id), ...model }));
  });
  const filter = state.filter.trim().toLowerCase();
  return filter
    ? all.filter((row) => `${row.providerId} ${row.id} ${row.name ?? ""}`.toLowerCase().includes(filter))
    : all;
});

function edit(row: Record<string, unknown>): void {
  clearPendingSave();
  state.modelDraft = hydrateModelDraft(row);
  state.dirty = true;
}

const preview = computed(() => state.preview as { added?: unknown[]; named?: unknown[]; expiresAt?: string } | undefined);
</script>

<template>
  <section aria-labelledby="models-heading">
    <h1 id="models-heading">{{ t(state.locale, "models") }}</h1>
    <label class="field">{{ t(state.locale, "filter") }}
      <input v-model="state.filter" />
    </label>
    <p v-if="!rows.length" class="empty">{{ t(state.locale, "emptyModels") }}</p>
    <table v-else>
      <thead>
        <tr><th>provider</th><th>id</th><th>caps</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.providerId}/${row.id}`">
          <td>{{ row.providerId }}</td>
          <td>{{ row.id }}</td>
          <td>{{ Array.isArray(row.capabilities) ? row.capabilities.join(",") : "" }}</td>
          <td class="row">
            <button type="button" @click="edit(row)">{{ t(state.locale, "edit") }}</button>
            <button type="button" class="danger" @click="emit('delete', String(row.providerId), String(row.id))">{{ t(state.locale, "delete") }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <form class="grid" @submit.prevent="emit('save')">
      <label class="field">provider
        <input
          v-model="state.modelDraft.providerId"
          required
          :readonly="state.modelDraft.existing"
          :aria-readonly="state.modelDraft.existing ? 'true' : undefined"
          data-testid="model-provider-id"
          @input="state.dirty = true"
        />
      </label>
      <label class="field">id
        <input
          v-model="state.modelDraft.id"
          required
          :readonly="state.modelDraft.existing"
          :aria-readonly="state.modelDraft.existing ? 'true' : undefined"
          data-testid="model-id"
          @input="state.dirty = true"
        />
      </label>
      <label class="field">name
        <input v-model="state.modelDraft.name" @input="state.dirty = true" />
      </label>
      <label class="field">capabilities
        <input v-model="state.modelDraft.capabilities" @input="state.dirty = true" />
      </label>
      <label class="field">input modalities
        <input v-model="state.modelDraft.inputModalities" @input="state.dirty = true" />
      </label>
      <label class="field">output modalities
        <input v-model="state.modelDraft.outputModalities" @input="state.dirty = true" />
      </label>
      <label class="field">context window
        <input v-model="state.modelDraft.contextWindow" inputmode="numeric" @input="state.dirty = true" />
      </label>
      <label class="field">max output tokens
        <input v-model="state.modelDraft.maxOutputTokens" inputmode="numeric" @input="state.dirty = true" />
      </label>
      <label class="row"><input v-model="state.modelDraft.enabled" type="checkbox" /> {{ t(state.locale, "enable") }}</label>
      <div class="row">
        <button type="submit" class="primary">{{ t(state.locale, "save") }}</button>
        <button type="button" @click="emit('test')">{{ t(state.locale, "test") }}</button>
        <button type="button" :disabled="state.previewInFlight" @click="emit('discover')">{{ t(state.locale, "discover") }}</button>
        <button type="button" :disabled="!state.previewInFlight" @click="emit('cancelPreview')">{{ t(state.locale, "cancel") }}</button>
        <button type="button" :disabled="!preview?.added || state.previewInFlight" @click="emit('apply')">{{ t(state.locale, "apply") }}</button>
      </div>
    </form>
    <p v-if="state.previewInFlight" class="status" aria-live="polite">{{ t(state.locale, "discovering") }}</p>
    <section v-if="preview" class="notice" aria-live="polite">
      <h2>{{ t(state.locale, "discover") }}</h2>
      <p>expires: {{ preview.expiresAt }}</p>
      <pre>{{ JSON.stringify({ added: preview.added, named: preview.named }, null, 2) }}</pre>
    </section>
  </section>
</template>
