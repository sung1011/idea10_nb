import { DEFAULT_RANGE, normalizeRange, type Mode } from '../logic/makeProblem'
import { parseStickerBag, type StickerId } from '../logic/stickerPool'
import { parsePlay, type PlaySnapshot } from './playSnapshot'

export const STORAGE_KEY = 'idea10Nb.v1'
export const STORAGE_VERSION = 4

export type SaveData = {
  version: typeof STORAGE_VERSION
  mode: Mode
  rangeMax: number
  roundsCompleted: number
  firstTryCorrect: number
  hintUsed: number
  stickerCount: number
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
  stickerBag: StickerId[]
  stickerBagNext: number
  play: PlaySnapshot | null
}

export const DEFAULT_SAVE: SaveData = {
  version: STORAGE_VERSION,
  mode: 'mix',
  rangeMax: DEFAULT_RANGE,
  roundsCompleted: 0,
  firstTryCorrect: 0,
  hintUsed: 0,
  stickerCount: 0,
  busTripsCompleted: 0,
  busSoloCompleted: 0,
  busAdjustCount: 0,
  busHintCount: 0,
  seesawRoundsCompleted: 0,
  seesawFirstTryCorrect: 0,
  seesawHintCount: 0,
  bowlRoundsCompleted: 0,
  bowlFirstTryCorrect: 0,
  bowlHintCount: 0,
  stickerBag: [],
  stickerBagNext: 0,
  play: null,
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

function parseStats(rec: Record<string, unknown>): Omit<SaveData, 'play' | 'version'> | null {
  if (!isMode(rec.mode)) return null
  const roundsCompleted = nonNegInt(rec.roundsCompleted)
  const firstTryCorrect = nonNegInt(rec.firstTryCorrect)
  const hintUsed = nonNegInt(rec.hintUsed)
  const stickerCount = nonNegInt(rec.stickerCount)
  if (roundsCompleted == null || firstTryCorrect == null || hintUsed == null || stickerCount == null) {
    return null
  }
  const busTripsCompleted = rec.busTripsCompleted == null ? 0 : nonNegInt(rec.busTripsCompleted)
  const busSoloCompleted = rec.busSoloCompleted == null ? 0 : nonNegInt(rec.busSoloCompleted)
  const busAdjustCount = rec.busAdjustCount == null ? 0 : nonNegInt(rec.busAdjustCount)
  const busHintCount = rec.busHintCount == null ? 0 : nonNegInt(rec.busHintCount)
  const seesawRoundsCompleted = rec.seesawRoundsCompleted == null ? 0 : nonNegInt(rec.seesawRoundsCompleted)
  const seesawFirstTryCorrect = rec.seesawFirstTryCorrect == null ? 0 : nonNegInt(rec.seesawFirstTryCorrect)
  const seesawHintCount = rec.seesawHintCount == null ? 0 : nonNegInt(rec.seesawHintCount)
  const bowlRoundsCompleted = rec.bowlRoundsCompleted == null ? 0 : nonNegInt(rec.bowlRoundsCompleted)
  const bowlFirstTryCorrect = rec.bowlFirstTryCorrect == null ? 0 : nonNegInt(rec.bowlFirstTryCorrect)
  const bowlHintCount = rec.bowlHintCount == null ? 0 : nonNegInt(rec.bowlHintCount)
  const bag = parseStickerBag(rec.stickerBag, rec.stickerBagNext)
  if (
    busTripsCompleted == null ||
    busSoloCompleted == null ||
    busAdjustCount == null ||
    busHintCount == null ||
    seesawRoundsCompleted == null ||
    seesawFirstTryCorrect == null ||
    seesawHintCount == null ||
    bowlRoundsCompleted == null ||
    bowlFirstTryCorrect == null ||
    bowlHintCount == null
  ) {
    return null
  }
  return {
    mode: rec.mode,
    rangeMax: rec.rangeMax == null ? DEFAULT_RANGE : normalizeRange(rec.rangeMax),
    roundsCompleted,
    firstTryCorrect,
    hintUsed,
    stickerCount,
    busTripsCompleted,
    busSoloCompleted,
    busAdjustCount,
    busHintCount,
    seesawRoundsCompleted,
    seesawFirstTryCorrect,
    seesawHintCount,
    bowlRoundsCompleted,
    bowlFirstTryCorrect,
    bowlHintCount,
    stickerBag: bag.order,
    stickerBagNext: bag.next,
  }
}

export function parseSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (rec.version !== 1 && rec.version !== 2 && rec.version !== 3 && rec.version !== 4) return null
  if (typeof rec.version === 'number' && rec.version > STORAGE_VERSION) return null
  const stats = parseStats(rec)
  if (!stats) return null
  if (rec.version === 1) {
    return { ...stats, version: STORAGE_VERSION, play: null }
  }
  let play: PlaySnapshot | null = null
  if (rec.play != null) {
    play = parsePlay(rec.play, stats.mode)
  }
  return { ...stats, version: STORAGE_VERSION, play }
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
