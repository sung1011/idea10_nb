<script setup lang="ts">
import type { Animal } from '../logic/busRoute'
import animalFace from './animalFace.vue'

defineProps<{
  seats: (Animal | null)[]
  moving: boolean
}>()

const emit = defineEmits<{
  seat: [index: number]
}>()
</script>

<template>
  <div class="cabin" :class="{ moving }" data-cabin>
    <div class="body">
      <div class="window" />
      <div class="grid" role="group" aria-label="车上座位">
        <button
          v-for="(seat, index) in seats"
          :key="index"
          type="button"
          class="seat"
          :data-seat="index"
          :data-animal="seat?.id ?? ''"
          :aria-label="seat ? '车上小动物' : '空座位'"
          @click="emit('seat', index)"
        >
          <animal-face v-if="seat" :kind="seat.kind" :tint="seat.tint" :size="34" />
        </button>
      </div>
    </div>
    <div class="wheels">
      <span />
      <span />
    </div>
  </div>
</template>

<style scoped>
.cabin {
  display: grid;
  gap: 6px;
}

.body {
  position: relative;
  padding: 10px 8px 8px;
  border: 3px solid var(--line);
  border-radius: 22px 28px 16px 16px;
  background: var(--teal);
}

.window {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: #fff4e4;
  border: 2px solid var(--line);
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(56px, 1fr));
  gap: 6px;
}

.seat {
  min-height: 56px;
  min-width: 56px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
}

.wheels {
  display: flex;
  justify-content: space-between;
  padding: 0 22px;
}

.wheels span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ink);
}

.moving {
  animation: go 0.48s ease;
}

@keyframes go {
  0% {
    transform: translateX(0);
  }
  55% {
    transform: translateX(14px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
