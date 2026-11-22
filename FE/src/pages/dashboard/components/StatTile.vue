<script setup>
// One figure with a coloured left edge. With `to` the whole tile is a link.
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  suffix: { type: String, default: '' },
  sub: { type: String, default: '' },
  accent: { type: String, default: '#087f6e' },
  to: { type: String, default: '' },
})
</script>

<template>
  <component :is="to ? 'router-link' : 'div'" :to="to || undefined" class="tile" :style="{ borderLeftColor: accent }">
    <span class="label">{{ label }}</span>
    <strong class="value">{{ value }}<span v-if="suffix" class="suffix"> {{ suffix }}</span></strong>
    <span v-if="sub" class="sub">{{ sub }}</span>
  </component>
</template>

<style scoped>
.tile { display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; padding: 14px 16px; border: 1px solid #dce7e4; border-left: 4px solid #087f6e; border-radius: 10px; background: #fff; color: inherit; text-decoration: none; min-width: 0; }
a.tile:hover, .tile.router-link-active:hover { box-shadow: 0 2px 10px rgba(8, 127, 110, .1); }
a.tile:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.label { color: #5f716d; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.value { color: #134e4a; font-size: 22px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.suffix { color: #5f716d; font-size: 14px; font-weight: 400; }
.sub { color: #5f716d; font-size: 12px; }
</style>
