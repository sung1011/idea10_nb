import { describe, expect, it } from 'vitest'
import { ACKED_VERSION_KEY } from '../logic/appVersion'
import { mulberry32, problemKey } from '../logic/makeProblem'
import { currentStation, onboardCount } from '../logic/busMove'
import { STATION_COUNT } from '../logic/busRoute'
import { DEFAULT_SAVE, STORAGE_KEY, memoryStorage } from '../storage/appStorage'
import { createAppSession, hasBusyProgress, hasRoundProgress } from './appSession'

function answerCurrent(session: ReturnType<typeof createAppSession>) {
  const problem = session.state.problems[session.state.index]
  if (!problem) throw new Error('no problem')
  session.state.input = String(problem.answer)
  session.tapConfirm()
}

function finishRound(session: ReturnType<typeof createAppSession>) {
  while (!session.state.settled) {
    answerCurrent(session)
  }
}

describe('练习会话', () => {
  it('默认打开即练，混合 10 题', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(1) })
    expect(session.state.view).toBe('practice')
    expect(session.state.mode).toBe('mix')
    expect(session.state.problems).toHaveLength(10)
    expect(session.state.problems.some((item) => item.op === '+')).toBe(true)
    expect(session.state.problems.some((item) => item.op === '-')).toBe(true)
  })

  it('空确定不前进；答错留在本题且不计首次答对', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(2) })
    const firstKey = problemKey(session.state.problems[0]!)
    session.tapConfirm()
    expect(session.state.index).toBe(0)
    session.tapDigit('9')
    session.tapDigit('9')
    session.tapConfirm()
    expect(session.state.index).toBe(0)
    expect(session.state.input).toBe('')
    expect(session.state.wrongOnce[0]).toBe(true)
    answerCurrent(session)
    expect(problemKey(session.state.problems[session.state.index]!)).not.toBe(firstKey)
    finishRound(session)
    expect(session.state.stats.firstTryCorrect).toBeLessThan(10)
    expect(session.state.stats.roundsCompleted).toBe(1)
  })

  it('用了提示仍可计首次答对，提示另计', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(3) })
    session.toggleHint()
    session.toggleHint()
    session.toggleHint()
    expect(session.state.hintThisRound).toBe(1)
    answerCurrent(session)
    finishRound(session)
    expect(session.state.stats.hintUsed).toBe(1)
    expect(session.state.stats.firstTryCorrect).toBe(10)
    expect(session.state.stats.stickerCount).toBe(1)
  })

  it('快速重复确定不跳题', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(4) })
    const answer = String(session.state.problems[0]!.answer)
    session.state.input = answer
    session.tapConfirm()
    session.tapConfirm()
    expect(session.state.index).toBe(1)
    expect(session.state.settled).toBe(false)
  })

  it('末题完成统计只加一次，完成页不再自动续', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(5) })
    finishRound(session)
    expect(session.state.view).toBe('complete')
    expect(session.state.stats.roundsCompleted).toBe(1)
    expect(session.state.stats.stickerCount).toBe(1)
    session.tapConfirm()
    session.anotherRound()
    expect(session.state.view).toBe('practice')
    expect(session.state.stats.roundsCompleted).toBe(1)
    finishRound(session)
    expect(session.state.stats.roundsCompleted).toBe(2)
    session.tapConfirm()
    expect(session.state.stats.roundsCompleted).toBe(2)
    expect(session.state.view).toBe('complete')
  })

  it('模式切换后新轮生效，未改模式则续当前轮', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(6) })
    const original = session.state.problems.map(problemKey)
    session.openSettings()
    session.closeSettings()
    expect(session.state.problems.map(problemKey)).toEqual(original)
    session.openSettings()
    session.setMode('add')
    session.closeSettings()
    expect(session.state.view).toBe('practice')
    expect(session.state.index).toBe(0)
    expect(session.state.problems.every((item) => item.op === '+')).toBe(true)
    session.openSettings()
    session.setMode('sub')
    session.closeSettings()
    expect(session.state.problems.every((item) => item.op === '-')).toBe(true)
  })

  it('刷新后按已存设置重开新轮，不停在完成页', () => {
    const storage = memoryStorage()
    const first = createAppSession({ storage, rng: mulberry32(8) })
    first.openSettings()
    first.setMode('sub')
    first.closeSettings()
    finishRound(first)
    expect(first.state.stats.roundsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(9) })
    expect(again.state.view).toBe('practice')
    expect(again.state.mode).toBe('sub')
    expect(again.state.problems.every((item) => item.op === '-')).toBe(true)
    expect(again.state.stats.roundsCompleted).toBe(1)
    expect(again.state.settled).toBe(false)
  })

  it('坏存档不覆盖，完成轮次也不写坏键', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{bad' })
    const session = createAppSession({ storage, rng: mulberry32(10) })
    expect(session.state.writable).toBe(false)
    finishRound(session)
    expect(storage.getItem(STORAGE_KEY)).toBe('{bad')
    expect(session.state.stats.roundsCompleted).toBe(0)
    expect(session.state.storageMessage).toContain('损坏')
    expect(session.state.view).toBe('complete')
  })

  it('写入失败有提示且不把统计当成已保存', () => {
    const storage = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('quota')
      },
      removeItem() {},
    }
    const session = createAppSession({ storage, rng: mulberry32(11) })
    finishRound(session)
    expect(session.state.stats).toEqual(DEFAULT_SAVE)
    expect(session.state.storageMessage).toContain('写入失败')
  })

  it('重置需确认且只清本应用', () => {
    const storage = memoryStorage({ otherApp: 'keep' })
    const session = createAppSession({ storage, rng: mulberry32(12) })
    finishRound(session)
    session.openSettings()
    session.requestReset()
    session.cancelReset()
    expect(session.state.stats.roundsCompleted).toBe(1)
    session.requestReset()
    session.confirmReset()
    expect(session.state.stats.roundsCompleted).toBe(0)
    expect(session.state.mode).toBe('mix')
    expect(session.state.view).toBe('practice')
    expect(storage.getItem('otherApp')).toBe('keep')
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
  })

  it('做题中有进展才算本轮进度', () => {
    const blank = createAppSession({ storage: memoryStorage(), rng: mulberry32(14) })
    expect(hasRoundProgress(blank.state)).toBe(false)
    blank.tapDigit('1')
    expect(hasRoundProgress(blank.state)).toBe(true)

    const hinted = createAppSession({ storage: memoryStorage(), rng: mulberry32(15) })
    hinted.toggleHint()
    expect(hasRoundProgress(hinted.state)).toBe(true)

    const wrong = createAppSession({ storage: memoryStorage(), rng: mulberry32(16) })
    wrong.tapDigit('9')
    wrong.tapDigit('9')
    wrong.tapConfirm()
    expect(hasRoundProgress(wrong.state)).toBe(true)

    const answered = createAppSession({ storage: memoryStorage(), rng: mulberry32(17) })
    answerCurrent(answered)
    expect(hasRoundProgress(answered.state)).toBe(true)

    const done = createAppSession({ storage: memoryStorage(), rng: mulberry32(18) })
    finishRound(done)
    expect(done.state.view).toBe('complete')
    expect(hasRoundProgress(done.state)).toBe(false)
    done.openSettings()
    expect(hasRoundProgress(done.state)).toBe(false)
  })

  it('进设置不清空输入，设置中未完成轮次仍算进度', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(22) })
    session.tapDigit('3')
    session.openSettings()
    expect(session.state.view).toBe('settings')
    expect(session.state.input).toBe('3')
    expect(hasRoundProgress(session.state)).toBe(true)
    session.closeSettings()
    expect(session.state.view).toBe('practice')
    expect(session.state.input).toBe('3')
    expect(hasRoundProgress(session.state)).toBe(true)
  })

  it('旧 v1 统计存档可继续用，新轮仍是 10 题', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        mode: 'sub',
        roundsCompleted: 12,
        firstTryCorrect: 48,
        hintUsed: 3,
        stickerCount: 12,
      }),
    })
    const session = createAppSession({ storage, rng: mulberry32(21) })
    expect(session.state.mode).toBe('sub')
    expect(session.state.stats.roundsCompleted).toBe(12)
    expect(session.state.stats.firstTryCorrect).toBe(48)
    expect(session.state.problems).toHaveLength(10)
    expect(session.state.problems.every((item) => item.op === '-')).toBe(true)
  })

  it('硬件数字键可用，输入框中不拦截', () => {
    const session = createAppSession({ storage: memoryStorage(), rng: mulberry32(13) })
    const field = document.createElement('input')
    const blocked = new KeyboardEvent('keydown', { key: '7', bubbles: true, cancelable: true })
    Object.defineProperty(blocked, 'target', { value: field })
    session.handleKeydown(blocked)
    expect(session.state.input).toBe('')

    const allowed = new KeyboardEvent('keydown', { key: '7', bubbles: true, cancelable: true })
    Object.defineProperty(allowed, 'target', { value: document.body })
    session.handleKeydown(allowed)
    expect(session.state.input).toBe('7')
  })
})

