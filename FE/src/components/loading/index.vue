<template>
  <div class="loading-indicator" role="status" aria-label="Đang tải dữ liệu">
    <v-progress-circular indeterminate color="primary" :size="36" :width="3" aria-hidden="true" />
  </div>
</template>

<style scoped>
.loading-indicator { display: flex; justify-content: center; align-items: center; padding: 28px 0; }
</style>
