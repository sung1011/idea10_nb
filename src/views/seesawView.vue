<script setup lang="ts">
import { computed } from 'vue'
import numberKeypad from '../components/numberKeypad.vue'
import progressLabel from '../components/progressLabel.vue'
import seesawBeam from '../components/seesawBeam.vue'
import { tiltDeg, type SeesawPlay } from '../logic/seesawMove'
import { seesawTarget } from '../logic/seesawProblem'

const props = defineProps<{
  play: SeesawPlay
}>()

const emit = defineEmits<{
  digit: [value: string]
  del: []
  confirm: []
  help: []
}>()

const problem = computed(() => props.play.problems[props.play.index])
const target = computed(() => (problem.value ? seesawTarget(problem.value) : 0))
</script>

<template>
  <section class="seesaw" v-if="problem">
    <progress-label :index="play.index" :total="play.problems.length" />
    <seesaw-beam
      :left="play.right"
      :right="target"
      :tilt="tiltDeg(play.right, target)"
      :motion="play.motion"
      @help="emit('help')"
    />
    <p class="eq" aria-live="polite">
      <span>{{ problem.a }}</span>
      <span>{{ problem.op }}</span>
      <span class="blank">{{ play.input || '?' }}</span>
      <span>=</span>
      <span>{{ problem.answer }}</span>
    </p>
    <number-keypad
      :confirm-disabled="play.locked || play.moving || play.input === ''"
      @digit="emit('digit', $event)"
      @del="emit('del')"
      @confirm="emit('confirm')"
    />
  </section>
</template>

<style scoped>
.seesaw {
  display: grid;
  gap: 10px;
}

.eq {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: clamp(2rem, 10vw, 3rem);
  font-weight: 800;
}

.blank {
  min-width: 1.4em;
  padding: 0 8px;
  border-bottom: 6px solid var(--line);
  text-align: center;
}
</style>
