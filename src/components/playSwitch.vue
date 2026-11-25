<script setup lang="ts">
import { PLAY_OPTIONS, type PlayKind } from '../logic/playKind'

defineProps<{
  value: PlayKind
}>()

const emit = defineEmits<{
  change: [value: PlayKind]
}>()

function onChange(event: Event) {
  const next = (event.target as HTMLSelectElement).value
  if (next === 'practice' || next === 'bus' || next === 'seesaw') {
    emit('change', next)
  }
}
</script>

<template>
  <label class="wrap">
    <span class="sr">玩法</span>
    <select class="play" data-play-switch aria-label="玩法" :value="value" @change="onChange">
      <option v-for="item in PLAY_OPTIONS" :key="item.id" :value="item.id">
        {{ item.label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.wrap {
  position: relative;
  display: block;
  flex-shrink: 0;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.play {
  min-height: 56px;
  min-width: 7.2rem;
  padding: 6px 28px 6px 12px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  font-size: 1.15rem;
  font-weight: 800;
  color: inherit;
}
</style>
