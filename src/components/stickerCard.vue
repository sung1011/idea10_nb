<script setup lang="ts">
defineProps<{
  emoji: string
}>()
</script>

<template>
  <div class="sticker" aria-label="贴纸">
    <span class="face">{{ emoji }}</span>
  </div>
</template>

<style scoped>
.sticker {
  display: grid;
  place-items: center;
  width: 148px;
  height: 148px;
  margin: 8px auto 16px;
  border-radius: 28px;
  border: 4px solid var(--line);
  background: linear-gradient(180deg, #fffef8, #ffe7b3);
  box-shadow: 0 8px 0 #e0b15a;
  animation: pop 0.45s ease;
}

.face {
  font-size: 72px;
  line-height: 1;
}

@keyframes pop {
  from {
    transform: scale(0.7);
    opacity: 0.3;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
