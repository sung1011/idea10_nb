import { describe, expect, it } from 'vitest'
import { ACKED_VERSION_KEY } from '../logic/appVersion'
import { mulberry32, problemKey } from '../logic/makeProblem'
import { DEFAULT_SAVE, STORAGE_KEY, memoryStorage } from '../storage/appStorage'
import { createAppSession, hasRoundProgress } from './appSession'

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
