<script setup lang="ts">
import stickerCard from '../components/stickerCard.vue'

defineProps<{
  stickerId?: string
  emoji?: string
}>()

const emit = defineEmits<{
  again: []
}>()
</script>

<template>
  <section class="complete">
    <h1>做完啦</h1>
    <p class="copy">送你一张贴纸</p>
    <sticker-card :sticker-id="stickerId" :emoji="emoji" />
    <button type="button" class="again" @click="emit('again')">再来一轮</button>
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
  font-size: 2.2rem;
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
