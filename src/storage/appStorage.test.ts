import { describe, expect, it } from 'vitest'
import { createBusPlay } from '../logic/busMove'
import { makeBusTrip } from '../logic/busRoute'
import { makeRound, mulberry32 } from '../logic/makeProblem'
import {
  DEFAULT_SAVE,
  STORAGE_KEY,
  loadSave,
  memoryStorage,
  parseSave,
  resetSave,
  writeSave,
} from './appStorage'
import { emptyPractice, livePractice } from './playSnapshot'

function v1Stats() {
  return {
    version: 1 as const,
    mode: 'mix' as const,
    roundsCompleted: 12,
    firstTryCorrect: 48,
    hintUsed: 3,
    stickerCount: 12,
  }
}

describe('parseSave', () => {
  it('合法 v2 存档可读', () => {
    expect(
      parseSave({
        version: 2,
        mode: 'add',
        roundsCompleted: 2,
        firstTryCorrect: 8,
        hintUsed: 1,
        stickerCount: 2,
        busTripsCompleted: 1,
        busSoloCompleted: 1,
        busAdjustCount: 2,
        busHintCount: 3,
        play: null,
      }),
    ).toEqual({
      version: 2,
      mode: 'add',
      roundsCompleted: 2,
      firstTryCorrect: 8,
      hintUsed: 1,
      stickerCount: 2,
      busTripsCompleted: 1,
      busSoloCompleted: 1,
      busAdjustCount: 2,
      busHintCount: 3,
      play: null,
    })
  })

  it('旧 v1 统计仍可读并升为 v2，对局为空', () => {
    expect(parseSave(v1Stats())).toEqual({
      version: 2,
      mode: 'mix',
      roundsCompleted: 12,
      firstTryCorrect: 48,
      hintUsed: 3,
      stickerCount: 12,
      busTripsCompleted: 0,
      busSoloCompleted: 0,
      busAdjustCount: 0,
      busHintCount: 0,
      play: null,
    })
  })

  it('坐车字段非法则整份不可用，不部分写入', () => {
    expect(
      parseSave({
        ...DEFAULT_SAVE,
        busAdjustCount: -2,
      }),
    ).toBeNull()
  })

  it('损坏或更高版本返回 null', () => {
    expect(parseSave('{')).toBeNull()
    expect(parseSave({ version: 2, mode: 'mix' })).toBeNull()
    expect(parseSave({ ...DEFAULT_SAVE, version: 3 })).toBeNull()
    expect(parseSave({ ...DEFAULT_SAVE, mode: 'times' })).toBeNull()
    expect(parseSave({ ...DEFAULT_SAVE, roundsCompleted: -1 })).toBeNull()
  })

  it('会话坏统计好则丢掉会话保留统计', () => {
    const parsed = parseSave({
      ...DEFAULT_SAVE,
      roundsCompleted: 4,
      play: { view: 'bus', practice: { mode: 'mix' }, bus: { broken: true } },
    })
    expect(parsed?.roundsCompleted).toBe(4)
    expect(parsed?.play).toBeNull()
  })

  it('完整对局 JSON roundtrip 后仍可解析', () => {
    const problems = makeRound('mix', 10, mulberry32(9))
    const bus = createBusPlay(makeBusTrip(mulberry32(10)))
    const play = {
      view: 'bus' as const,
      practice: livePractice({
        ...emptyPractice('mix', problems),
        input: '3',
        index: 2,
      }),
      bus,
    }
    const raw = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SAVE,
        play,
      }),
    )
    const parsed = parseSave(raw)
    expect(parsed?.play?.view).toBe('bus')
    expect(parsed?.play?.practice.input).toBe('3')
    expect(parsed?.play?.practice.index).toBe(2)
    expect(parsed?.play?.bus?.trip.stations).toHaveLength(10)
    expect(parsed?.play?.bus?.seats).toHaveLength(10)
  })
})

describe('load / write / reset', () => {
  it('空键用默认且可写', () => {
    const storage = memoryStorage()
    const loaded = loadSave(storage)
    expect(loaded.data).toEqual(DEFAULT_SAVE)
    expect(loaded.writable).toBe(true)
    expect(loaded.message).toBe('')
  })

  it('损坏存档不覆盖原值', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{bad' })
    const loaded = loadSave(storage)
    expect(loaded.writable).toBe(false)
    expect(loaded.data).toEqual(DEFAULT_SAVE)
    expect(loaded.message).toContain('损坏')
    expect(storage.getItem(STORAGE_KEY)).toBe('{bad')
  })

  it('更高版本不覆盖', () => {
    const raw = JSON.stringify({ ...DEFAULT_SAVE, version: 3, roundsCompleted: 9 })
    const storage = memoryStorage({ [STORAGE_KEY]: raw })
    const loaded = loadSave(storage)
    expect(loaded.writable).toBe(false)
    expect(loaded.data.roundsCompleted).toBe(0)
    expect(storage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('读取失败不写回', () => {
    const storage = {
      getItem(): string | null {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      },
    }
    const loaded = loadSave(storage)
    expect(loaded.writable).toBe(false)
    expect(loaded.message).toContain('无法读取')
  })

  it('写入失败不假报成功', () => {
    const storage = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('quota')
      },
      removeItem() {},
    }
    const result = writeSave(storage, DEFAULT_SAVE)
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.message).toContain('写入失败')
    }
  })

  it('重置只删本应用键', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ ...DEFAULT_SAVE, roundsCompleted: 4 }),
      otherApp: 'keep-me',
    })
    expect(resetSave(storage).ok).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem('otherApp')).toBe('keep-me')
  })
})
