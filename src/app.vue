<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import updatePopover from './components/updatePopover.vue'
import { useAppVersions } from './composables/useAppVersions'
import { useInstallPrompt } from './composables/useInstallPrompt'
import playSwitch from './components/playSwitch.vue'
import { playKindOf } from './logic/playKind'
import { displayStickerId } from './logic/stickerPool'
import { createAppSession } from './session/appSession'
import busCompleteView from './views/busCompleteView.vue'
import busView from './views/busView.vue'
import completeView from './views/completeView.vue'
import parentSettingsView from './views/parentSettingsView.vue'
import practiceView from './views/practiceView.vue'
import seesawCompleteView from './views/seesawCompleteView.vue'
import seesawView from './views/seesawView.vue'

const session = createAppSession()
const state = reactive(session.state)
const problem = computed(() => state.problems[state.index])
const versions = useAppVersions()
const install = useInstallPrompt()
const { pending, history, updating, applyUpdate } = versions
const {
  showInstall,
  kind: installKind,
  guide: installGuide,
  prompting: installBusy,
  requestInstall,
} = install
const showUpdate = computed(() => state.view !== 'settings' && pending.value.length > 0)
const playKind = computed(() => playKindOf(state.view))
const mathStickerId = computed(() => displayStickerId(state.stickerId, false))
const busStickerId = computed(() => displayStickerId(state.busSticker, true))
const seesawStickerId = computed(() => displayStickerId(state.seesawSticker, true))
const reducedMotion = computed(
  () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
)

function onKey(event: KeyboardEvent) {
  session.handleKeydown(event)
}

function onUpdate() {
  applyUpdate()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  session.dispose()
})
</script>

<template>
  <div class="shell">
    <header class="top">
      <play-switch
        v-if="playKind"
        :value="playKind"
        @change="session.switchPlay"
      />
      <p v-else class="brand">设置</p>
      <div v-if="state.view !== 'settings'" class="gear-wrap">
        <button
          type="button"
          class="gear"
          aria-label="设置"
          @click="session.openSettings()"
        >
          设置
        </button>
        <update-popover
          v-if="showUpdate"
          :pending="pending"
          :updating="updating"
          @update="onUpdate"
        />
      </div>
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
      :sticker-id="mathStickerId"
      :emoji="mathStickerId ? '' : state.stickerEmoji"
      @again="session.anotherRound"
    />

    <bus-view
      v-else-if="state.view === 'bus' && state.bus"
      :play="state.bus"
      :reduced-motion="reducedMotion"
      @wait="session.busTapWaiting"
      @seat="session.busTapSeat"
      @off="session.busTapOff"
      @depart="session.busDepart"
      @helper="session.busHelp"
    />

    <bus-complete-view
      v-else-if="state.view === 'busComplete'"
      :sticker-id="busStickerId"
      @again="session.anotherBus"
    />

    <seesaw-view
      v-else-if="state.view === 'seesaw' && state.seesaw"
      :play="state.seesaw"
      @digit="session.seesawTapDigit"
      @del="session.seesawTapDelete"
      @confirm="session.seesawTapConfirm"
      @help="session.seesawHelp"
    />

    <seesaw-complete-view
      v-else-if="state.view === 'seesawComplete'"
      :sticker-id="seesawStickerId"
      @again="session.anotherSeesaw"
    />

    <parent-settings-view
      v-else-if="state.view === 'settings'"
      :mode="state.mode"
      :rounds-completed="state.stats.roundsCompleted"
      :first-try-correct="state.stats.firstTryCorrect"
      :hint-used="state.stats.hintUsed"
      :bus-trips-completed="state.stats.busTripsCompleted"
      :bus-solo-completed="state.stats.busSoloCompleted"
      :bus-adjust-count="state.stats.busAdjustCount"
      :bus-hint-count="state.stats.busHintCount"
      :seesaw-rounds-completed="state.stats.seesawRoundsCompleted"
      :seesaw-first-try-correct="state.stats.seesawFirstTryCorrect"
      :seesaw-hint-count="state.stats.seesawHintCount"
      :storage-message="state.storageMessage"
      :reset-confirming="state.resetConfirming"
      :build-version="versions.buildVersion"
      :pending="pending"
      :history="history"
      :updating="updating"
      :show-install="showInstall"
      :install-kind="installKind"
      :install-guide="installGuide"
      :install-busy="installBusy"
      @close="session.closeSettings"
      @mode="session.setMode"
      @reset-ask="session.requestReset"
      @reset-cancel="session.cancelReset"
      @reset-confirm="session.confirmReset"
      @update="onUpdate"
      @install="requestInstall"
    />
  </div>
</template>

<style scoped>
.shell {
  width: min(28rem, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(20px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
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

.gear-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.gear {
  min-height: 56px;
  min-width: 56px;
  padding: 6px 10px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  font-weight: 800;
}
</style>
