import { describe, expect, it } from 'vitest'
import { makeRound, mulberry32 } from './makeProblem'
import {
  isLegalCount,
  isSeesawCorrect,
  isZeroChange,
  proposedCount,
  seesawOrigin,
  seesawRight,
  seesawTarget,
  seesawUnknown,
} from './seesawProblem'
import { tiltDeg } from './seesawMove'

describe('跷跷板题面映射', () => {
  it('加法 3+□=8：开题左 3 右 8，确认后左盘加到目标', () => {
    const problem = { a: 3, b: 5, op: '+' as const, answer: 8 }
    expect(seesawOrigin(problem)).toBe(3)
    expect(seesawRight(problem)).toBe(3)
    expect(seesawTarget(problem)).toBe(8)
    expect(seesawUnknown(problem)).toBe(5)
    expect(proposedCount(problem, 5)).toBe(8)
    expect(tiltDeg(seesawOrigin(problem), seesawTarget(problem))).toBeGreaterThan(0)
    expect(isSeesawCorrect(problem, '5')).toBe(true)
    expect(isSeesawCorrect(problem, '8')).toBe(false)
  })

  it('减法 8−□=3：开题左 8 右 3，确认后左盘减到目标', () => {
    const problem = { a: 8, b: 5, op: '-' as const, answer: 3 }
    expect(seesawOrigin(problem)).toBe(8)
    expect(seesawRight(problem)).toBe(8)
    expect(seesawTarget(problem)).toBe(3)
    expect(seesawUnknown(problem)).toBe(5)
    expect(proposedCount(problem, 5)).toBe(3)
    expect(tiltDeg(seesawOrigin(problem), seesawTarget(problem))).toBeLessThan(0)
    expect(isSeesawCorrect(problem, '5')).toBe(true)
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
    expect(proposedCount(keep, 0)).toBe(5)
    const takeNone = { a: 6, b: 0, op: '-' as const, answer: 6 }
    expect(isZeroChange(takeNone)).toBe(true)
    expect(seesawOrigin(takeNone)).toBe(seesawTarget(takeNone))
  })

  it('makeRound 映射后原点与目标都在 0–10', () => {
    const round = makeRound('mix', 10, mulberry32(8))
    for (const item of round) {
      expect(seesawOrigin(item)).toBeGreaterThanOrEqual(0)
      expect(seesawOrigin(item)).toBeLessThanOrEqual(10)
      expect(seesawTarget(item)).toBeGreaterThanOrEqual(0)
      expect(seesawTarget(item)).toBeLessThanOrEqual(10)
      expect(seesawRight(item)).toBe(item.a)
    }
  })
})
