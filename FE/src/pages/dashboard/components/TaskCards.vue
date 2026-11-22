<script setup>
import { count } from '../format.js'

// The "Việc cần xử lý" / "Việc hôm nay" cards. Border colour: red = danger or late, orange = work to do, grey = nothing to do.
defineProps({
  title: { type: String, default: 'Việc cần xử lý' },
  cards: { type: Array, default: null },
})
</script>

<template>
  <section class="block" aria-labelledby="todo-heading">
    <h2 id="todo-heading">{{ title }}</h2>
    <div v-if="!cards" class="grid" aria-busy="true"><div v-for="n in 4" :key="n" class="card placeholder" /></div>
    <div v-else class="grid">
      <router-link v-for="card in cards" :key="card.code" :to="card.link" class="card" :class="card.count === 0 ? 'idle' : card.tone === 'danger' ? 'danger' : 'work'" :aria-label="`${card.label}: ${card.count}`">
        <span class="label">{{ card.label }}</span>
        <strong class="num">{{ count(card.count) }}</strong>
        <template v-if="card.count > 0">
          <span v-if="card.items?.length" class="items">{{ card.items.map((item) => item.code).join(', ') }}<template v-if="card.count > card.items.length"> và {{ card.count - card.items.length }} ao/bể khác</template></span>
          <span v-if="card.overdue > 0" class="late">{{ count(card.overdue) }} đơn trễ hẹn giao</span>
          <small>{{ card.hint || 'Bấm để xem danh sách' }}</small>
        </template>
        <small v-else>Không có việc</small>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.block { display: grid; gap: 10px; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.card { display: flex; flex-direction: column; gap: 4px; min-height: 108px; box-sizing: border-box; padding: 14px 16px; border: 1px solid #dce7e4; border-left: 4px solid #b9c9c4; border-radius: 10px; background: #fff; color: inherit; text-decoration: none; transition: box-shadow .15s; }
.card:hover { box-shadow: 0 2px 10px rgba(8, 127, 110, .1); }
.card:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.label { color: #5f716d; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; line-height: 1.35; }
.num { font-size: 28px; line-height: 1.15; font-variant-numeric: tabular-nums; }
.items { color: #1f3a35; font-size: 12px; font-weight: 500; overflow-wrap: anywhere; }
.late { color: #b3261e; font-size: 12px; font-weight: 700; }
small { color: #5f716d; font-size: 12px; }
.idle .num { color: #5f716d; }
.work { border-left-color: #e08a00; }
.work .label, .work .num { color: #9a4a00; }
.danger { border-left-color: #c62828; }
.danger .label, .danger .num { color: #b3261e; }
.placeholder { background: linear-gradient(90deg, #f1f5f4, #e7eeec, #f1f5f4); }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style>
