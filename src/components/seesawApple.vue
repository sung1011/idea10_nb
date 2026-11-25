<script setup lang="ts">
defineProps<{
  size?: number
}>()
</script>

<template>
  <svg class="apple" :width="size ?? 22" :height="size ?? 22" viewBox="0 0 22 22" aria-hidden="true">
    <path d="M11 4 c2-3 5-3 5-1 c-2 1-3 2-3 3" fill="none" stroke="#3b2a1a" stroke-width="1.6" stroke-linecap="round" />
    <ellipse cx="11" cy="13" rx="7" ry="7.2" fill="#e76f51" stroke="#3b2a1a" stroke-width="1.8" />
    <path d="M11 6 q-2 4 0 8" fill="none" stroke="#fff4e4" stroke-width="1.2" opacity="0.6" />
  </svg>
</template>
