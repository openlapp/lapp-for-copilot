<script setup lang="ts">
import { t } from "../i18n";
import { providers, state } from "../store";

const ui = () => state.ui;
</script>

<template>
  <section aria-labelledby="overview-heading">
    <h1 id="overview-heading">{{ t(state.locale, "overview") }}</h1>
    <p class="banner" :data-kind="ui()?.platform.registered ? 'ok' : 'error'">
      {{ ui()?.platform.registered ? t(state.locale, "registered") : t(state.locale, "unregistered") }}
    </p>
    <dl class="grid">
      <div>
        <dt>Platform</dt>
        <dd>{{ ui()?.platform.platform }}/{{ ui()?.platform.arch }} · {{ ui()?.platform.extensionKind }}</dd>
      </div>
      <div>
        <dt>VS Code</dt>
        <dd>{{ ui()?.platform.vscodeVersion }} ({{ ui()?.platform.vscodeQuality }})</dd>
      </div>
      <div>
        <dt>Profile</dt>
        <dd>{{ ui()?.profileRootLabel }} · {{ ui()?.profileInitialized ? "ready" : "empty" }}</dd>
      </div>
      <div>
        <dt>Providers / models</dt>
        <dd>{{ providers().length }} / {{ ui()?.eligibleModelCount ?? 0 }}</dd>
      </div>
    </dl>
    <h2>Diagnostics</h2>
    <ul v-if="ui()?.diagnostics.length">
      <li v-for="item in ui()?.diagnostics" :key="item.code + item.message">
        {{ item.level }} {{ item.code }}: {{ item.message }}
      </li>
    </ul>
    <p v-else class="empty">{{ t(state.locale, "statusOk") }}</p>
  </section>
</template>
