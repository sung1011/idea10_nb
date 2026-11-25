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
          <p class="now" data-left-count>{{ left }}</p>
          <div class="fruit">
            <seesaw-apple v-for="item in dots(left)" :key="`l${item}`" />
          </div>
        </div>
        <div class="pan right" data-pan="right" :data-count="right">
          <button type="button" class="goal" data-right-target :aria-label="`${right}`" @click="emit('help')">
            {{ right }}
          </button>
          <div class="fruit">
            <seesaw-apple v-for="item in dots(right)" :key="`r${item}`" />
          </div>
        </div>
      </div>
    </div>
    <div class="fulcrum" data-fulcrum aria-hidden="true" />
    <div
      v-if="motion === 'cheer' || motion === 'hold'"
      class="feedback"
      :data-feedback="motion === 'cheer' ? 'ok' : 'retry'"
      aria-hidden="true"
      style="pointer-events: none"
    >
      <svg v-if="motion === 'cheer'" class="mark" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="#2f9e44" stroke="#1e5c2a" stroke-width="4" />
        <path
          d="M24 42 L36 54 L58 26"
          fill="none"
          stroke="#fff"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg v-else class="mark" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="#e67700" stroke="#9c4a00" stroke-width="4" />
        <path d="M52 26 A18 18 0 1 0 54 50" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" />
        <path d="M48 14 L62 30 L44 30 Z" fill="#fff" />
      </svg>
      <svg v-if="motion === 'cheer'" class="spark s1" viewBox="0 0 12 12">
        <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#ffd43b" stroke="#c9a227" stroke-width="0.6" />
      </svg>
      <svg v-if="motion === 'cheer'" class="spark s2" viewBox="0 0 12 12">
        <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#ffd43b" stroke="#c9a227" stroke-width="0.6" />
      </svg>
      <svg v-if="motion === 'cheer'" class="spark s3" viewBox="0 0 12 12">
        <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#ffd43b" stroke="#c9a227" stroke-width="0.6" />
      </svg>
      <svg v-if="motion === 'cheer'" class="spark s4" viewBox="0 0 12 12">
        <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#ffd43b" stroke="#c9a227" stroke-width="0.6" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 168px;
  padding-bottom: 18px;
}

.stage[data-motion='hold'] {
  animation: shake 0.2s ease-in-out 4;
}

.beam-wrap {
  transform-origin: 50% 100%;
  transition: transform 0.42s ease;
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

.stage[data-motion='cheer'] :deep(.apple) {
  animation: hop 0.45s ease 2;
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

.feedback {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 4;
  width: 84px;
  height: 84px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.mark {
  display: block;
  width: 84px;
  height: 84px;
  animation: pop 0.35s ease;
}

.spark {
  position: absolute;
  width: 14px;
  height: 14px;
  animation: twinkle 0.7s ease-in-out infinite;
}

.s1 {
  top: -8px;
  left: 6px;
}

.s2 {
  top: 10px;
  right: -8px;
  animation-delay: 0.12s;
}

.s3 {
  bottom: 2px;
  left: -8px;
  animation-delay: 0.24s;
}

.s4 {
  top: -4px;
  right: 16px;
  animation-delay: 0.36s;
}

@keyframes hop {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

@keyframes pop {
  0% {
    transform: scale(0.62);
  }
  70% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.7);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .beam-wrap {
    transition: none;
  }

  .stage[data-motion='hold'],
  .stage[data-motion='cheer'] :deep(.apple),
  .mark,
  .spark {
    animation: none;
  }
}
</style>
