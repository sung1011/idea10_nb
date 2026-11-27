import { describe, expect, it } from 'vitest'
import { bowlHiddenCount, bowlTotal, bowlVisibleCount, isBowlCorrect, isZeroChange } from './bowlProblem'

describe('盖碗摆盘', () => {
  it('加法 3+□=8：明盘 3，总数 8，碗里 5', () => {
    const problem = { a: 3, b: 5, op: '+' as const, answer: 8 }
    expect(bowlVisibleCount(problem)).toBe(3)
    expect(bowlTotal(problem)).toBe(8)
    expect(bowlHiddenCount(problem)).toBe(5)
    expect(isBowlCorrect(problem, '5')).toBe(true)
    expect(isBowlCorrect(problem, '8')).toBe(false)
    expect(isBowlCorrect(problem, '3')).toBe(false)
  })

  it('减法 8−□=3：明盘 3，总数 8，碗里 5', () => {
    const problem = { a: 8, b: 5, op: '-' as const, answer: 3 }
    expect(bowlVisibleCount(problem)).toBe(3)
    expect(bowlTotal(problem)).toBe(8)
    expect(bowlHiddenCount(problem)).toBe(5)
    expect(isBowlCorrect(problem, '5')).toBe(true)
    expect(isBowlCorrect(problem, '3')).toBe(false)
  })

  it('0 变化题碗里是 0，开题不自动过关', () => {
    const add = { a: 5, b: 0, op: '+' as const, answer: 5 }
    expect(bowlVisibleCount(add)).toBe(5)
    expect(bowlTotal(add)).toBe(5)
    expect(bowlHiddenCount(add)).toBe(0)
    expect(isZeroChange(add)).toBe(true)
    expect(isBowlCorrect(add, '')).toBe(false)
    expect(isBowlCorrect(add, '0')).toBe(true)
    const sub = { a: 4, b: 0, op: '-' as const, answer: 4 }
    expect(bowlVisibleCount(sub)).toBe(4)
    expect(bowlTotal(sub)).toBe(4)
    expect(bowlHiddenCount(sub)).toBe(0)
  })
})
