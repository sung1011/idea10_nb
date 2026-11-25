<script setup lang="ts">
import type { HelpSlot } from '../logic/busMove'
import animalFace from './animalFace.vue'

defineProps<{
  slots: HelpSlot[]
  target: number
}>()
</script>

<template>
  <div class="help" data-help role="group" :aria-label="`对照 ${target} 个座位`">
    <div class="row">
      <span
        v-for="(slot, index) in slots"
        :key="index"
        class="cell"
        :class="slot.kind"
        :data-help-slot="slot.kind"
      >
        <animal-face v-if="slot.animal" :kind="slot.animal.kind" :tint="slot.animal.tint" :size="28" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.help {
  padding: 8px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.cell {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 3px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
}

.cell.missing {
  border-style: dashed;
  background: repeating-linear-gradient(45deg, #fffdf8, #fffdf8 4px, #ffe7c2 4px, #ffe7c2 8px);
}

.cell.extra {
  border-color: var(--coral);
  background: #ffe8e0;
}
</style>
