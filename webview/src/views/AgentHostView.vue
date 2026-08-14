<script setup lang="ts">
import { post } from "../bridge";
import { t } from "../i18n";
import { state } from "../store";
</script>

<template>
  <section aria-labelledby="agent-heading">
    <h1 id="agent-heading">{{ t(state.locale, "agentHost") }}</h1>
    <p class="notice">{{ t(state.locale, "agentHostHelp") }}</p>
    <p>chat.agentHost.byokModels.enabled = {{ String(state.ui?.agentHost.enabled) }}</p>
    <p>{{ t(state.locale, "restartHint") }}</p>
    <button type="button" class="primary" @click="post({ type: 'openSettings', query: 'chat.agentHost.byokModels.enabled' })">
      {{ t(state.locale, "openSettings") }}
    </button>
  </section>
</template>
