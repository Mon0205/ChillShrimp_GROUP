<script setup>
import { useToast } from './composables/toast.js'
const toast = useToast()
</script>

<template>
  <v-app>
    <router-view />
    <v-snackbar v-model="toast.visible" :timeout="5000" :color="toast.color" location="top end">
      {{ toast.message }}
      <template #actions><v-btn icon="mdi-close" variant="text" size="small" aria-label="Đóng thông báo" @click="toast.visible = false" /></template>
    </v-snackbar>
  </v-app>
</template>

<style>
:root { --app-font: 'Segoe UI', Arial, 'Helvetica Neue', sans-serif; }
body, .v-application, .v-overlay-container { font-family: var(--app-font); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
.v-application .v-table, .v-application .v-label, .v-overlay-container .v-list { font-family: var(--app-font); }
.v-btn { text-transform: none; letter-spacing: normal; font-weight: 600; }
.v-field, .v-input { font-family: var(--app-font); }
.v-application .text-caption { font-family: var(--app-font) !important; }
html, body, #app {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body { background: #f0fdfa; }
</style>
