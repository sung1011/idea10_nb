import { reactive } from 'vue'
import { clearAcked } from '../logic/appVersion'
import {
  arriveNext,
  BUS_ENTER_MS,
  BUS_FLASH_MS,
  BUS_LEAVE_MS,
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
import { playKindOf, type PlayKind } from '../logic/playKind'
import {
  arriveSeesawNext,
  confirmSeesaw,
  createSeesawPlay,
  hasSeesawProgress,
  restoreSeesaw,
  SEESAW_HOLD_MS,
  SEESAW_LEVEL_MS,
  seesawForDisk,
  tapSeesawDelete,
  tapSeesawDigit,
  tapSeesawHelp,
  type SeesawPlay,
} from '../logic/seesawMove'
import { seesawLeft } from '../logic/seesawProblem'
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
import {
  busForDisk,
  emptyPractice,
  gameViewFrom,
  livePractice,
  type PlaySnapshot,
} from '../storage/playSnapshot'

export type View = 'practice' | 'complete' | 'settings' | 'bus' | 'busComplete' | 'seesaw' | 'seesawComplete'

export const STICKERS = ['🌟', '🌸', '🌈', '🍀', '🎈', '🐠', '⭐', '🍉'] as const
export { BUS_ENTER_MS, BUS_FLASH_MS, BUS_LEAVE_MS, SEESAW_HOLD_MS, SEESAW_LEVEL_MS }

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
  seesaw: SeesawPlay | null
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
  return hasRoundProgress(state) || playHasProgress(state.bus) || hasSeesawProgress(state.seesaw)
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
  let seesawTimer = 0
  let hydrated = false
  const synthOf = () =>
    options.synth !== undefined
      ? options.synth
      : wrapBrowserSynth(typeof window !== 'undefined' ? window.speechSynthesis : null)

  const statsOnly = (data: SaveData): SaveData => ({
    version: 3,
    mode: data.mode,
    roundsCompleted: data.roundsCompleted,
    firstTryCorrect: data.firstTryCorrect,
    hintUsed: data.hintUsed,
    stickerCount: data.stickerCount,
    busTripsCompleted: data.busTripsCompleted,
    busSoloCompleted: data.busSoloCompleted,
    busAdjustCount: data.busAdjustCount,
    busHintCount: data.busHintCount,
    seesawRoundsCompleted: data.seesawRoundsCompleted ?? 0,
    seesawFirstTryCorrect: data.seesawFirstTryCorrect ?? 0,
    seesawHintCount: data.seesawHintCount ?? 0,
    play: data.play ?? null,
  })

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
    stats: statsOnly(loaded.data),
    writable: loaded.writable,
    storageMessage: loaded.message,
    feedback: '',
    resetConfirming: false,
    settingsOpenedMode: null,
    settingsOpenedView: null,
    stickerEmoji: STICKERS[0],
    bus: null,
    seesaw: null,
  })

  function clearBusTimer() {
    if (busTimer) {
      cancelDelay(busTimer)
      busTimer = 0
    }
  }

  function clearSeesawTimer() {
    if (seesawTimer) {
      cancelDelay(seesawTimer)
      seesawTimer = 0
    }
  }

  function buildPlay(): PlaySnapshot {
    const pendingMode =
      state.view === 'settings' &&
      state.settingsOpenedMode != null &&
      state.settingsOpenedMode !== state.mode
    const opened = state.settingsOpenedView
    const view = gameViewFrom(
      pendingMode && (opened === 'complete' || opened === 'practice')
        ? 'practice'
        : pendingMode && opened === 'seesawComplete'
          ? 'seesaw'
          : state.view,
      pendingMode && (opened === 'complete' || opened === 'seesawComplete')
        ? opened === 'seesawComplete'
          ? 'seesaw'
          : 'practice'
        : opened,
      pendingMode ? false : state.settled,
    )
    const practice = pendingMode
      ? emptyPractice(state.mode, makeRound(state.mode, ROUND_SIZE, rng), state.stickerEmoji)
      : livePractice(state)
    const seesaw = pendingMode
      ? createSeesawPlay(makeRound(state.mode, ROUND_SIZE, rng))
      : state.seesaw
        ? seesawForDisk(state.seesaw)
        : null
    return {
      view,
      practice,
      bus: state.bus ? busForDisk(state.bus) : null,
      seesaw,
    }
  }

  function persistAll(nextStats?: SaveData): boolean {
    if (!hydrated) return false
    if (!state.writable) {
      if (!state.storageMessage) {
        state.storageMessage = '存档不可写入，未保存。'
      }
      return false
    }
    const base = nextStats ?? state.stats
    const next: SaveData = {
      ...statsOnly(base),
      mode: state.mode,
      play: buildPlay(),
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

  function applyPractice(practice: PlaySnapshot['practice']) {
    state.mode = practice.mode
    state.problems = practice.problems
    state.index = practice.index
    state.input = practice.input
    state.showHint = practice.showHint
    state.locked = practice.settled
    state.settled = practice.settled
    state.wrongOnce = practice.wrongOnce.slice()
    state.hintOnce = practice.hintOnce.slice()
    state.firstTryThisRound = practice.firstTryThisRound
    state.hintThisRound = practice.hintThisRound
    state.feedback = practice.feedback
    state.stickerEmoji = practice.stickerEmoji
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
    persistAll()
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
    persistAll({
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
    persistAll({
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
    if (play.motion === 'enter') {
      play.moving = false
      play.motion = 'idle'
      persistAll()
      return
    }
    const result = arriveNext(play)
    play.motion = 'idle'
    if (result === 'done') finishBus()
    else persistAll()
  }

  function startBus() {
    clearBusTimer()
    state.bus = createBusPlay(makeBusTrip(rng))
    cancelSpeech()
    state.view = 'bus'
    persistAll()
  }

  function finishSeesaw() {
    const play = state.seesaw
    if (!play || !play.settled || play.accounted) return
    play.accounted = true
    state.view = 'seesawComplete'
    persistAll({
      ...state.stats,
      seesawRoundsCompleted: state.stats.seesawRoundsCompleted + 1,
      seesawFirstTryCorrect: state.stats.seesawFirstTryCorrect + play.firstTryThisRound,
      seesawHintCount: state.stats.seesawHintCount + play.hintThisRound,
    })
  }

  function flushSeesawMove() {
    const play = state.seesaw
    if (!play?.moving) {
      clearSeesawTimer()
      return
    }
    clearSeesawTimer()
    if (play.outcome === 'correct' || play.motion === 'level') {
      const next = arriveSeesawNext(play)
      if (next === 'done') finishSeesaw()
      else persistAll()
      return
    }
    restoreSeesaw(play)
    persistAll()
  }

  function startSeesaw() {
    clearSeesawTimer()
    state.seesaw = createSeesawPlay(makeRound(state.mode, ROUND_SIZE, rng))
    cancelSpeech()
    state.view = 'seesaw'
    persistAll()
  }

  if (loaded.data.play) {
    applyPractice(loaded.data.play.practice)
    state.bus = loaded.data.play.bus
    state.seesaw = loaded.data.play.seesaw
    state.view = loaded.data.play.view
  } else {
    startRound(state.mode)
  }
  hydrated = true
  if (state.bus?.settled && !state.bus.accounted) finishBus()
  if (state.seesaw?.settled && !state.seesaw.accounted) finishSeesaw()

  function tapDigit(digit: string) {
    if (state.view !== 'practice' || state.locked || state.settled) return
    if (!/^\d$/.test(digit)) return
    if (state.input.length >= 2) return
    state.feedback = ''
    state.input += digit
    persistAll()
  }

  function tapDelete() {
    if (state.view !== 'practice' || state.locked || state.settled) return
    state.feedback = ''
    state.input = state.input.slice(0, -1)
    persistAll()
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
      persistAll()
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
    persistAll()
  }

  function toggleHint() {
    if (state.view !== 'practice' || state.settled) return
    const next = !state.showHint
    state.showHint = next
    if (next && !state.hintOnce[state.index]) {
      state.hintOnce[state.index] = true
      state.hintThisRound += 1
    }
    persistAll()
  }

  function cancelSpeech() {
    synthOf()?.cancel()
  }

  function openSettings() {
    cancelSpeech()
    flushBusMove()
    flushSeesawMove()
    if (state.view !== 'settings') {
      state.settingsOpenedView = state.view
    }
    state.settingsOpenedMode = state.mode
    state.resetConfirming = false
    state.view = 'settings'
    persistAll()
  }

  function closeSettings() {
    const openedMode = state.settingsOpenedMode
    const openedView = state.settingsOpenedView
    state.settingsOpenedMode = null
    state.settingsOpenedView = null
    state.resetConfirming = false
    if (openedMode != null && openedMode !== state.mode) {
      clearSeesawTimer()
      state.seesaw = createSeesawPlay(makeRound(state.mode, ROUND_SIZE, rng))
      startRound(state.mode)
      if (openedView === 'bus' || openedView === 'busComplete') {
        state.view = openedView
        persistAll()
        return
      }
      if (openedView === 'seesaw' || openedView === 'seesawComplete') {
        state.view = 'seesaw'
        persistAll()
      }
      return
    }
    if (openedView === 'bus' || openedView === 'busComplete') {
      state.view = openedView
      persistAll()
      return
    }
    if (openedView === 'seesaw' || openedView === 'seesawComplete') {
      state.view = openedView
      persistAll()
      return
    }
    if (state.settled) {
      state.view = 'complete'
      persistAll()
      return
    }
    state.view = 'practice'
    persistAll()
  }

  function setMode(mode: Mode) {
    if (mode === state.mode) return
    state.mode = mode
    persistAll()
  }

  function anotherRound() {
    if (!state.settled || state.view !== 'complete') return
    startRound(state.mode)
  }

  function openBus() {
    cancelSpeech()
    flushBusMove()
    flushSeesawMove()
    if (state.bus?.settled) {
      state.view = 'busComplete'
      persistAll()
      return
    }
    if (!state.bus) {
      startBus()
      return
    }
    state.view = 'bus'
    persistAll()
  }

  function openPractice() {
    cancelSpeech()
    flushBusMove()
    flushSeesawMove()
    if (state.settled) {
      state.view = 'complete'
      persistAll()
      return
    }
    state.view = 'practice'
    persistAll()
  }

  function openSeesaw() {
    cancelSpeech()
    flushBusMove()
    flushSeesawMove()
    if (state.seesaw?.settled) {
      state.view = 'seesawComplete'
      persistAll()
      return
    }
    if (!state.seesaw) {
      startSeesaw()
      return
    }
    state.view = 'seesaw'
    persistAll()
  }

  function switchPlay(kind: PlayKind) {
    if (playKindOf(state.view) === kind) return
    if (kind === 'practice') openPractice()
    else if (kind === 'bus') openBus()
    else openSeesaw()
  }

  function anotherBus() {
    if (state.view !== 'busComplete') return
    startBus()
  }

  function anotherSeesaw() {
    if (state.view !== 'seesawComplete') return
    startSeesaw()
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
    clearSeesawTimer()
    state.writable = true
    state.storageMessage = ''
    state.stats = { ...DEFAULT_SAVE }
    state.resetConfirming = false
    state.bus = null
    state.seesaw = null
    cancelSpeech()
    startRound(DEFAULT_SAVE.mode)
  }

  function withSeesaw(action: (play: SeesawPlay) => void) {
    const play = state.seesaw
    if (!play || state.view !== 'seesaw' || play.settled) return
    action(play)
  }

  function seesawTapDigit(digit: string) {
    withSeesaw((play) => {
      if (tapSeesawDigit(play, digit)) persistAll()
    })
  }

  function seesawTapDelete() {
    withSeesaw((play) => {
      if (tapSeesawDelete(play)) persistAll()
    })
  }

  function seesawTapConfirm() {
    withSeesaw((play) => {
      const result = confirmSeesaw(play)
      if (result === 'empty' || result === 'locked') return
      if (reducedMotion()) {
        if (result === 'correct') {
          const next = arriveSeesawNext(play)
          if (next === 'done') finishSeesaw()
          else persistAll()
        } else {
          restoreSeesaw(play)
          persistAll()
        }
        return
      }
      persistAll()
      clearSeesawTimer()
      if (result === 'correct') {
        seesawTimer = delay(() => {
          seesawTimer = 0
          if (!state.seesaw?.moving) return
          const next = arriveSeesawNext(state.seesaw)
          if (next === 'done') finishSeesaw()
          else persistAll()
        }, SEESAW_LEVEL_MS)
        return
      }
      seesawTimer = delay(() => {
        seesawTimer = 0
        if (!state.seesaw?.moving) return
        restoreSeesaw(state.seesaw)
        persistAll()
      }, SEESAW_HOLD_MS)
    })
  }

  function seesawHelp() {
    withSeesaw((play) => {
      if (!tapSeesawHelp(play)) return
      persistAll()
      speakChinese({
        text: zhCount(seesawLeft(play.problems[play.index]!)),
        synth: synthOf(),
      })
    })
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return
    if (state.view === 'seesaw') {
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        seesawTapDigit(event.key)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        seesawTapDelete()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        seesawTapConfirm()
      }
      return
    }
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
      if (tapWaiting(play, animalId)) persistAll()
    })
  }

  function busTapSeat(index: number) {
    withBus((play) => {
      if (tapSeat(play, index)) persistAll()
    })
  }

  function busTapOff(animalId: string) {
    withBus((play) => {
      if (tapOffArea(play, animalId)) persistAll()
    })
  }

  function busUndo() {
    withBus((play) => {
      if (undoLast(play)) persistAll()
    })
  }

  function busResetStop() {
    withBus((play) => {
      if (resetStation(play)) persistAll()
    })
  }

  function busHelper() {
    withBus((play) => {
      if (toggleHelper(play)) persistAll()
    })
  }

  function busDepart() {
    withBus((play) => {
      const result = depart(play)
      if (result === 'locked') return
      if (result !== 'ok') {
        persistAll()
        return
      }
      clearBusTimer()
      if (reducedMotion()) {
        play.motion = 'flash'
        persistAll()
        busTimer = delay(() => {
          busTimer = 0
          if (!state.bus?.moving) return
          const next = arriveNext(state.bus)
          state.bus.motion = 'idle'
          if (next === 'done') finishBus()
          else persistAll()
        }, BUS_FLASH_MS)
        return
      }
      play.motion = 'leave'
      persistAll()
      busTimer = delay(() => {
        busTimer = 0
        if (!state.bus?.moving) return
        const next = arriveNext(state.bus, true)
        if (next === 'done') {
          finishBus()
          return
        }
        persistAll()
        busTimer = delay(() => {
          busTimer = 0
          if (!state.bus?.moving) return
          state.bus.moving = false
          state.bus.motion = 'idle'
          persistAll()
        }, BUS_ENTER_MS)
      }, BUS_LEAVE_MS)
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
      if (toggleHelper(play)) persistAll()
    })
    if (state.bus?.helperOpen) busSpeakNumber()
    else cancelSpeech()
  }

  function dispose() {
    clearBusTimer()
    clearSeesawTimer()
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
    openSeesaw,
    switchPlay,
    anotherBus,
    anotherSeesaw,
    requestReset,
    cancelReset,
    confirmReset,
    handleKeydown,
    seesawTapDigit,
    seesawTapDelete,
    seesawTapConfirm,
    seesawHelp,
    flushSeesawMove,
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
