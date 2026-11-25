import { describe, expect, it } from 'vitest'
import { ACKED_VERSION_KEY } from '../logic/appVersion'
import { mulberry32, problemKey } from '../logic/makeProblem'
import { currentStation, onboardCount } from '../logic/busMove'
import { STATION_COUNT } from '../logic/busRoute'
import { DEFAULT_SAVE, STORAGE_KEY, memoryStorage } from '../storage/appStorage'
import {
  createAppSession,
  hasBusyProgress,
  hasRoundProgress,
  SEESAW_CELEBRATE_MS,
  SEESAW_HOLD_MS,
  SEESAW_LEVEL_MS,
} from './appSession'

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

  it('完成页刷新仍停在完成页且统计不加', () => {
    const storage = memoryStorage()
    const first = createAppSession({ storage, rng: mulberry32(8) })
    first.openSettings()
    first.setMode('sub')
    first.closeSettings()
    finishRound(first)
    expect(first.state.stats.roundsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(9) })
    expect(again.state.view).toBe('complete')
    expect(again.state.mode).toBe('sub')
    expect(again.state.settled).toBe(true)
    expect(again.state.stats.roundsCompleted).toBe(1)
    const third = createAppSession({ storage, rng: mulberry32(10) })
    expect(third.state.stats.roundsCompleted).toBe(1)
    expect(third.state.view).toBe('complete')
    third.anotherRound()
    expect(third.state.view).toBe('practice')
    expect(third.state.problems.every((item) => item.op === '-')).toBe(true)
    const replay = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(replay.roundsCompleted).toBe(1)
    expect(replay.play.view).toBe('practice')
    expect(replay.play.practice.index).toBe(0)
    expect(replay.play.practice.settled).toBe(false)
    const fourth = createAppSession({ storage, rng: mulberry32(11) })
    expect(fourth.state.view).toBe('practice')
    expect(fourth.state.stats.roundsCompleted).toBe(1)
    expect(fourth.state.problems).toEqual(third.state.problems)
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
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
    const afterReset = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(afterReset.roundsCompleted).toBe(0)
    expect(afterReset.play.practice.index).toBe(0)
    expect(afterReset.play.view).toBe('practice')
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
  const waits: number[] = []
  return {
    waits,
    delay(fn: () => void, ms = 0) {
      pending = fn
      waits.push(ms)
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

function instantDelay() {
  return {
    delay(fn: () => void) {
      fn()
      return 1
    },
    cancelDelay() {},
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

  it('无语音朗读静默失败；完成坐车刷新仍出票且统计不加', () => {
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
    expect(again.state.view).toBe('busComplete')
    expect(again.state.bus?.settled).toBe(true)
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

  it('坐车中途刷新续玩；动画各阶段刷新不重复过题', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(50),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    fillCurrentStop(session)
    const firstTarget = currentStation(session.state.bus!).target
    session.busDepart()
    expect(session.state.bus?.motion).toBe('leave')
    const afterLeave = createAppSession({ storage, rng: mulberry32(51), reducedMotion: () => false })
    expect(afterLeave.state.view).toBe('bus')
    expect(afterLeave.state.bus?.moving).toBe(false)
    expect(afterLeave.state.bus?.stationIndex).toBe(1)
    expect(currentStation(afterLeave.state.bus!).target).not.toBe(firstTarget)

    fillCurrentStop(afterLeave)
    const enterTimer = mockDelay()
    const moving = createAppSession({
      storage,
      rng: mulberry32(52),
      reducedMotion: () => false,
      delay: enterTimer.delay,
      cancelDelay: enterTimer.cancel,
    })
    fillCurrentStop(moving)
    moving.busDepart()
    enterTimer.fire()
    expect(moving.state.bus?.motion).toBe('enter')
    const at = moving.state.bus!.stationIndex
    const afterEnter = createAppSession({ storage, rng: mulberry32(53), reducedMotion: () => false })
    expect(afterEnter.state.bus?.stationIndex).toBe(at)
    expect(afterEnter.state.bus?.moving).toBe(false)
  })

  it('末题驶离中刷新只结算一次', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(54),
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
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.bus?.motion).toBe('leave')
    expect(session.state.stats.busTripsCompleted).toBe(0)
    const restored = createAppSession({ storage, rng: mulberry32(55), reducedMotion: () => true })
    expect(restored.state.view).toBe('busComplete')
    expect(restored.state.stats.busTripsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(56), reducedMotion: () => true })
    expect(again.state.stats.busTripsCompleted).toBe(1)
  })
})

describe('自动存档恢复', () => {
  it('v1 统计可迁移；初始化不覆盖；输入刷新仍在', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        mode: 'add',
        roundsCompleted: 7,
        firstTryCorrect: 20,
        hintUsed: 2,
        stickerCount: 7,
      }),
    })
    const session = createAppSession({ storage, rng: mulberry32(60) })
    expect(session.state.stats.roundsCompleted).toBe(7)
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1)
    session.tapDigit('3')
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.version).toBe(3)
    expect(saved.play.practice.input).toBe('3')
    expect(saved.roundsCompleted).toBe(7)
    const again = createAppSession({ storage, rng: mulberry32(61) })
    expect(again.state.input).toBe('3')
    expect(again.state.mode).toBe('add')
    expect(again.state.view).toBe('practice')
    expect(again.state.problems).toEqual(session.state.problems)
  })

  it('设置里改模式未退出就刷新：新模式新题且不丢坐车', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(62), reducedMotion: () => true })
    session.openBus()
    const tripStart = session.state.bus?.trip.startCount
    session.openSettings()
    session.setMode('add')
    expect(session.state.problems.some((item) => item.op === '-')).toBe(true)
    const disk = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(disk.mode).toBe('add')
    expect(disk.play.practice.mode).toBe('add')
    expect(disk.play.practice.problems.every((item: { op: string }) => item.op === '+')).toBe(true)
    expect(disk.play.seesaw.problems.every((item: { op: string }) => item.op === '+')).toBe(true)
    expect(disk.play.view).toBe('bus')
    const again = createAppSession({ storage, rng: mulberry32(63), reducedMotion: () => true })
    expect(again.state.mode).toBe('add')
    expect(again.state.view).toBe('bus')
    expect(again.state.problems.every((item) => item.op === '+')).toBe(true)
    expect(again.state.bus?.trip.startCount).toBe(tripStart)
  })

  it('更高版本不覆盖；写失败不改统计', () => {
    const raw = JSON.stringify({ ...DEFAULT_SAVE, version: 4, roundsCompleted: 9 })
    const frozen = memoryStorage({ [STORAGE_KEY]: raw, otherApp: 'keep' })
    const blocked = createAppSession({ storage: frozen, rng: mulberry32(64) })
    blocked.tapDigit('1')
    expect(frozen.getItem(STORAGE_KEY)).toBe(raw)
    expect(frozen.getItem('otherApp')).toBe('keep')

    const failing = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('quota')
      },
      removeItem() {},
    }
    const session = createAppSession({ storage: failing, rng: mulberry32(65) })
    session.tapDigit('2')
    expect(session.state.stats).toEqual(DEFAULT_SAVE)
    expect(session.state.storageMessage).toContain('写入失败')
  })

  it('两玩法互留：算术输入和坐车进度都能恢复', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(66), reducedMotion: () => true })
    session.tapDigit('4')
    session.openBus()
    fillCurrentStop(session)
    session.busDepart()
    session.flushBusMove()
    const index = session.state.bus!.stationIndex
    const restored = createAppSession({ storage, rng: mulberry32(67), reducedMotion: () => true })
    expect(restored.state.view).toBe('bus')
    expect(restored.state.bus?.stationIndex).toBe(index)
    restored.openPractice()
    expect(restored.state.input).toBe('4')
  })

  it('设置刷新回到进入前玩法；算术里改模式未退出则新开算术', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(68), reducedMotion: () => true })
    session.tapDigit('5')
    session.toggleHint()
    session.openSettings()
    const fromSettings = createAppSession({ storage, rng: mulberry32(69) })
    expect(fromSettings.state.view).toBe('practice')
    expect(fromSettings.state.input).toBe('5')
    expect(fromSettings.state.showHint).toBe(true)
    fromSettings.openSettings()
    fromSettings.setMode('add')
    const afterMode = createAppSession({ storage, rng: mulberry32(70) })
    expect(afterMode.state.view).toBe('practice')
    expect(afterMode.state.mode).toBe('add')
    expect(afterMode.state.input).toBe('')
    expect(afterMode.state.problems.every((item) => item.op === '+')).toBe(true)
  })

  it('有效快照初始化不覆盖；发车失败锁可恢复', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(71), reducedMotion: () => true })
    session.tapDigit('6')
    const raw = storage.getItem(STORAGE_KEY)
    createAppSession({ storage, rng: mulberry32(72) })
    expect(storage.getItem(STORAGE_KEY)).toBe(raw)
    const bus = createAppSession({ storage, rng: mulberry32(73), reducedMotion: () => true })
    bus.openBus()
    bus.busDepart()
    expect(bus.state.bus?.departLocked).toBe(true)
    const again = createAppSession({ storage, rng: mulberry32(74), reducedMotion: () => true })
    expect(again.state.view).toBe('bus')
    expect(again.state.bus?.departLocked).toBe(true)
    expect(again.state.input).toBe('6')
  })

  it('减弱动画闪灯中刷新已到下一题', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(75),
      reducedMotion: () => true,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openBus()
    fillCurrentStop(session)
    session.busDepart()
    expect(session.state.bus?.motion).toBe('flash')
    expect(session.state.bus?.stationIndex).toBe(0)
    const restored = createAppSession({ storage, rng: mulberry32(76), reducedMotion: () => true })
    expect(restored.state.bus?.moving).toBe(false)
    expect(restored.state.bus?.motion).toBe('idle')
    expect(restored.state.bus?.stationIndex).toBe(1)
    expect(restored.state.stats.busTripsCompleted).toBe(0)
  })
})

