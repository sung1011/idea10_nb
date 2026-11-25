<script setup lang="ts">
import type { AnimalKind, AnimalTint } from '../logic/busRoute'
import ticketSticker from '../components/ticketSticker.vue'

defineProps<{
  kind: AnimalKind
  tint: AnimalTint
}>()

const emit = defineEmits<{
  again: []
}>()
</script>

<template>
  <section class="complete">
    <h1>到野餐地啦</h1>
    <p class="copy">送你一张车票贴纸</p>
    <ticket-sticker :kind="kind" :tint="tint" />
    <button type="button" class="again" @click="emit('again')">再玩一局</button>
  </section>
</template>

<style scoped>
.complete {
  display: grid;
  justify-items: center;
  text-align: center;
  padding-top: 12px;
}

h1 {
  margin: 0;
  font-size: 2rem;
}

.copy {
  margin: 8px 0 0;
  color: var(--muted);
  font-weight: 700;
}

.again {
  min-height: 56px;
  min-width: 220px;
  margin-top: 8px;
  padding: 12px 20px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--teal);
  color: #fff;
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow: 0 4px 0 var(--line);
}
</style>
