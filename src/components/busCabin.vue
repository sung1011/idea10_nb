<script setup lang="ts">
import type { Animal } from '../logic/busRoute'
import type { ErrorCue, SeatKind } from '../logic/busMove'
import animalFace from './animalFace.vue'

defineProps<{
  seats: (Animal | null)[]
  kinds: SeatKind[]
  moving: boolean
  target: number
  mascot: Animal
  cue: ErrorCue
}>()

const emit = defineEmits<{
  seat: [index: number]
  target: []
}>()
</script>

<template>
  <div class="cabin" :class="{ moving }" data-cabin>
    <div class="body">
      <button
        type="button"
        class="target"
        :data-target="target"
        :aria-label="`车上要有 ${target} 只`"
        @click="emit('target')"
      >
        <animal-face :kind="mascot.kind" :tint="mascot.tint" :size="36" />
        <span class="num">{{ target }}</span>
      </button>
      <div class="grid" role="group" aria-label="车上座位">
        <button
          v-for="(seat, index) in seats"
          :key="index"
          type="button"
          class="seat"
          :class="[kinds[index], cue]"
          :data-seat="index"
          :data-animal="seat?.id ?? ''"
          :data-kind="kinds[index]"
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
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 3px solid var(--line);
  border-radius: 22px 28px 16px 16px;
  background: var(--teal);
}

.target {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 10px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
}

.num {
  font-size: clamp(2.2rem, 11vw, 3.2rem);
  font-weight: 800;
  line-height: 1;
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

.seat.kept {
  box-shadow: 0 2px 0 var(--line);
}

.seat.fresh {
  border-width: 4px;
  border-color: #c47b2b;
}

.seat.offable {
  border-width: 4px;
  border-color: var(--ink);
}

.seat.empty {
  border-style: dashed;
}

.seat.fresh.board-back {
  animation: nudge 0.45s ease infinite;
}

.seat.offable.alight-more {
  animation: nudge 0.45s ease infinite;
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

@keyframes nudge {
  50% {
    transform: translateY(-4px);
  }
}
</style>
