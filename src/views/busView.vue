<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import busCabin from '../components/busCabin.vue'
import animalFace from '../components/animalFace.vue'
import countHelp from '../components/countHelp.vue'
import stopMark from '../components/stopMark.vue'
import { STOP_NAMES } from '../logic/busRoute'
import {
  currentStation,
  errorCue,
  helpSlots,
  seatKind,
  type BusPlay,
} from '../logic/busMove'

const props = defineProps<{
  play: BusPlay
  reducedMotion: boolean
}>()

const emit = defineEmits<{
  wait: [id: string]
  seat: [index: number]
  off: [id: string]
  depart: []
  helper: []
}>()

const station = computed(() => currentStation(props.play))
const cue = computed(() => errorCue(props.play))
const kinds = computed(() => props.play.seats.map((_, index) => seatKind(props.play, index)))
const showBoardGesture = computed(
  () => !props.reducedMotion && station.value.kind === 'board' && !props.play.shownBoardGesture,
)
const showAlightGesture = computed(
  () => !props.reducedMotion && station.value.kind === 'alight' && !props.play.shownAlightGesture,
)
const arrowDown = computed(() => cue.value !== 'board-back' && cue.value !== 'alight-back')

let gestureTimer = 0
watch(
  () => station.value.kind,
  (kind) => {
    if (gestureTimer) window.clearTimeout(gestureTimer)
    if (props.reducedMotion) {
      if (kind === 'board') props.play.shownBoardGesture = true
      else props.play.shownAlightGesture = true
      return
    }
    gestureTimer = window.setTimeout(() => {
      if (kind === 'board') props.play.shownBoardGesture = true
      else props.play.shownAlightGesture = true
    }, 800)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (gestureTimer) window.clearTimeout(gestureTimer)
})
</script>

<template>
  <section class="bus" :data-cue="cue" :data-kind="station.kind">
    <ol class="route" aria-label="路线">
      <li v-for="(name, index) in STOP_NAMES" :key="name">
        <stop-mark :index="index" :current="index === play.stationIndex" :done="index < play.stationIndex" :label="name" />
      </li>
    </ol>

    <div v-if="station.kind === 'board'" class="yard" data-yard="wait">
      <button
        v-for="animal in play.waiting"
        :key="animal.id"
        type="button"
        class="critter"
        :class="{ pulse: cue === 'board-more' }"
        :data-waiting="animal.id"
        aria-label="候车小动物"
        @click="emit('wait', animal.id)"
      >
        <animal-face :kind="animal.kind" :tint="animal.tint" />
      </button>
    </div>

    <div
      v-if="station.kind === 'board'"
      class="arrow"
      :class="{ down: arrowDown, up: !arrowDown, pulse: cue === 'board-more' || cue === 'board-back' }"
      :data-arrow="arrowDown ? 'down' : 'up'"
      aria-hidden="true"
    >
      <span v-if="showBoardGesture" class="ghost">
        <animal-face kind="cat" tint="gold" :size="28" />
      </span>
    </div>

    <div class="lane">
      <bus-cabin
        :seats="play.seats"
        :kinds="kinds"
        :moving="play.moving"
        :motion="play.motion"
        :target="station.target"
        :cue="cue"
        @seat="emit('seat', $event)"
        @target="emit('helper')"
      />
    </div>

    <count-help v-if="play.helperOpen" :slots="helpSlots(play)" :target="station.target" />

    <div
      v-if="station.kind === 'alight'"
      class="arrow"
      :class="{ down: arrowDown, up: !arrowDown, pulse: cue === 'alight-more' || cue === 'alight-back' }"
      :data-arrow="arrowDown ? 'down' : 'up'"
      aria-hidden="true"
    >
      <span v-if="showAlightGesture" class="ghost down">
        <animal-face kind="rabbit" tint="coral" :size="28" />
      </span>
    </div>

    <div v-if="station.kind === 'alight'" class="pad" data-yard="off" aria-label="下车处">
      <button
        v-for="animal in play.offArea"
        :key="animal.id"
        type="button"
        class="critter"
        :class="{ pulse: cue === 'alight-back' }"
        :data-off="animal.id"
        aria-label="刚下车的小动物"
        @click="emit('off', animal.id)"
      >
        <animal-face :kind="animal.kind" :tint="animal.tint" />
      </button>
    </div>

    <button
      type="button"
      class="wheel"
      :disabled="play.moving || play.departLocked"
      aria-label="发车"
      data-depart
      @click="emit('depart')"
    >
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="30" fill="#2a9d8f" stroke="#3b2a1a" stroke-width="4" />
        <circle cx="36" cy="36" r="12" fill="#fffdf8" stroke="#3b2a1a" stroke-width="3" />
        <path d="M36 8 v16 M36 48 v16 M8 36 h16 M48 36 h16" stroke="#3b2a1a" stroke-width="4" />
        <polygon points="52,20 64,36 52,32" fill="#fffdf8" stroke="#3b2a1a" stroke-width="2" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.bus {
  display: grid;
  gap: 8px;
  justify-items: stretch;
}

.lane {
  width: 100%;
  overflow: hidden;
}

.route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.yard,
.pad {
  min-height: 56px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 6px;
  border: 3px dashed var(--line);
  border-radius: 16px;
  background: var(--paper);
}

.pad {
  background: #fff3d6;
}

.critter {
  min-width: 56px;
  min-height: 56px;
  padding: 4px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
}

.arrow {
  position: relative;
  height: 28px;
  justify-self: center;
}

.arrow.down::after,
.arrow.up::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
}

.arrow.down::after {
  border-top: 22px solid var(--ink);
}

.arrow.up::after {
  border-bottom: 22px solid var(--ink);
}

.ghost {
  position: absolute;
  left: 50%;
  top: -8px;
  pointer-events: none;
  animation: slide 0.8s ease 1;
}

.ghost.down {
  animation-name: drop;
}

.pulse,
.critter.pulse {
  animation: pulse 0.5s ease infinite;
}

.wheel {
  width: 72px;
  height: 72px;
  min-width: 72px;
  min-height: 72px;
  justify-self: center;
  padding: 0;
  border: 0;
  background: transparent;
}

.wheel svg {
  width: 72px;
  height: 72px;
}

.wheel:disabled {
  opacity: 0.4;
}

@keyframes slide {
  from {
    transform: translate(-50%, -18px);
    opacity: 0.85;
  }
  to {
    transform: translate(-50%, 18px);
    opacity: 0;
  }
}

@keyframes drop {
  from {
    transform: translate(-50%, -12px);
    opacity: 0.85;
  }
  to {
    transform: translate(-50%, 16px);
    opacity: 0;
  }
}

@keyframes pulse {
  50% {
    transform: translateY(-3px);
  }
}
</style>
