<script setup lang="ts">
import type { Mode } from '../logic/makeProblem'

defineProps<{
  mode: Mode
  roundsCompleted: number
  firstTryCorrect: number
  hintUsed: number
  storageMessage: string
  resetConfirming: boolean
}>()

const emit = defineEmits<{
  close: []
  mode: [value: Mode]
  resetAsk: []
  resetCancel: []
  resetConfirm: []
}>()

const modes: { id: Mode; label: string }[] = [
  { id: 'add', label: '加法' },
  { id: 'sub', label: '减法' },
  { id: 'mix', label: '混合' },
]
</script>

<template>
  <section class="settings">
    <header class="head">
      <h1>家长设置</h1>
      <button type="button" class="back" @click="emit('close')">返回</button>
    </header>

    <p class="label">题目</p>
    <div class="modes" role="radiogroup" aria-label="题目类型">
      <button
        v-for="item in modes"
        :key="item.id"
        type="button"
        class="chip"
        :class="{ on: mode === item.id }"
        :aria-pressed="mode === item.id"
        @click="emit('mode', item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <p class="label">范围</p>
    <p class="locked">10 以内（首版）</p>

    <p class="label">本机记录</p>
    <ul class="stats">
      <li>练习次数 {{ roundsCompleted }}</li>
      <li>首次答对 {{ firstTryCorrect }}</li>
      <li>使用提示 {{ hintUsed }}</li>
    </ul>
    <p v-if="storageMessage" class="warn">{{ storageMessage }}</p>

    <template v-if="!resetConfirming">
      <button type="button" class="danger" @click="emit('resetAsk')">重置本应用数据</button>
    </template>
    <div v-else class="confirm">
      <p>只清除本应用在这台设备上的练习记录和设置，不能恢复。</p>
      <div class="row">
        <button type="button" class="ghost" @click="emit('resetCancel')">取消</button>
        <button type="button" class="danger" @click="emit('resetConfirm')">确认重置</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 10px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h1,
.label,
.locked,
.stats,
.warn,
.confirm p {
  margin: 0;
}

h1 {
  font-size: 1.5rem;
}

.label {
  margin-top: 8px;
  font-weight: 800;
}

.back,
.chip,
.danger,
.ghost {
  min-height: 48px;
  padding: 8px 14px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  font-weight: 800;
}

.modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.chip.on {
  background: var(--teal);
  color: #fff;
}

.locked,
.stats {
  padding: 12px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  font-weight: 700;
}

.stats {
  display: grid;
  gap: 6px;
  list-style: none;
}

.warn,
.confirm p {
  color: var(--coral);
  font-weight: 700;
}

.danger {
  background: var(--coral);
  color: #fff;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
</style>
