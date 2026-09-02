<script setup>
import { useToast } from './composables/toast.js'
const toast = useToast()
</script>

<template>
  <v-app>
    <v-main><router-view /></v-main>
    <v-snackbar v-model="toast.visible" :timeout="5000" :color="toast.color" location="top end">
      <div class="global-toast"><span>{{ toast.message }}</span><button type="button" aria-label="Đóng thông báo" @click="toast.visible = false">×</button></div>
    </v-snackbar>
  </v-app>
</template>

<style>
html, body, #app {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body { background: #f0fdfa; }
.global-toast { display: flex; align-items: center; justify-content: space-between; gap: 18px; font-size: 12px; font-weight: 700; }
.global-toast button { border: 0; color: inherit; background: transparent; font-size: 21px; line-height: 1; cursor: pointer; }
</style>
