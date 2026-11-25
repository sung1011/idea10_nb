<script setup lang="ts">
import type { AnimalKind, AnimalTint } from '../logic/busRoute'
import ticketSticker from '../components/ticketSticker.vue'

defineProps<{
  kind: AnimalKind
  tint: AnimalTint
}>()

const emit = defineEmits<{
  again: []
}>()
</script>

<template>
  <section class="complete">
    <ticket-sticker :kind="kind" :tint="tint" />
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
  padding-top: 12px;
  gap: 8px;
}

.again {
  width: 72px;
  height: 72px;
  min-width: 72px;
  min-height: 72px;
  padding: 0;
  border: 0;
  background: transparent;
}

.again svg {
  width: 72px;
  height: 72px;
}
</style>