function touchBus(session: ReturnType<typeof createAppSession>) {
  const play = session.state.bus
  if (!play) throw new Error('no bus')
  if (currentStation(play).kind === 'board') {
    const next = play.waiting[0]
    if (!next) throw new Error('no waiting')
    session.busTapWaiting(next.id)
    return
  }
  const index = play.seats.findIndex((seat) => seat)
  session.busTapSeat(index)
}

function fillCurrentStop(session: ReturnType<typeof createAppSession>) {
  const play = session.state.bus
  if (!play) throw new Error('no bus')
  const target = currentStation(play).target
  if (currentStation(play).kind === 'board') {
    while (onboardCount(play.seats) < target) {
      const next = play.waiting[0]
      if (!next) throw new Error('no waiting')
      session.busTapWaiting(next.id)
    }
  } else {
    while (onboardCount(play.seats) > target) {
      const index = play.seats.findIndex((seat) => seat)
      session.busTapSeat(index)
    }
  }
}

function passCurrentStop(session: ReturnType<typeof createAppSession>) {
  fillCurrentStop(session)
  session.busDepart()
  if (session.state.bus?.moving) session.flushBusMove()
}

function mockDelay() {
  let pending: (() => void) | null = null
  return {
    delay(fn: () => void) {
      pending = fn
      return 1
    },
    cancel() {
      pending = null
    },
    fire() {
      const fn = pending
      pending = null
      if (!fn) throw new Error('no pending timer')
      fn()
    },
    isEmpty() {
      return pending === null
    },
  }
}

