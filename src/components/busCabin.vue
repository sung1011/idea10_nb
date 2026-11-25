<script setup lang="ts">
import type { Animal } from '../logic/busRoute'
import {
  BUS_ENTER_MS,
  BUS_FLASH_MS,
  BUS_LEAVE_MS,
  type BusMotion,
  type ErrorCue,
  type SeatKind,
} from '../logic/busMove'
import animalFace from './animalFace.vue'

const props = defineProps<{
  seats: (Animal | null)[]
  kinds: SeatKind[]
  moving: boolean
  motion: BusMotion
  target: number
  cue: ErrorCue
}>()

const emit = defineEmits<{
  seat: [index: number]
  target: []
}>()

function motionMs() {
  if (props.motion === 'enter') return BUS_ENTER_MS
  if (props.motion === 'flash') return BUS_FLASH_MS
  return BUS_LEAVE_MS
}
</script>

<template>
  <div
    class="cabin"
    :class="[motion, { moving }]"
    :data-cabin="motion"
    :data-motion="motion"
    :style="{ animationDuration: `${motionMs()}ms` }"
  >
    <div class="body">
      <div class="roof">
        <button
          type="button"
          class="target"
          :data-target="target"
          :aria-label="`车上要有 ${target} 只`"
          @click="emit('target')"
        >
          <span class="num">{{ target }}</span>
        </button>
        <div class="cab" data-cab aria-hidden="true">
          <svg viewBox="0 0 48 56" width="48" height="56">
            <path d="M6 10 H30 L42 22 V46 H6 Z" fill="#bfe8e2" stroke="#3b2a1a" stroke-width="3" />
            <rect x="12" y="22" width="18" height="16" rx="4" fill="#fffdf8" stroke="#3b2a1a" stroke-width="2.2" />
            <circle cx="21" cy="30" r="2" fill="#3b2a1a" />
          </svg>
        </div>
      </div>
      <div class="glass" data-glass aria-hidden="true">
        <span /><span /><span /><span />
      </div>
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
      <div class="bumper" data-bumper aria-hidden="true">
        <span class="grill" />
        <span class="lamp" data-lamp />
        <span class="lamp" data-lamp />
      </div>
    </div>
    <div class="wheels">
      <span class="tire" data-tire><i class="hub" /></span>
      <span class="tire" data-tire><i class="hub" /></span>
    </div>
  </div>
</template>

<style scoped>
.cabin {
  position: relative;
  width: 100%;
  padding-bottom: 14px;
}

.body {
  display: grid;
  gap: 6px;
  padding: 8px 8px 16px;
  border: 3px solid var(--line);
  border-radius: 18px 28px 14px 14px;
  background: var(--teal);
}

.roof {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  gap: 6px;
  align-items: stretch;
}

.target {
  min-height: 56px;
  display: grid;
  place-items: center;
  padding: 4px 8px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
}

.num {
  font-size: clamp(2.2rem, 11vw, 3.2rem);
  font-weight: 800;
  line-height: 1;
}

.cab {
  display: grid;
  place-items: center;
  min-height: 56px;
  border: 3px solid var(--line);
  border-radius: 12px 18px 10px 10px;
  background: var(--teal-dark);
}

.cab svg {
  display: block;
}

.glass {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.glass span {
  height: 10px;
  border: 2px solid var(--line);
  border-radius: 6px;
  background: #d9f4ef;
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

.bumper {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14px 14px;
  gap: 6px;
  align-items: center;
}

.grill {
  height: 8px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    90deg,
    #3b2a1a 0 6px,
    #1f756b 6px 12px
  );
}

.lamp {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line);
  background: #ffe08a;
  justify-self: end;
}

.wheels {
  position: absolute;
  left: 22px;
  right: 36px;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.tire {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 4px solid var(--ink);
  background: #2a241c;
}

.hub {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--paper);
  border: 2px solid var(--ink);
}

.leave {
  animation-name: bus-leave;
  animation-timing-function: ease-in;
  animation-fill-mode: forwards;
}

.enter {
  animation-name: bus-enter;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

.flash {
  animation-name: bus-flash;
  animation-timing-function: ease;
}

.leave .tire,
.enter .tire {
  animation: spin 0.42s linear;
}

.flash .lamp {
  animation: blink 0.18s ease-in-out 2;
}

@keyframes bus-leave {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(110%);
  }
}

@keyframes bus-enter {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes bus-flash {
  0%,
  100% {
    filter: none;
  }
  40% {
    filter: brightness(1.18);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes blink {
  50% {
    background: #fff8c4;
    box-shadow: 0 0 8px #fff3a8;
  }
}

@keyframes nudge {
  50% {
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .leave,
  .enter {
    animation: none;
  }

  .leave .tire,
  .enter .tire {
    animation: none;
  }
}
</style>
