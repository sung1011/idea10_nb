<script setup lang="ts">
defineProps<{
  confirmDisabled: boolean
}>()

const emit = defineEmits<{
  digit: [value: string]
  del: []
  confirm: []
}>()

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
</script>

<template>
  <div class="keypad" role="group" aria-label="数字键盘">
    <button
      v-for="digit in digits"
      :key="digit"
      type="button"
      class="key"
      :aria-label="digit"
      @click="emit('digit', digit)"
    >
      {{ digit }}
    </button>
    <button type="button" class="key muted" aria-label="删除" @click="emit('del')">删除</button>
    <button type="button" class="key" aria-label="0" @click="emit('digit', '0')">0</button>
    <button
      type="button"
      class="key ok"
      aria-label="确定"
      :disabled="confirmDisabled"
      @click="emit('confirm')"
    >
      确定
    </button>
  </div>
</template>

<style scoped>
.keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.key {
  min-height: 64px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
  font-size: 1.7rem;
  font-weight: 800;
  box-shadow: 0 4px 0 var(--line);
}

.key:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--line);
}

.key.muted {
  font-size: 1.05rem;
}

.key.ok {
  background: var(--teal);
  color: #fff;
  font-size: 1.15rem;
}

.key.ok:disabled {
  opacity: 0.4;
  box-shadow: 0 4px 0 var(--line);
  transform: none;
}
</style>
