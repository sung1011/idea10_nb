<script setup lang="ts">
import { ref } from 'vue'
import versionRow from '../components/versionRow.vue'
import type { VersionGroup } from '../logic/appVersion'
import type { InstallKind } from '../logic/installPrompt'
import type { Mode } from '../logic/makeProblem'

type SettingsTab = 'topic' | 'update'

defineProps<{
  mode: Mode
  roundsCompleted: number
  firstTryCorrect: number
  hintUsed: number
  busTripsCompleted: number
  busSoloCompleted: number
  busAdjustCount: number
  busHintCount: number
  seesawRoundsCompleted: number
  seesawFirstTryCorrect: number
  seesawHintCount: number
  bowlRoundsCompleted: number
  bowlFirstTryCorrect: number
  bowlHintCount: number
  storageMessage: string
  resetConfirming: boolean
  buildVersion: string
  pending: VersionGroup[]
  history: VersionGroup[]
  updating: boolean
  showInstall: boolean
  installKind: InstallKind
  installGuide: string
  installBusy: boolean
}>()

const emit = defineEmits<{
  close: []
  mode: [value: Mode]
  resetAsk: []
  resetCancel: []
  resetConfirm: []
  update: []
  install: []
}>()

const tab = ref<SettingsTab>('topic')
const modes: { id: Mode; label: string }[] = [
  { id: 'add', label: '加法' },
  { id: 'sub', label: '减法' },
  { id: 'mix', label: '混合' },
]
</script>

<template>
  <section class="settings">
    <header class="head">
      <div class="tabs" role="tablist" aria-label="设置">
        <button
          type="button"
          class="tab"
          :class="{ on: tab === 'topic' }"
          role="tab"
          :aria-selected="tab === 'topic'"
          @click="tab = 'topic'"
        >
          题目
        </button>
        <button
          type="button"
          class="tab"
          :class="{ on: tab === 'update' }"
          role="tab"
          :aria-selected="tab === 'update'"
          @click="tab = 'update'"
        >
          更新
        </button>
      </div>
      <button type="button" class="back" @click="emit('close')">返回</button>
    </header>

    <div v-if="tab === 'topic'">
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
      <p class="label">小动物坐车</p>
      <ul class="stats">
        <li>坐车次数 {{ busTripsCompleted }}</li>
        <li>独立完成 {{ busSoloCompleted }}</li>
        <li>调整次数 {{ busAdjustCount }}</li>
        <li>坐车提示 {{ busHintCount }}</li>
      </ul>
      <p class="label">跷跷板</p>
      <ul class="stats">
        <li>跷跷板次数 {{ seesawRoundsCompleted }}</li>
        <li>首次答对 {{ seesawFirstTryCorrect }}</li>
        <li>跷跷板提示 {{ seesawHintCount }}</li>
      </ul>
      <p class="label">盖碗</p>
      <ul class="stats">
        <li>盖碗次数 {{ bowlRoundsCompleted }}</li>
        <li>首次答对 {{ bowlFirstTryCorrect }}</li>
        <li>盖碗提示 {{ bowlHintCount }}</li>
      </ul>
      <p v-if="storageMessage" class="warn">{{ storageMessage }}</p>

      <template v-if="!resetConfirming">
        <button type="button" class="danger" @click="emit('resetAsk')">重置本应用数据</button>
      </template>
      <div v-else class="confirm">
        <p>只清除本应用在这台设备上的练习记录、坐车记录、跷跷板记录、盖碗记录和设置，不能恢复。</p>
        <div class="row">
          <button type="button" class="ghost" @click="emit('resetCancel')">取消</button>
          <button type="button" class="danger" @click="emit('resetConfirm')">确认重置</button>
        </div>
      </div>
    </div>

    <div v-else class="update-pane">
      <p class="label">当前版本 {{ buildVersion }}</p>
      <p v-if="pending.length === 0" class="locked">已是最新</p>
      <div v-else class="update-box">
        <button type="button" class="install" :disabled="updating" @click="emit('update')">更新</button>
        <version-row
          v-for="group in pending"
          :key="`pending-${group.version}`"
          :version="group.version"
          :date="group.date"
          :summaries="group.summaries"
        />
      </div>

      <p class="label">更新说明</p>
      <version-row
        v-for="group in history"
        :key="group.version"
        :version="group.version"
        :date="group.date"
        :summaries="group.version === buildVersion ? ['当前版本', ...group.summaries] : group.summaries"
      />
      <p v-if="history.length === 0" class="locked">暂时还没有更新说明。</p>

      <template v-if="showInstall">
        <p class="label">安装到桌面</p>
        <button
          type="button"
          class="install"
          :disabled="installBusy"
          @click="emit('install')"
        >
          安装到桌面
        </button>
        <p class="hint" :data-install-kind="installKind">{{ installGuide }}</p>
      </template>
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

.label,
.locked,
.stats,
.warn,
.confirm p,
.hint {
  margin: 0;
}

.label {
  margin-top: 8px;
  font-weight: 800;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex: 1;
}

.back,
.chip,
.danger,
.ghost,
.tab,
.install {
  min-height: 48px;
  padding: 8px 14px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  font-weight: 800;
}

.tab.on,
.chip.on {
  background: var(--teal);
  color: #fff;
}

.modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
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

.hint {
  color: var(--muted);
  font-weight: 650;
  line-height: 1.35;
}

.danger {
  background: var(--coral);
  color: #fff;
}

.install {
  width: 100%;
  background: var(--teal);
  color: #fff;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.update-pane,
.update-box {
  display: grid;
  gap: 10px;
}

.update-box {
  padding: 8px;
  border: 3px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
}
</style>