describe('跷跷板会话', () => {
  function typeUnknown(session: ReturnType<typeof createAppSession>, value: number) {
    for (const d of String(value)) session.seesawTapDigit(d)
  }

  it('三玩法可互切并保留输入', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(80), reducedMotion: () => true })
    session.tapDigit('3')
    session.switchPlay('seesaw')
    expect(session.state.view).toBe('seesaw')
    expect(session.state.seesaw?.problems).toHaveLength(10)
    const firstRight = session.state.seesaw!.right
    typeUnknown(session, 1)
    expect(session.state.seesaw?.right).toBe(firstRight)
    session.switchPlay('bus')
    expect(session.state.view).toBe('bus')
    session.switchPlay('practice')
    expect(session.state.view).toBe('practice')
    expect(session.state.input).toBe('3')
    session.switchPlay('seesaw')
    expect(session.state.view).toBe('seesaw')
    expect(session.state.seesaw?.input).toBe('1')
    session.switchPlay('seesaw')
    expect(session.state.seesaw?.input).toBe('1')
    const restored = createAppSession({ storage, rng: mulberry32(81), reducedMotion: () => true })
    expect(restored.state.view).toBe('seesaw')
    restored.switchPlay('practice')
    expect(restored.state.input).toBe('3')
    restored.switchPlay('bus')
    expect(restored.state.bus).toBeTruthy()
  })

  it('错答停错误倾角后还原；超过 10 不改盘；0 变化必须提交', () => {
    const clocks = instantDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(82),
      reducedMotion: () => true,
      delay: clocks.delay,
      cancelDelay: clocks.cancelDelay,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems[0] = { a: 3, b: 4, op: '+', answer: 7 }
    play.right = 3
    typeUnknown(session, 2)
    session.seesawTapConfirm()
    expect(play.right).toBe(3)
    expect(play.wrongOnce[0]).toBe(true)
    expect(play.input).toBe('')
    typeUnknown(session, 8)
    session.seesawTapConfirm()
    expect(play.right).toBe(3)
    play.problems[0] = { a: 5, b: 0, op: '+', answer: 5 }
    play.right = 5
    session.seesawTapConfirm()
    expect(play.index).toBe(0)
    expect(play.settled).toBe(false)
    typeUnknown(session, 0)
    session.seesawTapConfirm()
    expect(play.index).toBe(1)
  })

  it('完成十题统计只加一次；刷新完成页不加；再玩写 1/10', () => {
    const storage = memoryStorage()
    const clocks = instantDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(83),
      reducedMotion: () => true,
      delay: clocks.delay,
      cancelDelay: clocks.cancelDelay,
    })
    session.openSeesaw()
    while (!session.state.seesaw?.settled) {
      const play = session.state.seesaw!
      const unknown = play.problems[play.index]!.b
      for (const d of String(unknown)) session.seesawTapDigit(d)
      session.seesawTapConfirm()
    }
    expect(session.state.view).toBe('seesawComplete')
    expect(session.state.stats.seesawRoundsCompleted).toBe(1)
    expect(session.state.stats.roundsCompleted).toBe(0)
    const again = createAppSession({ storage, rng: mulberry32(84), reducedMotion: () => true })
    expect(again.state.view).toBe('seesawComplete')
    expect(again.state.stats.seesawRoundsCompleted).toBe(1)
    const third = createAppSession({ storage, rng: mulberry32(85), reducedMotion: () => true })
    expect(third.state.stats.seesawRoundsCompleted).toBe(1)
    third.anotherSeesaw()
    expect(third.state.view).toBe('seesaw')
    expect(third.state.seesaw?.index).toBe(0)
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').play.view).toBe('seesaw')
  })

  it('正确动画中刷新已到下一题；错误动画中刷新回原题', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(86),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems = [
      { a: 3, b: 4, op: '+', answer: 7 },
      { a: 1, b: 2, op: '+', answer: 3 },
      { a: 2, b: 2, op: '+', answer: 4 },
      { a: 4, b: 1, op: '+', answer: 5 },
      { a: 0, b: 3, op: '+', answer: 3 },
      { a: 5, b: 1, op: '+', answer: 6 },
      { a: 6, b: 2, op: '+', answer: 8 },
      { a: 2, b: 5, op: '+', answer: 7 },
      { a: 1, b: 1, op: '+', answer: 2 },
      { a: 3, b: 3, op: '+', answer: 6 },
    ]
    play.right = 3
    for (const d of '4') session.seesawTapDigit(d)
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    expect(play.index).toBe(0)
    const afterOk = createAppSession({ storage, rng: mulberry32(87), reducedMotion: () => true })
    expect(afterOk.state.seesaw?.index).toBe(1)
    expect(afterOk.state.seesaw?.motion).toBe('idle')

    const timer2 = mockDelay()
    const wrong = createAppSession({
      storage,
      rng: mulberry32(88),
      reducedMotion: () => false,
      delay: timer2.delay,
      cancelDelay: timer2.cancel,
    })
    const w = wrong.state.seesaw!
    w.right = 1
    wrong.seesawTapDigit('9')
    wrong.seesawTapConfirm()
    expect(w.motion).toBe('hold')
    const afterBad = createAppSession({ storage, rng: mulberry32(89), reducedMotion: () => true })
    expect(afterBad.state.seesaw?.index).toBe(1)
    expect(afterBad.state.seesaw?.right).toBe(1)
    expect(afterBad.state.seesaw?.motion).toBe('idle')
  })

  function tenAdd() {
    return [
      { a: 3, b: 4, op: '+' as const, answer: 7 },
      { a: 1, b: 2, op: '+' as const, answer: 3 },
      { a: 2, b: 2, op: '+' as const, answer: 4 },
      { a: 4, b: 1, op: '+' as const, answer: 5 },
      { a: 0, b: 3, op: '+' as const, answer: 3 },
      { a: 5, b: 1, op: '+' as const, answer: 6 },
      { a: 6, b: 2, op: '+' as const, answer: 8 },
      { a: 2, b: 5, op: '+' as const, answer: 7 },
      { a: 1, b: 1, op: '+' as const, answer: 2 },
      { a: 3, b: 3, op: '+' as const, answer: 6 },
    ]
  }

  it('答对先回平再庆祝停留后下一题；重复确认无效', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(102),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems = tenAdd()
    play.right = 3
    session.seesawTapDigit('4')
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    expect(play.right).toBe(7)
    expect(timer.waits.at(-1)).toBe(SEESAW_LEVEL_MS)
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    expect(play.index).toBe(0)
    timer.fire()
    expect(play.motion).toBe('cheer')
    expect(play.index).toBe(0)
    expect(play.right).toBe(7)
    expect(timer.waits.at(-1)).toBe(SEESAW_CELEBRATE_MS)
    session.seesawTapDigit('9')
    session.seesawTapConfirm()
    expect(play.motion).toBe('cheer')
    expect(play.input).toBe('')
    timer.fire()
    expect(play.index).toBe(1)
    expect(play.motion).toBe('idle')
    expect(play.input).toBe('')
  })

  it('答错保持错误倾角后轻停再还原清输入', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(103),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems = tenAdd()
    play.right = 3
    session.seesawTapDigit('2')
    session.seesawTapConfirm()
    expect(play.motion).toBe('hold')
    expect(play.right).toBe(5)
    expect(play.input).toBe('')
    expect(timer.waits.at(-1)).toBe(SEESAW_HOLD_MS)
    session.seesawTapConfirm()
    expect(play.motion).toBe('hold')
    expect(play.right).toBe(5)
    timer.fire()
    expect(play.motion).toBe('idle')
    expect(play.right).toBe(3)
    expect(play.input).toBe('')
    expect(play.index).toBe(0)
  })

  it('减弱动效仍先显示庆祝再进下一题', () => {
    const timer = mockDelay()
    const session = createAppSession({
      storage: memoryStorage(),
      rng: mulberry32(104),
      reducedMotion: () => true,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems = tenAdd()
    play.right = 3
    session.seesawTapDigit('4')
    session.seesawTapConfirm()
    expect(play.motion).toBe('cheer')
    expect(play.index).toBe(0)
    expect(timer.waits.at(-1)).toBe(SEESAW_CELEBRATE_MS)
    timer.fire()
    expect(play.index).toBe(1)
    expect(play.motion).toBe('idle')
  })

  it('庆祝中切走会收尾，不错丢题不双计', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(105),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.switchPlay('seesaw')
    const play = session.state.seesaw!
    play.problems = tenAdd()
    play.right = 3
    session.seesawTapDigit('4')
    session.seesawTapConfirm()
    timer.fire()
    expect(play.motion).toBe('cheer')
    session.switchPlay('practice')
    expect(session.state.view).toBe('practice')
    expect(session.state.seesaw?.index).toBe(1)
    expect(session.state.seesaw?.motion).toBe('idle')
    expect(session.state.stats.seesawRoundsCompleted).toBe(0)
    const restored = createAppSession({ storage, rng: mulberry32(106), reducedMotion: () => true })
    expect(restored.state.seesaw?.index).toBe(1)
    expect(restored.state.stats.seesawRoundsCompleted).toBe(0)
  })

  it('末题庆祝后结算一次；刷新完成页不双计', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(107),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.problems = tenAdd()
    play.index = 9
    play.right = 3
    session.seesawTapDigit('3')
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    timer.fire()
    expect(play.motion).toBe('cheer')
    expect(play.settled).toBe(false)
    expect(session.state.view).toBe('seesaw')
    expect(session.state.stats.seesawRoundsCompleted).toBe(0)
    session.seesawTapConfirm()
    expect(play.motion).toBe('cheer')
    timer.fire()
    expect(session.state.view).toBe('seesawComplete')
    expect(session.state.stats.seesawRoundsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(108), reducedMotion: () => true })
    expect(again.state.view).toBe('seesawComplete')
    expect(again.state.stats.seesawRoundsCompleted).toBe(1)
  })

  it('设置改模式未退出刷新：新开算术和跷跷板，坐车留下', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(90), reducedMotion: () => true })
    session.openBus()
    const startCount = session.state.bus?.trip.startCount
    session.openSeesaw()
    session.openSettings()
    session.setMode('add')
    const disk = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(disk.mode).toBe('add')
    expect(disk.play.practice.problems.every((item: { op: string }) => item.op === '+')).toBe(true)
    expect(disk.play.seesaw.problems.every((item: { op: string }) => item.op === '+')).toBe(true)
    expect(disk.play.view).toBe('seesaw')
    expect(disk.play.bus.trip.startCount).toBe(startCount)
    const again = createAppSession({ storage, rng: mulberry32(91), reducedMotion: () => true })
    expect(again.state.view).toBe('seesaw')
    expect(again.state.seesaw?.problems.every((item) => item.op === '+')).toBe(true)
    expect(again.state.bus?.trip.startCount).toBe(startCount)
  })

  it('未完成跷跷板算更新进度；完成页不算', () => {
    const storage = memoryStorage()
    const clocks = instantDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(93),
      reducedMotion: () => true,
      delay: clocks.delay,
      cancelDelay: clocks.cancelDelay,
    })
    session.openSeesaw()
    expect(hasBusyProgress(session.state)).toBe(false)
    session.seesawTapDigit('1')
    expect(hasBusyProgress(session.state)).toBe(true)
    session.openSettings()
    expect(hasBusyProgress(session.state)).toBe(true)
    session.closeSettings()
    while (!session.state.seesaw?.settled) {
      const play = session.state.seesaw!
      for (const d of String(play.problems[play.index]!.b)) session.seesawTapDigit(d)
      session.seesawTapConfirm()
    }
    expect(session.state.view).toBe('seesawComplete')
    expect(hasBusyProgress(session.state)).toBe(false)
  })

  it('v2 存档升 v3 保留算术坐车，跷跷板从空开始', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(94), reducedMotion: () => true })
    session.tapDigit('4')
    session.openBus()
    const index = session.state.bus!.stationIndex
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown> & {
      play: Record<string, unknown>
    }
    raw.version = 2
    delete raw.seesawRoundsCompleted
    delete raw.seesawFirstTryCorrect
    delete raw.seesawHintCount
    delete raw.play.seesaw
    storage.setItem(STORAGE_KEY, JSON.stringify(raw))
    const again = createAppSession({ storage, rng: mulberry32(95), reducedMotion: () => true })
    expect(again.state.view).toBe('bus')
    expect(again.state.bus?.stationIndex).toBe(index)
    expect(again.state.seesaw).toBeNull()
    expect(again.state.stats.seesawRoundsCompleted).toBe(0)
    again.openPractice()
    expect(again.state.input).toBe('4')
    again.openSeesaw()
    expect(again.state.view).toBe('seesaw')
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.version).toBe(3)
    expect(saved.play.practice.input).toBe('4')
    expect(saved.play.bus.stationIndex).toBe(index)
  })

  it('完成页互切不重开不双计；再来一次才新开；同玩法选择无效', () => {
    const storage = memoryStorage()
    const clocks = instantDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(96),
      reducedMotion: () => true,
      delay: clocks.delay,
      cancelDelay: clocks.cancelDelay,
    })
    session.switchPlay('seesaw')
    while (!session.state.seesaw?.settled) {
      const play = session.state.seesaw!
      for (const d of String(play.problems[play.index]!.b)) session.seesawTapDigit(d)
      session.seesawTapConfirm()
    }
    expect(session.state.view).toBe('seesawComplete')
    expect(session.state.stats.seesawRoundsCompleted).toBe(1)
    session.switchPlay('seesaw')
    expect(session.state.view).toBe('seesawComplete')
    session.switchPlay('practice')
    session.switchPlay('seesaw')
    expect(session.state.view).toBe('seesawComplete')
    expect(session.state.stats.seesawRoundsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(97), reducedMotion: () => true })
    expect(again.state.view).toBe('seesawComplete')
    again.switchPlay('bus')
    expect(again.state.view).toBe('bus')
    again.switchPlay('seesaw')
    expect(again.state.view).toBe('seesawComplete')
    expect(again.state.stats.seesawRoundsCompleted).toBe(1)
    again.anotherSeesaw()
    expect(again.state.view).toBe('seesaw')
    expect(again.state.seesaw?.index).toBe(0)
    expect(again.state.seesaw?.settled).toBe(false)
  })

  it('动画中切走会收尾，不错丢题不双计', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(98),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.switchPlay('seesaw')
    const play = session.state.seesaw!
    play.problems = [
      { a: 3, b: 4, op: '+', answer: 7 },
      { a: 1, b: 2, op: '+', answer: 3 },
      { a: 2, b: 2, op: '+', answer: 4 },
      { a: 4, b: 1, op: '+', answer: 5 },
      { a: 0, b: 3, op: '+', answer: 3 },
      { a: 5, b: 1, op: '+', answer: 6 },
      { a: 6, b: 2, op: '+', answer: 8 },
      { a: 2, b: 5, op: '+', answer: 7 },
      { a: 1, b: 1, op: '+', answer: 2 },
      { a: 3, b: 3, op: '+', answer: 6 },
    ]
    play.right = 3
    session.seesawTapDigit('4')
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    session.switchPlay('practice')
    expect(session.state.view).toBe('practice')
    expect(session.state.seesaw?.index).toBe(1)
    expect(session.state.seesaw?.motion).toBe('idle')
    session.switchPlay('seesaw')
    expect(session.state.view).toBe('seesaw')
    expect(session.state.seesaw?.index).toBe(1)
    const restored = createAppSession({ storage, rng: mulberry32(99), reducedMotion: () => true })
    expect(restored.state.seesaw?.index).toBe(1)
    expect(restored.state.stats.seesawRoundsCompleted).toBe(0)
  })

  it('设置返回完成页；完成算术切坐车再回来仍是完成页', () => {
    const storage = memoryStorage()
    const session = createAppSession({ storage, rng: mulberry32(100), reducedMotion: () => true })
    while (!session.state.settled) {
      const problem = session.state.problems[session.state.index]!
      session.state.input = String(problem.answer)
      session.tapConfirm()
    }
    expect(session.state.view).toBe('complete')
    expect(session.state.stats.roundsCompleted).toBe(1)
    session.openSettings()
    session.closeSettings()
    expect(session.state.view).toBe('complete')
    session.switchPlay('bus')
    session.switchPlay('practice')
    expect(session.state.view).toBe('complete')
    expect(session.state.stats.roundsCompleted).toBe(1)
    const again = createAppSession({ storage, rng: mulberry32(101) })
    expect(again.state.view).toBe('complete')
    expect(again.state.stats.roundsCompleted).toBe(1)
  })
})

