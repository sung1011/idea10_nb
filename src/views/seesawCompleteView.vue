<script setup lang="ts">
const emit = defineEmits<{
  again: []
}>()
</script>

<template>
  <section class="complete">
    <svg class="prize" viewBox="0 0 160 90" aria-hidden="true">
      <rect x="18" y="42" width="124" height="8" rx="4" fill="#2a9d8f" stroke="#3b2a1a" stroke-width="3" />
      <polygon points="80,88 68,66 92,66" fill="#3b2a1a" />
      <circle cx="40" cy="32" r="10" fill="#e76f51" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="120" cy="32" r="10" fill="#e76f51" stroke="#3b2a1a" stroke-width="2" />
    </svg>
    <button type="button" class="again" aria-label="再玩一局" data-again @click="emit('again')">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="30" fill="#2a9d8f" stroke="#3b2a1a" stroke-width="4" />
        <path
          d="M48 36 a12 12 0 1 1 -8 -11"
          fill="none"
          stroke="#fffdf8"
          stroke-width="6"
          stroke-linecap="round"
        />
        <polygon points="36,14 48,18 38,26" fill="#fffdf8" stroke="#3b2a1a" stroke-width="2" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.complete {
  display: grid;
  justify-items: center;
  padding-top: 16px;
  gap: 12px;
}

.prize {
  width: min(220px, 80vw);
  height: auto;
}

.again {
  width: 72px;
  height: 72px;
  padding: 0;
  border: 0;
  background: transparent;
}

.again svg {
  width: 72px;
  height: 72px;
}
</style>
