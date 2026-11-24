<script setup lang="ts">
import type { VersionGroup } from '../logic/appVersion'
import versionRow from './versionRow.vue'

defineProps<{
  pending: VersionGroup[]
  confirming: boolean
}>()

const emit = defineEmits<{
  update: []
  cancel: []
}>()
</script>

<template>
  <aside class="popover" aria-label="可用更新">
    <div class="sticky">
      <template v-if="!confirming">
        <button type="button" class="action" @click="emit('update')">更新</button>
      </template>
      <template v-else>
        <p class="warn">当前这轮会重新开始，已完成的练习次数还在。</p>
        <div class="row">
          <button type="button" class="ghost" @click="emit('cancel')">取消</button>
          <button type="button" class="action" @click="emit('update')">确定更新</button>
        </div>
      </template>
    </div>
    <version-row
      v-for="group in pending"
      :key="group.version"
      :version="group.version"
      :date="group.date"
      :summaries="group.summaries"
    />
  </aside>
</template>

<style scoped>
.popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  display: grid;
  gap: 8px;
  width: min(18rem, calc(100vw - 32px));
  max-height: min(176px, calc(100dvh - 22rem));
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
  box-shadow: 0 8px 0 rgba(59, 42, 26, 0.12);
}

.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 4px;
  background: var(--paper);
}

.action,
.ghost {
  min-height: 44px;
  width: 100%;
  padding: 6px 10px;
  border: 3px solid var(--line);
  border-radius: 14px;
  font-weight: 800;
}

.action {
  background: var(--teal);
  color: #fff;
}

.ghost {
  background: var(--paper);
}

.warn {
  margin: 0 0 4px;
  color: var(--coral);
  font-weight: 800;
  font-size: 0.88rem;
  line-height: 1.25;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
