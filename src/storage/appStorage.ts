import type { Mode } from '../logic/makeProblem'

export const STORAGE_KEY = 'idea10Nb.v1'
export const STORAGE_VERSION = 1

export type SaveData = {
  version: typeof STORAGE_VERSION
  mode: Mode
  roundsCompleted: number
  firstTryCorrect: number
  hintUsed: number
  stickerCount: number
}

export const DEFAULT_SAVE: SaveData = {
  version: STORAGE_VERSION,
  mode: 'mix',
  roundsCompleted: 0,
  firstTryCorrect: 0,
  hintUsed: 0,
  stickerCount: 0,
}

export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadResult = {
  data: SaveData
  writable: boolean
  message: string
  raw: string | null
}

function isMode(value: unknown): value is Mode {
  return value === 'add' || value === 'sub' || value === 'mix'
}

function nonNegInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1_000_000_000) {
    return null
  }
  return value
}

export function parseSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (rec.version !== STORAGE_VERSION) return null
  if (!isMode(rec.mode)) return null
  const roundsCompleted = nonNegInt(rec.roundsCompleted)
  const firstTryCorrect = nonNegInt(rec.firstTryCorrect)
  const hintUsed = nonNegInt(rec.hintUsed)
  const stickerCount = nonNegInt(rec.stickerCount)
  if (roundsCompleted == null || firstTryCorrect == null || hintUsed == null || stickerCount == null) {
    return null
  }
  return {
    version: STORAGE_VERSION,
    mode: rec.mode,
    roundsCompleted,
    firstTryCorrect,
    hintUsed,
    stickerCount,
  }
}

export function loadSave(storage: StorageLike): LoadResult {
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      data: { ...DEFAULT_SAVE },
      writable: false,
      message: '存档无法读取，已保护原始记录。本次先用默认设置，不覆盖。',
      raw: null,
    }
  }

  if (raw == null || raw === '') {
    return { data: { ...DEFAULT_SAVE }, writable: true, message: '', raw }
  }

  try {
    const parsed = parseSave(JSON.parse(raw) as unknown)
    if (!parsed) {
      return {
        data: { ...DEFAULT_SAVE },
        writable: false,
        message: '存档损坏，已保护原始记录。本次先用默认设置，不覆盖。',
        raw,
      }
    }
    return { data: parsed, writable: true, message: '', raw }
  } catch {
    return {
      data: { ...DEFAULT_SAVE },
      writable: false,
      message: '存档损坏，已保护原始记录。本次先用默认设置，不覆盖。',
      raw,
    }
  }
}

export function writeSave(storage: StorageLike, data: SaveData): { ok: true } | { ok: false; message: string } {
  const encoded = JSON.stringify(data)
  try {
    storage.setItem(STORAGE_KEY, encoded)
    const check = storage.getItem(STORAGE_KEY)
    if (check !== encoded) {
      return { ok: false, message: '写入失败，未保存。' }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: '写入失败，未保存。' }
  }
}

export function resetSave(storage: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    storage.removeItem(STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, message: '重置失败，未改动存档。' }
  }
}

export function memoryStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(init))
  return {
    getItem(key) {
      return map.has(key) ? (map.get(key) ?? null) : null
    },
    setItem(key, value) {
      map.set(key, value)
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

export function browserStorage(): StorageLike {
  return localStorage
}