describe('贴纸奖励', () => {
  function instant() {
    return instantDelay()
  }

  function makeSession(storage = memoryStorage(), seed = 201) {
    const delay = instant()
    return createAppSession({
      storage,
      rng: mulberry32(seed),
      reducedMotion: () => true,
      delay: delay.delay,
      cancelDelay: delay.cancelDelay,
    })
  }

  function awardOf(session: ReturnType<typeof createAppSession>) {
    if (session.state.view === 'complete') return session.state.stickerId
    if (session.state.view === 'busComplete') return session.state.busSticker
    if (session.state.view === 'seesawComplete') return session.state.seesawSticker
    throw new Error(session.state.view)
  }

  function finishPlay(session: ReturnType<typeof createAppSession>, kind: 'practice' | 'bus' | 'seesaw') {
    if (kind === 'practice') {
      session.switchPlay('practice')
      if (session.state.view === 'complete') session.anotherRound()
      finishRound(session)
      return
    }
    if (kind === 'bus') {
      session.switchPlay('bus')
      if (session.state.view === 'busComplete') session.anotherBus()
      while (session.state.view === 'bus') passCurrentStop(session)
      return
    }
    session.switchPlay('seesaw')
    if (session.state.view === 'seesawComplete') session.anotherSeesaw()
    while (session.state.view === 'seesaw') {
      const play = session.state.seesaw!
      const problem = play.problems[play.index]
      if (!problem) throw new Error('no seesaw problem')
      for (const digit of String(problem.b)) session.seesawTapDigit(digit)
      session.seesawTapConfirm()
    }
  }

  it('三玩法合计连续 25 次结算 25 个 ID 不重复，第 26 次开新轮', () => {
    const session = makeSession()
    const kinds = ['practice', 'bus', 'seesaw'] as const
    const ids: string[] = []
    for (let i = 0; i < 25; i += 1) {
      finishPlay(session, kinds[i % 3]!)
      ids.push(awardOf(session))
    }
    expect(ids).toHaveLength(25)
    expect(new Set(ids).size).toBe(25)
    expect(session.state.stickerBag.next).toBe(25)
    finishPlay(session, 'practice')
    expect(session.state.stickerBag.next).toBe(1)
    expect(ids).toContain(awardOf(session))
    expect(session.state.stats.roundsCompleted).toBe(10)
    expect(session.state.stats.busTripsCompleted).toBe(8)
    expect(session.state.stats.seesawRoundsCompleted).toBe(8)
  })

  it('跨刷新续抽同一袋；完成页互切不消耗', () => {
    const storage = memoryStorage()
    const first = makeSession(storage, 202)
    finishPlay(first, 'practice')
    const one = first.state.stickerId
    finishPlay(first, 'bus')
    const two = first.state.busSticker
    expect(one).not.toBe(two)
    expect(first.state.stickerBag.next).toBe(2)
    first.switchPlay('practice')
    expect(first.state.view).toBe('complete')
    expect(first.state.stickerId).toBe(one)
    first.switchPlay('bus')
    expect(first.state.view).toBe('busComplete')
    expect(first.state.busSticker).toBe(two)
    expect(first.state.stickerBag.next).toBe(2)
    const again = makeSession(storage, 203)
    expect(again.state.stickerBag.next).toBe(2)
    expect(again.state.stickerBag.order).toEqual(first.state.stickerBag.order)
    finishPlay(again, 'seesaw')
    expect(again.state.seesawSticker).toBe(first.state.stickerBag.order[2])
    expect(again.state.stickerBag.next).toBe(3)
    expect(again.state.stats.roundsCompleted).toBe(1)
    expect(again.state.stats.busTripsCompleted).toBe(1)
    expect(again.state.stats.seesawRoundsCompleted).toBe(1)
  })

  it('有提示或错答仍发一枚，重复结算不加次数不换图', () => {
    const session = makeSession()
    session.toggleHint()
    session.tapDigit('9')
    session.tapConfirm()
    finishRound(session)
    const id = session.state.stickerId
    expect(id).toBeTruthy()
    expect(session.state.stats.stickerCount).toBe(1)
    session.tapConfirm()
    session.anotherRound()
    expect(session.state.view).toBe('practice')
    expect(session.state.stats.stickerCount).toBe(1)
  })

  it('末题庆祝中刷新只发一次', () => {
    const storage = memoryStorage()
    const timer = mockDelay()
    const session = createAppSession({
      storage,
      rng: mulberry32(204),
      reducedMotion: () => false,
      delay: timer.delay,
      cancelDelay: timer.cancel,
    })
    session.openSeesaw()
    const play = session.state.seesaw!
    play.index = 9
    const problem = play.problems[9]!
    play.right = problem.a
    for (const digit of String(problem.b)) session.seesawTapDigit(digit)
    session.seesawTapConfirm()
    expect(play.motion).toBe('level')
    expect(session.state.stats.seesawRoundsCompleted).toBe(0)
    const restored = createAppSession({
      storage,
      rng: mulberry32(205),
      reducedMotion: () => true,
    })
    expect(restored.state.view).toBe('seesawComplete')
    expect(restored.state.stats.seesawRoundsCompleted).toBe(1)
    expect(restored.state.seesawSticker).toBeTruthy()
    expect(restored.state.stickerBag.next).toBe(1)
    const third = createAppSession({ storage, rng: mulberry32(206), reducedMotion: () => true })
    expect(third.state.stats.seesawRoundsCompleted).toBe(1)
    expect(third.state.seesawSticker).toBe(restored.state.seesawSticker)
    expect(third.state.stickerBag.next).toBe(1)
  })

  it('0.6.8 旧完成档保留 emoji，缺贴纸的坐车完成页不消耗新袋', () => {
    const storage = memoryStorage()
    const seed = makeSession(storage, 207)
    seed.switchPlay('seesaw')
    seed.seesawTapDigit('1')
    seed.switchPlay('bus')
    const disk = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as {
      play: {
        view: string
        practice: { settled: boolean; stickerEmoji: string; input: string; index: number }
        bus: { settled: boolean; accounted: boolean }
        seesaw: { index: number; input: string; right: number; problems: { a: number }[] }
      }
      roundsCompleted: number
      busTripsCompleted: number
    }
    disk.play.view = 'complete'
    disk.play.practice.settled = true
    disk.play.practice.stickerEmoji = '🌸'
    disk.play.practice.input = ''
    disk.play.practice.index = 9
    disk.play.bus.settled = true
    disk.play.bus.accounted = true
    disk.play.seesaw.index = 2
    disk.play.seesaw.input = '1'
    disk.play.seesaw.right = disk.play.seesaw.problems[2]!.a
    disk.roundsCompleted = 4
    disk.busTripsCompleted = 2
    delete (disk as { stickerBag?: unknown }).stickerBag
    storage.setItem(STORAGE_KEY, JSON.stringify(disk))
    const loaded = createAppSession({ storage, rng: mulberry32(208), reducedMotion: () => true })
    expect(loaded.state.view).toBe('complete')
    expect(loaded.state.stickerId).toBe('')
    expect(loaded.state.stickerEmoji).toBe('🌸')
    expect(loaded.state.busSticker).toBe('')
    expect(loaded.state.seesaw?.index).toBe(2)
    expect(loaded.state.seesaw?.input).toBe('1')
    expect(loaded.state.stickerBag.next).toBe(0)
    expect(loaded.state.stickerBag.order).toEqual([])
    expect(loaded.state.stats.roundsCompleted).toBe(4)
    expect(loaded.state.stats.busTripsCompleted).toBe(2)
    loaded.switchPlay('bus')
    expect(loaded.state.view).toBe('busComplete')
    expect(loaded.state.busSticker).toBe('')
    expect(loaded.state.stickerBag.next).toBe(0)
    expect(loaded.state.stats.busTripsCompleted).toBe(2)
  })
})



