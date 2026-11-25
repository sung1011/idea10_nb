<script setup lang="ts">
defineProps<{
  index: number
  current: boolean
  done: boolean
  label: string
}>()
</script>

<template>
  <span class="mark" :class="{ on: current, done }" :aria-label="label" :data-stop="index">
    <svg v-if="index === 0" viewBox="0 0 40 40" aria-hidden="true">
      <polygon points="6,20 20,8 34,20 34,34 6,34" fill="#fffdf8" stroke="#3b2a1a" stroke-width="2.4" />
      <rect x="16" y="22" width="8" height="12" fill="#e76f51" stroke="#3b2a1a" stroke-width="1.6" />
    </svg>
    <svg v-else-if="index === 1" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="16" r="9" fill="#e76f51" stroke="#3b2a1a" stroke-width="2.2" />
      <rect x="18" y="24" width="4" height="10" fill="#2a9d8f" stroke="#3b2a1a" stroke-width="1.6" />
    </svg>
    <svg v-else-if="index === 2" viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="24" rx="14" ry="8" fill="#7ec8c0" stroke="#3b2a1a" stroke-width="2.2" />
      <path d="M10 24 q10 -6 20 0" fill="none" stroke="#1f756b" stroke-width="2" />
    </svg>
    <svg v-else-if="index === 3" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="18" r="10" fill="#e76f51" stroke="#3b2a1a" stroke-width="2.2" />
      <rect x="18" y="26" width="4" height="8" fill="#3b2a1a" />
      <path d="M20 10 v6" stroke="#fffdf8" stroke-width="2" />
    </svg>
    <svg v-else viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="26" rx="14" ry="8" fill="#f4a261" stroke="#3b2a1a" stroke-width="2.2" />
      <circle cx="14" cy="18" r="4" fill="#fffdf8" stroke="#3b2a1a" stroke-width="1.6" />
      <circle cx="26" cy="18" r="4" fill="#e76f51" stroke="#3b2a1a" stroke-width="1.6" />
    </svg>
  </span>
</template>

<style scoped>
.mark {
  min-width: 56px;
  min-height: 56px;
  display: grid;
  place-items: center;
  padding: 4px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
}

.mark svg {
  width: 32px;
  height: 32px;
}

.mark.on {
  background: var(--teal);
}

.mark.done {
  background: #cfeee9;
}
</style>
