<script setup lang="ts">
defineProps<{
  index: number
  total: number
}>()
</script>

<template>
  <p class="progress" data-progress>第 {{ index + 1 }} / {{ total }} 题</p>
</template>

<style scoped>
.progress {
  margin: 0;
  text-align: center;
  font-weight: 700;
  color: var(--muted);
}
</style>
