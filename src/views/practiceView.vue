<script setup lang="ts">
import blockHint from '../components/blockHint.vue'
import numberKeypad from '../components/numberKeypad.vue'
import type { Problem } from '../logic/makeProblem'

defineProps<{
  problem: Problem
  index: number
  total: number
  input: string
  showHint: boolean
  feedback: string
  locked: boolean
}>()

const emit = defineEmits<{
  digit: [value: string]
  del: []
  confirm: []
  hint: []
}>()
</script>

<template>
  <section class="practice">
    <p class="progress">第 {{ index + 1 }} / {{ total }} 题</p>
    <p class="eq" :class="{ shake: feedback === 'wrong' }" aria-live="polite">
      <span>{{ problem.a }}</span>
      <span>{{ problem.op }}</span>
      <span>{{ problem.b }}</span>
      <span>=</span>
      <span class="blank">{{ input || '?' }}</span>
    </p>
    <p v-if="feedback === 'wrong'" class="nudge">再试一次</p>
    <button type="button" class="hint-btn" @click="emit('hint')">
      {{ showHint ? '收起积木' : '看积木' }}
    </button>
    <block-hint v-if="showHint" :problem="problem" />
    <number-keypad
      :confirm-disabled="locked || input === ''"
      @digit="emit('digit', $event)"
      @del="emit('del')"
      @confirm="emit('confirm')"
    />
  </section>
</template>

<style scoped>
.practice {
  display: grid;
  gap: 12px;
}

.progress,
.nudge {
  margin: 0;
  text-align: center;
  font-weight: 700;
  color: var(--muted);
}

.eq {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0;
  font-size: clamp(2.4rem, 12vw, 3.6rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.blank {
  min-width: 1.4em;
  padding: 0 8px;
  border-bottom: 6px solid var(--line);
  text-align: center;
}

.hint-btn {
  justify-self: center;
  min-height: 48px;
  padding: 8px 16px;
  border: 3px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  font-weight: 800;
}

.shake {
  animation: shake 0.28s ease;
}

@keyframes shake {
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}
</style>
