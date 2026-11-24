<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import { createAppSession } from './session/appSession'
import completeView from './views/completeView.vue'
import parentSettingsView from './views/parentSettingsView.vue'
import practiceView from './views/practiceView.vue'

const session = createAppSession()
const state = reactive(session.state)
const problem = computed(() => state.problems[state.index])

function onKey(event: KeyboardEvent) {
  session.handleKeydown(event)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="shell">
    <header class="top">
      <p class="brand">一起算</p>
      <button
        v-if="state.view !== 'settings'"
        type="button"
        class="gear"
        aria-label="家长设置"
        @click="session.openSettings()"
      >
        设置
      </button>
    </header>

    <practice-view
      v-if="state.view === 'practice' && problem"
      :problem="problem"
      :index="state.index"
      :total="state.problems.length"
      :input="state.input"
      :show-hint="state.showHint"
      :feedback="state.feedback"
      :locked="state.locked"
      @digit="session.tapDigit"
      @del="session.tapDelete"
      @confirm="session.tapConfirm"
      @hint="session.toggleHint"
    />

    <complete-view
      v-else-if="state.view === 'complete'"
      :emoji="state.stickerEmoji"
      @again="session.anotherRound"
    />

    <parent-settings-view
      v-else-if="state.view === 'settings'"
      :mode="state.mode"
      :rounds-completed="state.stats.roundsCompleted"
      :first-try-correct="state.stats.firstTryCorrect"
      :hint-used="state.stats.hintUsed"
      :storage-message="state.storageMessage"
      :reset-confirming="state.resetConfirming"
      @close="session.closeSettings"
      @mode="session.setMode"
      @reset-ask="session.requestReset"
      @reset-cancel="session.cancelReset"
      @reset-confirm="session.confirmReset"
    />
  </div>
</template>

<style scoped>
.shell {
  width: min(28rem, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: max(16px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom));
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.brand {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.gear {
  min-height: 44px;
  padding: 8px 12px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  font-weight: 800;
}
</style>
