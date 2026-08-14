<script setup lang="ts">
import { computed } from "vue";
import { t } from "../i18n";
import { state } from "../store";

defineEmits<{ preview: []; apply: []; restore: [] }>();

const models = computed(() => state.ui?.hashedModels ?? []);
const canApply = computed(() => models.value.length > 0);
</script>

<template>
  <section aria-labelledby="copilot-heading">
    <h1 id="copilot-heading">{{ t(state.locale, "copilot") }}</h1>
    <dl>
      <div><dt>chat.utilityModel</dt><dd>{{ state.ui?.utility.utilityModel ?? "—" }}</dd></div>
      <div><dt>chat.utilitySmallModel</dt><dd>{{ state.ui?.utility.utilitySmallModel ?? "—" }}</dd></div>
      <div><dt>chat.byokUtilityModelDefault</dt><dd>{{ state.ui?.utility.byokUtilityModelDefault ?? "—" }}</dd></div>
    </dl>
    <p class="notice">Values use <code>openlapp/&lt;hashed id&gt;</code>. Writes are Global and require confirmation.</p>
    <p v-if="!canApply" class="notice">{{ t(state.locale, "noEligibleModels") }}</p>
    <label class="field">chat.utilityModel
      <select v-model="state.utilityDraft.utilityModel" @change="state.utilityDirty = true">
        <option value="">—</option>
        <option v-for="model in models" :key="'u' + model.publicId" :value="model.selector">
          {{ model.name }} · {{ model.selector }}
        </option>
      </select>
    </label>
    <label class="field">chat.utilitySmallModel
      <select v-model="state.utilityDraft.utilitySmallModel" @change="state.utilityDirty = true">
        <option value="">—</option>
        <option v-for="model in models" :key="'s' + model.publicId" :value="model.selector">
          {{ model.name }} · {{ model.selector }}
        </option>
      </select>
    </label>
    <label class="field">chat.byokUtilityModelDefault
      <select v-model="state.utilityDraft.byokUtilityModelDefault" @change="state.utilityDirty = true">
        <option value="none">none</option>
        <option value="mainAgent">mainAgent</option>
        <option value="copilot">copilot</option>
      </select>
    </label>
    <pre v-if="state.settingsPreview">{{ JSON.stringify(state.settingsPreview, null, 2) }}</pre>
    <div class="row">
      <button type="button" @click="$emit('preview')">{{ t(state.locale, "discover") }}</button>
      <button type="button" class="primary" :disabled="!canApply" @click="$emit('apply')">{{ t(state.locale, "confirm") }}</button>
      <button type="button" @click="$emit('restore')">{{ t(state.locale, "restore") }}</button>
    </div>
  </section>
</template>
