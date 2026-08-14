<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { defaultOptionValue, parseDefaultOptionValue } from "@shared/defaults";
import { t } from "../i18n";
import { providers, state } from "../store";

const emit = defineEmits<{
  set: [task: string, providerId: string, model: string];
  clear: [task: string];
}>();

const mainKey = ref("");
const subKey = ref("");

const options = computed(() => providers().flatMap((provider) => {
  const models = Array.isArray(provider.models) ? provider.models as Array<{ id: string }> : [];
  return models.map((model) => ({
    providerId: String(provider.id),
    model: model.id,
    value: defaultOptionValue({ providerId: String(provider.id), model: model.id }),
  }));
}));

watch(
  () => state.ui?.defaults,
  (defaults) => {
    mainKey.value = defaults?.chat ? defaultOptionValue(defaults.chat) : "";
    subKey.value = defaults?.subagent ? defaultOptionValue(defaults.subagent) : "";
  },
  { immediate: true },
);

function save(task: "chat" | "subagent"): void {
  const parsed = parseDefaultOptionValue(task === "chat" ? mainKey.value : subKey.value);
  if (!parsed) return;
  emit("set", task, parsed.providerId, parsed.model);
}
</script>

<template>
  <section aria-labelledby="defaults-heading">
    <h1 id="defaults-heading">{{ t(state.locale, "defaults") }}</h1>
    <label class="field">{{ t(state.locale, "mainDefault") }}
      <select v-model="mainKey">
        <option value="">{{ t(state.locale, "unset") }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.providerId }}/{{ option.model }}
        </option>
      </select>
    </label>
    <div class="row">
      <button type="button" class="primary" @click="save('chat')">{{ t(state.locale, "save") }}</button>
      <button type="button" @click="emit('clear', 'chat')">{{ t(state.locale, "clear") }}</button>
    </div>
    <label class="field">{{ t(state.locale, "subagentDefault") }}
      <select v-model="subKey">
        <option value="">{{ t(state.locale, "unset") }}</option>
        <option v-for="option in options" :key="'s' + option.value" :value="option.value">
          {{ option.providerId }}/{{ option.model }}
        </option>
      </select>
    </label>
    <div class="row">
      <button type="button" class="primary" @click="save('subagent')">{{ t(state.locale, "save") }}</button>
      <button type="button" @click="emit('clear', 'subagent')">{{ t(state.locale, "clear") }}</button>
    </div>
  </section>
</template>
