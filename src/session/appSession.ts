import { isCorrect, makeRound, ROUND_SIZE, type Mode, type Problem } from '../logic/makeProblem'
import {
  browserStorage,
  DEFAULT_SAVE,
  loadSave,
  resetSave,
  writeSave,
  type SaveData,
  type StorageLike,
} from '../storage/appStorage'

export type View = 'practice' | 'complete' | 'settings'

export const STICKERS = ['🌟', '🌸', '🌈', '🍀', '🎈', '🐠', '⭐', '🍉'] as const

export type AppState = {
  view: View
  mode: Mode
  problems: Problem[]
  index: number
  input: string
  showHint: boolean
  locked: boolean
  settled: boolean
  wrongOnce: boolean[]
  hintOnce: boolean[]
  firstTryThisRound: number
  hintThisRound: number
  stats: SaveData
  writable: boolean
  storageMessage: string
  feedback: '' | 'wrong'
  resetConfirming: boolean
  settingsOpenedMode: Mode | null
  stickerEmoji: string
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function createAppSession(options: { storage?: StorageLike; rng?: () => number } = {}) {
  const storage = options.storage ?? browserStorage()
  const rng = options.rng ?? Math.random
  const loaded = loadSave(storage)

  const state: AppState = {
    view: 'practice',
    mode: loaded.data.mode,
    problems: [],
    index: 0,
    input: '',
    showHint: false,
    locked: false,
    settled: false,
    wrongOnce: [],
    hintOnce: [],
    firstTryThisRound: 0,
    hintThisRound: 0,
    stats: loaded.data,
    writable: loaded.writable,
    storageMessage: loaded.message,
    feedback: '',
    resetConfirming: false,
    settingsOpenedMode: null,
    stickerEmoji: STICKERS[0],
  }

  function startRound(mode: Mode = state.mode) {
    state.mode = mode
    state.problems = makeRound(mode, ROUND_SIZE, rng)
    state.index = 0
    state.input = ''
    state.showHint = false
    state.locked = false
    state.settled = false
    state.wrongOnce = Array.from({ length: ROUND_SIZE }, () => false)
    state.hintOnce = Array.from({ length: ROUND_SIZE }, () => false)
    state.firstTryThisRound = 0
    state.hintThisRound = 0
    state.feedback = ''
    state.view = 'practice'
  }

  startRound(state.mode)

  function persist(next: SaveData): boolean {
    if (!state.writable) {
      if (!state.storageMessage) {
        state.storageMessage = '存档不可写入，未保存。'
      }
      return false
    }
    const result = writeSave(storage, next)
    if (!result.ok) {
      state.storageMessage = result.message
      return false
    }
    state.stats = next
    state.storageMessage = ''
    return true
  }

  function finishRound() {
    if (state.settled) return
    state.settled = true
    state.locked = true
    state.showHint = false
    state.input = ''
    state.feedback = ''
    state.stickerEmoji = STICKERS[state.stats.stickerCount % STICKERS.length]
    state.view = 'complete'
    persist({
      ...state.stats,
      mode: state.mode,
      roundsCompleted: state.stats.roundsCompleted + 1,
      firstTryCorrect: state.stats.firstTryCorrect + state.firstTryThisRound,
      hintUsed: state.stats.hintUsed + state.hintThisRound,
      stickerCount: state.stats.stickerCount + 1,
    })
  }

  function tapDigit(digit: string) {
    if (state.view !== 'practice' || state.locked || state.settled) return
    if (!/^\d$/.test(digit)) return
    if (state.input.length >= 2) return
    state.feedback = ''
    state.input += digit
  }

  function tapDelete() {
    if (state.view !== 'practice' || state.locked || state.settled) return
    state.feedback = ''
    state.input = state.input.slice(0, -1)
  }

  function tapConfirm() {
    if (state.view !== 'practice' || state.locked || state.settled) return
    if (state.input === '') return
    state.locked = true
    const problem = state.problems[state.index]
    if (!problem || !isCorrect(problem, state.input)) {
      state.wrongOnce[state.index] = true
      state.input = ''
      state.feedback = 'wrong'
      state.locked = false
      return
    }
    if (!state.wrongOnce[state.index]) {
      state.firstTryThisRound += 1
    }
    state.input = ''
    state.showHint = false
    state.feedback = ''
    if (state.index >= state.problems.length - 1) {
      finishRound()
      return
    }
    state.index += 1
    state.locked = false
  }

  function toggleHint() {
    if (state.view !== 'practice' || state.settled) return
    const next = !state.showHint
    state.showHint = next
    if (next && !state.hintOnce[state.index]) {
      state.hintOnce[state.index] = true
      state.hintThisRound += 1
    }
  }

  function openSettings() {
    state.settingsOpenedMode = state.mode
    state.resetConfirming = false
    state.view = 'settings'
  }

  function closeSettings() {
    const opened = state.settingsOpenedMode
    state.settingsOpenedMode = null
    state.resetConfirming = false
    if (opened != null && opened !== state.mode) {
      startRound(state.mode)
      return
    }
    if (state.settled) {
      state.view = 'complete'
      return
    }
    state.view = 'practice'
  }

  function setMode(mode: Mode) {
    if (mode === state.mode) return
    state.mode = mode
    persist({ ...state.stats, mode })
  }

  function anotherRound() {
    if (!state.settled || state.view !== 'complete') return
    startRound(state.mode)
  }

  function requestReset() {
    state.resetConfirming = true
  }

  function cancelReset() {
    state.resetConfirming = false
  }

  function confirmReset() {
    const result = resetSave(storage)
    if (!result.ok) {
      state.storageMessage = result.message
      state.resetConfirming = false
      return
    }
    state.writable = true
    state.storageMessage = ''
    state.stats = { ...DEFAULT_SAVE }
    state.resetConfirming = false
    startRound(DEFAULT_SAVE.mode)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return
    if (state.view !== 'practice') return
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault()
      tapDigit(event.key)
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      tapDelete()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      tapConfirm()
    }
  }

  return {
    state,
    tapDigit,
    tapDelete,
    tapConfirm,
    toggleHint,
    openSettings,
    closeSettings,
    setMode,
    anotherRound,
    requestReset,
    cancelReset,
    confirmReset,
    handleKeydown,
  }
}

export type AppSession = ReturnType<typeof createAppSession>
