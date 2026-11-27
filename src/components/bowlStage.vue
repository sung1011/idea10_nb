<script setup lang="ts">
import bowlBean from './bowlBean.vue'
import type { BowlIntro } from '../logic/bowlMove'

const props = defineProps<{
  visible: number
  total: number
  hidden: number
  open: boolean
  motion: string
  intro: BowlIntro
}>()

const emit = defineEmits<{
  help: []
}>()

function dots(count: number) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index)
}

function stayTone(index: number): 0 | 2 {
  return index % 2 === 0 ? 0 : 2
}

function lidState() {
  if (props.open) return 'open'
  if (props.intro === 'bounce') return 'away'
  return 'closed'
}

function showTakeCluster() {
  return !props.open && (props.intro === 'bounce' || props.intro === 'cover')
}
</script>

<template>
  <div
    class="stage"
    data-bowl
    :data-motion="motion"
    :data-intro="intro || 'idle'"
    :data-lid="lidState()"
  >
    <div class="pile" data-pile :data-count="intro === 'bounce' ? total : visible">
      <div class="stay" data-visible :data-count="visible">
        <bowl-bean
          v-for="item in dots(visible)"
          :key="`s${item}`"
          :tone="stayTone(item)"
          class="jumper"
          :style="{ animationDelay: `${(item % 5) * 0.07}s` }"
        />
      </div>
      <div
        v-if="showTakeCluster() && hidden > 0"
        class="take"
        data-take
        :data-count="hidden"
        :class="{ scoop: intro === 'cover', rest: intro === '' }"
      >
        <bowl-bean
          v-for="item in dots(hidden)"
          :key="`t${item}`"
          :tone="1"
          class="jumper"
          :style="{ animationDelay: `${(item % 4) * 0.08}s` }"
        />
      </div>
    </div>
    <div class="bowl" :class="{ shake: motion === 'shake', enter: intro === 'cover' }" data-lid>
      <svg class="pot" viewBox="0 0 88 72" aria-hidden="true">
        <ellipse cx="44" cy="18" rx="30" ry="10" fill="#d9a066" stroke="#3b2a1a" stroke-width="3" />
        <path
          d="M14 20 c2 28 18 42 30 42 c12 0 28-14 30-42"
          fill="#c9844a"
          stroke="#3b2a1a"
          stroke-width="3"
        />
        <path d="M22 28 c8 18 36 18 44 0" fill="none" stroke="#fff4e4" stroke-width="2" opacity="0.35" />
      </svg>
      <span v-if="!open" class="guess" aria-hidden="true">?</span>
      <div v-if="open" class="inside" data-revealed :data-count="hidden">
        <bowl-bean v-for="item in dots(hidden)" :key="`h${item}`" :tone="1" class="jumper" />
      </div>
    </div>
    <button
      type="button"
      class="total"
      data-bowl-total
      :aria-label="`${total}`"
      @click="emit('help')"
    >
      {{ total }}
    </button>
    <div
      v-if="motion === 'cheer' || motion === 'shake'"
      class="feedback"
      :data-feedback="motion === 'cheer' ? 'ok' : 'retry'"
      aria-hidden="true"
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: end;
  min-height: 176px;
  padding-bottom: 8px;
}

.pile,
.bowl {
  position: relative;
  min-height: 118px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
}

.pile {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 8px;
}

.stay,
.take,
.inside {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  gap: 3px;
  max-width: 128px;
  min-height: 28px;
}

.take {
  position: relative;
  padding: 4px;
  border-radius: 16px;
  background: rgba(232, 180, 76, 0.28);
}

.take.scoop {
  animation: scoop 0.7s ease-in forwards;
}

.bowl {
  overflow: hidden;
  z-index: 1;
}

.stage[data-intro='bounce'] .bowl {
  opacity: 0;
  transform: translate(28%, -72%);
}

.stage[data-intro='cover'] .bowl {
  animation: land 0.7s ease-out forwards;
}

.pot {
  display: block;
  width: 100%;
  height: 78px;
}

.guess {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: #3b2a1a;
  pointer-events: none;
}

.inside {
  position: absolute;
  inset: 28px 8px 8px;
}

.total {
  grid-column: 1 / -1;
  justify-self: center;
  min-width: 72px;
  min-height: 72px;
  padding: 4px 12px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
  font-size: clamp(2.6rem, 14vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
}

.bowl.shake {
  animation: shake 0.2s ease-in-out 4;
}

.stage[data-intro='bounce'] .jumper {
  animation: hop 0.42s ease-in-out infinite;
}

.stage[data-motion='cheer'] .jumper {
  animation: hop 0.45s ease 2;
}

.feedback {
  position: absolute;
  left: 75%;
  top: 38%;
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
    transform: translateY(-8px);
  }
}

@keyframes scoop {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(78%, 8%) scale(0.72);
    opacity: 0.15;
  }
}

@keyframes land {
  0% {
    opacity: 0;
    transform: translate(28%, -72%);
  }
  100% {
    opacity: 1;
    transform: translate(0, 0);
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
  .bowl.shake,
  .stage[data-intro='bounce'] .jumper,
  .stage[data-motion='cheer'] .jumper,
  .take.scoop,
  .stage[data-intro='cover'] .bowl,
  .mark,
  .spark {
    animation: none;
  }

  .stage[data-intro='bounce'] .bowl,
  .stage[data-intro='cover'] .bowl {
    opacity: 1;
    transform: none;
  }
}
</style>
