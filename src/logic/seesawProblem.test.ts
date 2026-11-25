import { describe, expect, it } from 'vitest'
import { makeRound, mulberry32 } from './makeProblem'
import {
  isLegalCount,
  isSeesawCorrect,
  isZeroChange,
  proposedRight,
  seesawLeft,
  seesawRight,
  seesawUnknown,
} from './seesawProblem'

describe('跷跷板题面映射', () => {
  it('加法左=得数右=a，□是 b', () => {
    const problem = { a: 3, b: 4, op: '+' as const, answer: 7 }
    expect(seesawLeft(problem)).toBe(7)
    expect(seesawRight(problem)).toBe(3)
    expect(seesawUnknown(problem)).toBe(4)
    expect(isSeesawCorrect(problem, '4')).toBe(true)
    expect(isSeesawCorrect(problem, '7')).toBe(false)
    expect(proposedRight(problem, 4)).toBe(7)
  })

  it('减法左=得数右=a，□是 b', () => {
    const problem = { a: 7, b: 4, op: '-' as const, answer: 3 }
    expect(seesawLeft(problem)).toBe(3)
    expect(seesawRight(problem)).toBe(7)
    expect(seesawUnknown(problem)).toBe(4)
    expect(isSeesawCorrect(problem, '4')).toBe(true)
    expect(proposedRight(problem, 4)).toBe(3)
  })

  it('超过 10 或负数不合法，0 变化题仍要提交 0', () => {
    expect(isLegalCount(11)).toBe(false)
    expect(isLegalCount(-1)).toBe(false)
    expect(isLegalCount(0)).toBe(true)
    expect(isLegalCount(10)).toBe(true)
    const keep = { a: 5, b: 0, op: '+' as const, answer: 5 }
    expect(isZeroChange(keep)).toBe(true)
    expect(isSeesawCorrect(keep, '0')).toBe(true)
    expect(isSeesawCorrect(keep, '')).toBe(false)
    const takeNone = { a: 6, b: 0, op: '-' as const, answer: 6 }
    expect(isZeroChange(takeNone)).toBe(true)
    expect(seesawLeft(takeNone)).toBe(seesawRight(takeNone))
  })

  it('makeRound 映射后左右都在 0–10', () => {
    const round = makeRound('mix', 10, mulberry32(8))
    for (const item of round) {
      expect(seesawLeft(item)).toBeGreaterThanOrEqual(0)
      expect(seesawLeft(item)).toBeLessThanOrEqual(10)
      expect(seesawRight(item)).toBeGreaterThanOrEqual(0)
      expect(seesawRight(item)).toBeLessThanOrEqual(10)
    }
  })
})
