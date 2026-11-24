<script setup lang="ts">
import { computed } from 'vue'
import type { Problem } from '../logic/makeProblem'

const props = defineProps<{
  problem: Problem
}>()

const left = computed(() => Array.from({ length: props.problem.a }, (_, index) => index))
const right = computed(() => Array.from({ length: props.problem.b }, (_, index) => index))
const total = computed(() => Array.from({ length: props.problem.a }, (_, index) => index))
</script>

<template>
  <div class="hint" aria-live="polite">
    <template v-if="problem.op === '+'">
      <p class="caption">左边 {{ problem.a }} 块，再添 {{ problem.b }} 块</p>
      <div class="row">
        <span v-if="left.length === 0" class="empty">空</span>
        <span v-for="item in left" :key="`l${item}`" class="dot left" />
        <span class="plus">+</span>
        <span v-if="right.length === 0" class="empty">空</span>
        <span v-for="item in right" :key="`r${item}`" class="dot right" />
      </div>
    </template>
    <template v-else>
      <p class="caption">一共 {{ problem.a }} 块，拿走 {{ problem.b }} 块</p>
      <div class="row">
        <span v-if="total.length === 0" class="empty">空</span>
        <span
          v-for="item in total"
          :key="`t${item}`"
          class="dot left"
          :class="{ gone: item >= problem.a - problem.b }"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.hint {
  padding: 12px;
  border: 3px solid var(--line);
  border-radius: 20px;
  background: #fff8ee;
}

.caption {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 0.95rem;
  font-weight: 700;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid var(--line);
}

.dot.left {
  background: #7ec8c3;
}

.dot.right {
  background: #f4a261;
}

.dot.gone {
  background: transparent;
  opacity: 0.35;
}

.plus {
  font-weight: 800;
}

.empty {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
}
</style>
