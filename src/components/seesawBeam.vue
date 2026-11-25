<script setup lang="ts">
import seesawApple from './seesawApple.vue'

defineProps<{
  left: number
  right: number
  tilt: number
  motion: string
}>()

const emit = defineEmits<{
  help: []
}>()

function dots(count: number) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index)
}
</script>

<template>
  <div class="stage" data-seesaw :data-motion="motion" :data-tilt="tilt">
    <div class="beam-wrap" :style="{ transform: `rotate(${tilt}deg)` }">
      <div class="beam" data-beam>
        <div class="pan left" data-pan="left" :data-count="left">
          <button type="button" class="goal" data-left-target :aria-label="`${left}`" @click="emit('help')">
            {{ left }}
          </button>
          <div class="fruit">
            <seesaw-apple v-for="item in dots(left)" :key="`l${item}`" />
          </div>
        </div>
        <div class="pan right" data-pan="right" :data-count="right">
          <p class="now" data-right-count>{{ right }}</p>
          <div class="fruit">
            <seesaw-apple v-for="item in dots(right)" :key="`r${item}`" />
          </div>
        </div>
      </div>
    </div>
    <div class="fulcrum" data-fulcrum aria-hidden="true" />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 168px;
  padding-bottom: 18px;
}

.beam-wrap {
  transform-origin: 50% 100%;
  transition: transform 0.42s ease;
}

@media (prefers-reduced-motion: reduce) {
  .beam-wrap {
    transition: none;
  }
}

.beam {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: end;
  min-height: 120px;
  padding: 8px 4px 10px;
  border-bottom: 6px solid var(--line);
  border-radius: 8px;
}

.pan {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-height: 96px;
  padding: 6px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
}

.goal,
.now {
  margin: 0;
  min-width: 40px;
  min-height: 40px;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  font-size: 1.6rem;
  font-weight: 800;
  text-align: center;
}

.fruit {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  max-width: 120px;
}

.fulcrum {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 0;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
  border-bottom: 22px solid var(--line);
  transform: translateX(-50%);
}
</style>
