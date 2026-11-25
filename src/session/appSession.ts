import { reactive } from 'vue'
import { clearAcked } from '../logic/appVersion'
import {
  arriveNext,
  createBusPlay,
  currentStation,
  depart,
  hasBusProgress as playHasProgress,
  resetStation,
  tapOffArea,
  tapSeat,
  tapWaiting,
  toggleHelper,
  undoLast,
  type BusPlay,
} from '../logic/busMove'
import { makeBusTrip } from '../logic/busRoute'
import { isCorrect, makeRound, ROUND_SIZE, type Mode, type Problem } from '../logic/makeProblem'
import { speakChinese, wrapBrowserSynth, zhCount, type SpeakSynth } from '../logic/speakTask'
import {
  browserStorage,
  DEFAULT_SAVE,
  loadSave,
  resetSave,
  writeSave,
  type SaveData,
  type StorageLike,
} from '../storage/appStorage'

export type View = 'practice' | 'complete' | 'settings' | 'bus' | 'busComplete'

export const STICKERS = ['🌟', '🌸', '🌈', '🍀', '🎈', '🐠', '⭐', '🍉'] as const
export const BUS_MOVE_MS = 480

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
  settingsOpenedView: View | null
  stickerEmoji: string
  bus: BusPlay | null
}

export function hasRoundProgress(state: AppState): boolean {
  if (state.settled) return false
  return (
    state.index > 0 ||
    state.input !== '' ||
    state.showHint ||
    state.hintThisRound > 0 ||
    state.feedback === 'wrong' ||
    state.wrongOnce.some(Boolean)
  )
}

export function hasBusyProgress(state: AppState): boolean {
  return hasRoundProgress(state) || playHasProgress(state.bus)
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function createAppSession(
  options: {
    storage?: StorageLike
    rng?: () => number
    delay?: (fn: () => void, ms: number) => number
    cancelDelay?: (id: number) => void
    reducedMotion?: () => boolean
    synth?: SpeakSynth | null
  } = {},
) {
  const storage = options.storage ?? browserStorage()
  const rng = options.rng ?? Math.random
  const delay = options.delay ?? ((fn, ms) => window.setTimeout(fn, ms))
  const cancelDelay = options.cancelDelay ?? ((id) => window.clearTimeout(id))
  const reducedMotion =
    options.reducedMotion ??
    (() =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const loaded = loadSave(storage)
  let busTimer = 0
  const synthOf = () =>
    options.synth !== undefined
      ? options.synth
      : wrapBrowserSynth(typeof window !== 'undefined' ? window.speechSynthesis : null)

  const state = reactive<AppState>({
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
    settingsOpenedView: null,
    stickerEmoji: STICKERS[0],
    bus: null,
  })

  function clearBusTimer() {
    if (busTimer) {
      cancelDelay(busTimer)
      busTimer = 0
    }
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

  function finishBus() {
    const play = state.bus
    if (!play || !play.settled || play.accounted) return
    play.accounted = true
    state.view = 'busComplete'
    persist({
      ...state.stats,
      busTripsCompleted: state.stats.busTripsCompleted + 1,
      busSoloCompleted: state.stats.busSoloCompleted + (play.hintThisTrip === 0 ? 1 : 0),
      busAdjustCount: state.stats.busAdjustCount + play.adjustThisTrip,
      busHintCount: state.stats.busHintCount + play.hintThisTrip,
    })
  }

  function flushBusMove() {
    const play = state.bus
    if (!play?.moving) {
      clearBusTimer()
      return
    }
    clearBusTimer()
    const result = arriveNext(play)
    if (result === 'done') finishBus()
  }

  function startBus() {
    clearBusTimer()
    state.bus = createBusPlay(makeBusTrip(rng))
    cancelSpeech()
    state.view = 'bus'
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

  function cancelSpeech() {
    synthOf()?.cancel()
  }

  function openSettings() {
    cancelSpeech()
    flushBusMove()
    if (state.view !== 'settings') {
      state.settingsOpenedView = state.view
    }
    state.settingsOpenedMode = state.mode
    state.resetConfirming = false
    state.view = 'settings'
  }

  function closeSettings() {
    const openedMode = state.settingsOpenedMode
    const openedView = state.settingsOpenedView
    state.settingsOpenedMode = null
    state.settingsOpenedView = null
    state.resetConfirming = false
    if (openedView === 'bus' || openedView === 'busComplete') {
      state.view = openedView
      return
    }
    if (openedMode != null && openedMode !== state.mode) {
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

  function openBus() {
    flushBusMove()
    if (!state.bus || state.bus.settled) {
      startBus()
      return
    }
    state.view = 'bus'
  }

  function openPractice() {
    cancelSpeech()
    flushBusMove()
    if (state.settled) {
      state.view = 'complete'
      return
    }
    state.view = 'practice'
  }

  function anotherBus() {
    if (state.view !== 'busComplete') return
    startBus()
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
    clearAcked(storage)
    clearBusTimer()
    state.writable = true
    state.storageMessage = ''
    state.stats = { ...DEFAULT_SAVE }
    state.resetConfirming = false
    state.bus = null
    cancelSpeech()
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

  function withBus(action: (play: BusPlay) => void) {
    const play = state.bus
    if (!play || state.view !== 'bus' || play.settled) return
    action(play)
  }

  function busTapWaiting(animalId: string) {
    withBus((play) => {
      tapWaiting(play, animalId)
    })
  }

  function busTapSeat(index: number) {
    withBus((play) => {
      tapSeat(play, index)
    })
  }

  function busTapOff(animalId: string) {
    withBus((play) => {
      tapOffArea(play, animalId)
    })
  }

  function busUndo() {
    withBus((play) => {
      undoLast(play)
    })
  }

  function busResetStop() {
    withBus((play) => {
      resetStation(play)
    })
  }

  function busHelper() {
    withBus((play) => {
      toggleHelper(play)
    })
  }

  function busDepart() {
    withBus((play) => {
      const result = depart(play)
      if (result !== 'ok') return
      if (reducedMotion()) {
        const next = arriveNext(play)
        if (next === 'done') finishBus()
        return
      }
      clearBusTimer()
      busTimer = delay(() => {
        busTimer = 0
        if (!state.bus?.moving) return
        const next = arriveNext(state.bus)
        if (next === 'done') finishBus()
      }, BUS_MOVE_MS)
    })
  }

  function busSpeakNumber() {
    const play = state.bus
    if (!play || play.settled || !play.helperOpen) return
    speakChinese({
      text: zhCount(currentStation(play).target),
      synth: synthOf(),
    })
  }

  function busHelp() {
    withBus((play) => {
      toggleHelper(play)
    })
    if (state.bus?.helperOpen) busSpeakNumber()
    else cancelSpeech()
  }

  function dispose() {
    clearBusTimer()
    cancelSpeech()
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
    openBus,
    openPractice,
    anotherBus,
    requestReset,
    cancelReset,
    confirmReset,
    handleKeydown,
    busTapWaiting,
    busTapSeat,
    busTapOff,
    busUndo,
    busResetStop,
    busHelper,
    busHelp,
    busDepart,
    busSpeakNumber,
    cancelSpeech,
    flushBusMove,
    dispose,
  }
}

export type AppSession = ReturnType<typeof createAppSession>
