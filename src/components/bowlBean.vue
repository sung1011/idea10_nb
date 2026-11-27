<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
    tone?: 0 | 1 | 2
  }>(),
  { size: 24, tone: 0 },
)

const fills = ['#e07a4a', '#e8b44c', '#d45d6a'] as const
</script>

<template>
  <svg class="bean" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="13" rx="8.2" ry="7.4" :fill="fills[tone]" stroke="#3b2a1a" stroke-width="1.7" />
    <ellipse cx="9.2" cy="10.2" rx="2.4" ry="1.5" fill="#fff6ea" opacity="0.55" />
    <circle cx="9.2" cy="12.2" r="1.15" fill="#3b2a1a" />
    <circle cx="14.6" cy="12.2" r="1.15" fill="#3b2a1a" />
    <circle cx="9.55" cy="11.9" r="0.35" fill="#fff" />
    <circle cx="14.95" cy="11.9" r="0.35" fill="#fff" />
    <path
      d="M9.4 16.1 q2.6 2.2 5.2 0"
      fill="none"
      stroke="#3b2a1a"
      stroke-width="1.35"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.bean {
  display: block;
}
</style>
