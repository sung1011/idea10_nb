import { describe, expect, it } from 'vitest'
import {
  RANGE_MAX,
  ROUND_SIZE,
  allAddProblems,
  allProblems,
  allSubProblems,
  isCorrect,
  makeRound,
  mulberry32,
  parseInput,
  problemKey,
} from './makeProblem'

function assertInRange(problem: ReturnType<typeof allAddProblems>[number]) {
  expect(problem.a).toBeGreaterThanOrEqual(0)
  expect(problem.b).toBeGreaterThanOrEqual(0)
  expect(problem.answer).toBeGreaterThanOrEqual(0)
  expect(problem.a).toBeLessThanOrEqual(RANGE_MAX)
  expect(problem.b).toBeLessThanOrEqual(RANGE_MAX)
  expect(problem.answer).toBeLessThanOrEqual(RANGE_MAX)
}

describe('出题池', () => {
  it('加法 66 题，和不超过 10，含 0', () => {
    const adds = allAddProblems()
    expect(adds).toHaveLength(66)
    expect(adds.some((item) => item.a === 0 || item.b === 0 || item.answer === 0)).toBe(true)
    for (const item of adds) {
      assertInRange(item)
      expect(item.op).toBe('+')
      expect(item.a + item.b).toBe(item.answer)
      expect(item.a + item.b).toBeLessThanOrEqual(RANGE_MAX)
    }
  })

  it('减法 66 题，结果非负，含 0', () => {
    const subs = allSubProblems()
    expect(subs).toHaveLength(66)
    expect(subs.some((item) => item.a === 0 || item.b === 0 || item.answer === 0)).toBe(true)
    for (const item of subs) {
      assertInRange(item)
      expect(item.op).toBe('-')
      expect(item.a).toBeGreaterThanOrEqual(item.b)
      expect(item.a - item.b).toBe(item.answer)
    }
  })

  it('混合池 132 题且加减都在', () => {
    const mixed = allProblems('mix')
    expect(mixed).toHaveLength(132)
    expect(mixed.some((item) => item.op === '+')).toBe(true)
    expect(mixed.some((item) => item.op === '-')).toBe(true)
  })
})

describe('一轮出题', () => {
  it('每轮 5 题且 (a,op,b) 不重复', () => {
    for (const mode of ['add', 'sub', 'mix'] as const) {
      const round = makeRound(mode, ROUND_SIZE, mulberry32(7))
      expect(round).toHaveLength(5)
      const keys = round.map(problemKey)
      expect(new Set(keys).size).toBe(5)
    }
  })

  it('混合一轮同时含加法与减法', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const round = makeRound('mix', ROUND_SIZE, mulberry32(seed))
      expect(round.some((item) => item.op === '+')).toBe(true)
      expect(round.some((item) => item.op === '-')).toBe(true)
    }
  })

  it('同一种子结果稳定', () => {
    const a = makeRound('mix', ROUND_SIZE, mulberry32(99)).map(problemKey)
    const b = makeRound('mix', ROUND_SIZE, mulberry32(99)).map(problemKey)
    expect(a).toEqual(b)
  })
})

describe('输入解析', () => {
  it('空串和非法不解析，两位数字可表示 10', () => {
    expect(parseInput('')).toBeNull()
    expect(parseInput('10')).toBe(10)
    expect(parseInput('01')).toBe(1)
    expect(parseInput('abc')).toBeNull()
  })

  it('判对只认数值相等', () => {
    const problem = { a: 6, b: 4, op: '+' as const, answer: 10 }
    expect(isCorrect(problem, '10')).toBe(true)
    expect(isCorrect(problem, '9')).toBe(false)
    expect(isCorrect(problem, '')).toBe(false)
  })
})
