<script setup lang="ts">
defineProps<{
  size?: number
}>()
</script>

<template>
  <svg class="bean" :width="size ?? 22" :height="size ?? 22" viewBox="0 0 22 22" aria-hidden="true">
    <ellipse cx="11" cy="12" rx="7.2" ry="6.4" fill="#c45c3e" stroke="#3b2a1a" stroke-width="1.8" />
    <path d="M8 9 q3 2 6 0" fill="none" stroke="#fff4e4" stroke-width="1.2" opacity="0.55" />
    <path d="M11 6 c1.6-2.4 3.6-2.2 3.2-0.4" fill="none" stroke="#3b2a1a" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.bean {
  display: block;
}
</style>
