import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SAVE,
  STORAGE_KEY,
  loadSave,
  memoryStorage,
  parseSave,
  resetSave,
  writeSave,
} from './appStorage'

describe('parseSave', () => {
  it('合法存档可读', () => {
    expect(
      parseSave({
        version: 1,
        mode: 'add',
        roundsCompleted: 2,
        firstTryCorrect: 8,
        hintUsed: 1,
        stickerCount: 2,
      }),
    ).toEqual({
      version: 1,
      mode: 'add',
      roundsCompleted: 2,
      firstTryCorrect: 8,
      hintUsed: 1,
      stickerCount: 2,
    })
  })

  it('损坏或版本不对返回 null', () => {
    expect(parseSave('{')).toBeNull()
    expect(parseSave({ version: 2, mode: 'mix' })).toBeNull()
    expect(parseSave({ ...DEFAULT_SAVE, mode: 'times' })).toBeNull()
    expect(parseSave({ ...DEFAULT_SAVE, roundsCompleted: -1 })).toBeNull()
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