describe('坐车会话', () => {
  it('默认仍是算术；坐车与算术内存互留；数字键不污染坐车', () => {
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(30),
      reducedMotion: () => true,
    })
    session.tapDigit('3')
    session.openBus()
    expect(session.state.view).toBe('bus')
    expect(session.state.bus).toBeTruthy()
    const key = new KeyboardEvent('keydown', { key: '7', bubbles: true, cancelable: true })
    Object.defineProperty(key, 'target', { value: document.body })
    session.handleKeydown(key)
    expect(session.state.input).toBe('3')
    session.openPractice()
    expect(session.state.view).toBe('practice')
    expect(session.state.input).toBe('3')
    expect(session.state.bus).toBeTruthy()
  })

  it('从坐车进设置改算术模式，返回不丢车局', () => {
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(31),
      reducedMotion: () => true,
    })
    session.openBus()
    const firstStop = session.state.bus?.trip.stations[0]?.name
    touchBus(session)
    session.openSettings()
    session.setMode('add')
    session.closeSettings()
    expect(session.state.view).toBe('bus')
    expect(session.state.bus?.trip.stations[0]?.name).toBe(firstStop)
    expect(session.state.bus?.stack.length).toBe(1)
    expect(session.state.mode).toBe('add')
  })

  it('未完成坐车算更新进度；完成页不算；算术完成也不误报', () => {
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(32),
      reducedMotion: () => true,
    })
    expect(hasBusyProgress(session.state)).toBe(false)
    session.openBus()
    expect(hasBusyProgress(session.state)).toBe(false)
    touchBus(session)
    expect(hasBusyProgress(session.state)).toBe(true)
    session.openSettings()
    expect(hasBusyProgress(session.state)).toBe(true)
    session.closeSettings()
    while (!session.state.bus?.settled) passCurrentStop(session)
    expect(session.state.view).toBe('busComplete')
    expect(hasBusyProgress(session.state)).toBe(false)
    session.openSettings()
    expect(hasBusyProgress(session.state)).toBe(false)
  })

  it('完成十题只结算一次；独立完成允许试错；看帮手不算独立', () => {
    const storage = memoryStorage()
    const session = createAppSession({
      storage,
      rng: mulberry32(33),
      reducedMotion: () => true,
    })
    session.openBus()
    expect(session.state.bus?.trip.stations).toHaveLength(STATION_COUNT)
    session.busDepart()
    expect(session.state.bus?.adjustThisTrip).toBe(1)
    session.busDepart()
    expect(session.state.bus?.adjustThisTrip).toBe(1)
    for (let i = 0; i < 5; i += 1) passCurrentStop(session)
    expect(session.state.bus?.settled).toBe(false)
    expect(session.state.view).toBe('bus')
    expect(session.state.stats.busTripsCompleted).toBe(0)
    expect(session.state.bus?.stationIndex).toBe(5)
    while (!session.state.bus?.settled) passCurrentStop(session)
    expect(session.state.stats.busTripsCompleted).toBe(1)
    expect(session.state.stats.busSoloCompleted).toBe(1)
    expect(session.state.stats.busAdjustCount).toBe(1)
    session.anotherBus()
    session.anotherBus()
    expect(session.state.stats.busTripsCompleted).toBe(1)
    session.busHelper()
    while (!session.state.bus?.settled) passCurrentStop(session)
    expect(session.state.stats.busTripsCompleted).toBe(2)
    expect(session.state.stats.busSoloCompleted).toBe(1)
    expect(session.state.stats.busHintCount).toBe(1)
  })

  it('动画连点不重复过站；设置会先落地动画', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(34),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.bus?.moving).toBe(true)
    expect(session.state.bus?.motion).toBe('leave')
    session.busDepart()
    session.busTapSeat(0)
    expect(session.state.bus?.stationIndex).toBe(0)
    session.openSettings()
    expect(session.state.bus?.moving).toBe(false)
    expect(session.state.bus?.stationIndex).toBe(1)
    expect(session.state.bus?.motion).toBe('idle')
    expect(timer.isEmpty()).toBe(true)
    session.closeSettings()
    expect(session.state.view).toBe('bus')
  })

  it('驶离后换站再驶入；驶入中flush只落地一次', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(39),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.bus?.motion).toBe('leave')
    expect(session.state.bus?.stationIndex).toBe(0)
    timer.fire()
    expect(session.state.bus?.stationIndex).toBe(1)
    expect(session.state.bus?.moving).toBe(true)
    expect(session.state.bus?.motion).toBe('enter')
    const at = session.state.bus!.stationIndex
    session.busDepart()
    session.busTapSeat(0)
    expect(session.state.bus?.stationIndex).toBe(at)
    session.openSettings()
    expect(session.state.bus?.stationIndex).toBe(at)
    expect(session.state.bus?.moving).toBe(false)
    expect(session.state.bus?.motion).toBe('idle')
    session.closeSettings()
    expect(session.state.view).toBe('bus')
  })

  it('减弱动画用灯光阶段过站，错误发车不走', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(40),
      reducedMotion: () => true,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    session.busDepart()
    expect(session.state.bus?.motion).toBe('idle')
    expect(session.state.bus?.moving).toBe(false)
    expect(timer.isEmpty()).toBe(true)
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.bus?.motion).toBe('flash')
    expect(session.state.bus?.stationIndex).toBe(0)
    timer.fire()
    expect(session.state.bus?.stationIndex).toBe(1)
    expect(session.state.bus?.motion).toBe('idle')
    expect(session.state.bus?.moving).toBe(false)
  })

  it('末站驶离后出票，不再驶入', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(41),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    while ((session.state.bus?.stationIndex ?? 0) < STATION_COUNT - 1) {
      fillCurrentStop(session)
      session.busDepart()
      timer.fire()
      timer.fire()
    }
    expect(session.state.bus?.stationIndex).toBe(STATION_COUNT - 1)
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.view).toBe('bus')
    expect(session.state.bus?.motion).toBe('leave')
    timer.fire()
    expect(session.state.view).toBe('busComplete')
    expect(session.state.stats.busTripsCompleted).toBe(1)
  })

  it('无语音朗读静默失败；刷新丢中途局但保留已存统计', () => {
    const storage = memoryStorage()
    const session = createAppSession({
      storage,
      rng: mulberry32(35),
      reducedMotion: () => true,
      synth: null,
    })
    session.openBus()
    session.busHelp()
    expect(session.state.bus?.helperOpen).toBe(true)
    expect(JSON.stringify(session.state)).not.toContain('读不出来')
    while (!session.state.bus?.settled) passCurrentStop(session)
    expect(session.state.stats.busTripsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(36), reducedMotion: () => true })
    expect(again.state.view).toBe('practice')
    expect(again.state.bus).toBeNull()
    expect(again.state.stats.busTripsCompleted).toBe(1)
    expect(again.state.stats.roundsCompleted).toBe(0)
  })

  it('重置清坐车统计；损坏存档完成坐车也不覆盖', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{bad' })
    const session = createAppSession({
      storage,
      rng: mulberry32(37),
      reducedMotion: () => true,
    })
    session.openBus()
    while (!session.state.bus?.settled) passCurrentStop(session)
    expect(storage.getItem(STORAGE_KEY)).toBe('{bad')
    expect(session.state.stats.busTripsCompleted).toBe(0)

    const ok = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(38),
      reducedMotion: () => true,
    })
    ok.openBus()
    while (!ok.state.bus?.settled) passCurrentStop(ok)
    ok.openSettings()
    ok.requestReset()
    ok.confirmReset()
    expect(ok.state.stats.busTripsCompleted).toBe(0)
    expect(ok.state.view).toBe('practice')
    expect(ok.state.bus).toBeNull()
  })
})

