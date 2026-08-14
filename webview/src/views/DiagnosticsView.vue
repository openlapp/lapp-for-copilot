<script setup lang="ts">
import { post } from "../bridge";
import { t } from "../i18n";
import { state } from "../store";
</script>

<template>
  <section aria-labelledby="diag-heading">
    <h1 id="diag-heading">{{ t(state.locale, "diagnostics") }}</h1>
    <button type="button" class="primary" @click="post({ type: 'copyDiagnostics' })">{{ t(state.locale, "copy") }}</button>
    <ul>
      <li v-for="item in state.ui?.diagnostics ?? []" :key="item.code + item.message">
        {{ item.level }} {{ item.code }}: {{ item.message }}
      </li>
    </ul>
  </section>
</template>
