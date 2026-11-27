<script setup lang="ts">
import { computed } from 'vue'
import bowlStage from '../components/bowlStage.vue'
import numberKeypad from '../components/numberKeypad.vue'
import progressLabel from '../components/progressLabel.vue'
import { bowlIntroPlaying, bowlLidOpen, type BowlPlay } from '../logic/bowlMove'
import { bowlHiddenCount, bowlTotal, bowlVisibleCount } from '../logic/bowlProblem'

const props = defineProps<{
  play: BowlPlay
}>()

const emit = defineEmits<{
  digit: [value: string]
  del: []
  confirm: []
  help: []
}>()

const problem = computed(() => props.play.problems[props.play.index])
const visible = computed(() => (problem.value ? bowlVisibleCount(problem.value) : 0))
const total = computed(() => (problem.value ? bowlTotal(problem.value) : 0))
const hidden = computed(() => (problem.value ? bowlHiddenCount(problem.value) : 0))
const open = computed(() => bowlLidOpen(props.play))
const intro = computed(() => props.play.intro)
const confirmDisabled = computed(
  () => props.play.locked || props.play.moving || props.play.input === '' || bowlIntroPlaying(props.play),
)
</script>

<template>
  <section class="bowl" v-if="problem">
    <progress-label :index="play.index" :total="play.problems.length" />
    <bowl-stage
      :visible="visible"
      :total="total"
      :hidden="hidden"
      :open="open"
      :motion="play.motion"
      :intro="intro"
      @help="emit('help')"
    />
    <p class="eq" aria-live="polite">
      <span class="blank">{{ play.input || '?' }}</span>
    </p>
    <number-keypad
      :confirm-disabled="confirmDisabled"
      @digit="emit('digit', $event)"
      @del="emit('del')"
      @confirm="emit('confirm')"
    />
  </section>
</template>

<style scoped>
.bowl {
  display: grid;
  gap: 10px;
}

.eq {
  display: flex;
  justify-content: center;
  align-items: center;
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
