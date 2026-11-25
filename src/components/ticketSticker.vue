<script setup lang="ts">
import type { AnimalKind, AnimalTint } from '../logic/busRoute'
import animalFace from './animalFace.vue'

defineProps<{
  kind: AnimalKind
  tint: AnimalTint
}>()
</script>

<template>
  <div class="ticket" aria-label="车票贴纸">
    <svg class="hole" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="#fff4e4" stroke="#3b2a1a" stroke-width="2" />
    </svg>
    <animal-face :kind="kind" :tint="tint" :size="72" />
    <p>车票</p>
  </div>
</template>

<style scoped>
.ticket {
  position: relative;
  display: grid;
  justify-items: center;
  width: 148px;
  margin: 8px auto 16px;
  padding: 18px 12px 10px;
  border: 4px solid var(--line);
  border-radius: 24px;
  background: linear-gradient(180deg, #fffef8, #ffe7b3);
  box-shadow: 0 8px 0 #e0b15a;
  animation: pop 0.45s ease;
}

.hole {
  position: absolute;
  top: 8px;
  right: 10px;
}

p {
  margin: 4px 0 0;
  font-weight: 800;
}

@keyframes pop {
  from {
    transform: scale(0.7);
    opacity: 0.3;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
