import { describe, expect, it } from 'vitest'
import {
  RANGE_MAX,
  ROUND_SIZE,
  allAddProblems,
  allProblems,
  allSubProblems,
  isCorrect,
  isZeroRelated,
  makeRound,
  mulberry32,
  normalizeRange,
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
    expect(adds.some((item) => isZeroRelated(item))).toBe(true)
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
    expect(subs.some((item) => isZeroRelated(item))).toBe(true)
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

describe('含 0 判定', () => {
  it('操作数或答案为 0 都算，包括 0+8、3-0、4-4', () => {
    expect(isZeroRelated({ a: 0, b: 8, op: '+', answer: 8 })).toBe(true)
    expect(isZeroRelated({ a: 3, b: 0, op: '-', answer: 3 })).toBe(true)
    expect(isZeroRelated({ a: 4, b: 4, op: '-', answer: 0 })).toBe(true)
    expect(isZeroRelated({ a: 2, b: 3, op: '+', answer: 5 })).toBe(false)
  })
})

describe('一轮出题', () => {
  it('每轮 10 题且 (a,op,b) 不重复，含 0 题至多 1 道', () => {
    for (const mode of ['add', 'sub', 'mix'] as const) {
      const round = makeRound(mode, ROUND_SIZE, mulberry32(7))
      expect(round).toHaveLength(10)
      const keys = round.map(problemKey)
      expect(new Set(keys).size).toBe(10)
      expect(round.filter(isZeroRelated).length).toBeLessThanOrEqual(1)
    }
  })

  it('混合一轮同时含加法与减法', () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const round = makeRound('mix', ROUND_SIZE, mulberry32(seed))
      expect(round.some((item) => item.op === '+')).toBe(true)
      expect(round.some((item) => item.op === '-')).toBe(true)
    }
  })

  it('大量随机轮次满足约束且不会空转', () => {
    let sawZero = false
    let sawNoZero = false
    for (const mode of ['add', 'sub', 'mix'] as const) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const round = makeRound(mode, ROUND_SIZE, mulberry32(seed * 17 + mode.length))
        expect(round).toHaveLength(ROUND_SIZE)
        expect(new Set(round.map(problemKey)).size).toBe(ROUND_SIZE)
        expect(round.filter(isZeroRelated).length).toBeLessThanOrEqual(1)
        if (mode === 'mix') {
          expect(round.some((item) => item.op === '+')).toBe(true)
          expect(round.some((item) => item.op === '-')).toBe(true)
        }
        for (const item of round) {
          assertInRange(item)
          if (item.op === '+') expect(item.a + item.b).toBe(item.answer)
          else {
            expect(item.a).toBeGreaterThanOrEqual(item.b)
            expect(item.a - item.b).toBe(item.answer)
          }
        }
        const zeros = round.filter(isZeroRelated).length
        if (zeros === 1) sawZero = true
        if (zeros === 0) sawNoZero = true
      }
    }
    expect(sawZero).toBe(true)
    expect(sawNoZero).toBe(true)
  })

  it('同一种子结果稳定', () => {
    const a = makeRound('mix', ROUND_SIZE, mulberry32(99)).map(problemKey)
    const b = makeRound('mix', ROUND_SIZE, mulberry32(99)).map(problemKey)
    expect(a).toEqual(b)
  })
})

describe('输入解析', () => {
  it('空串和非法不解析，三位数字可表示 100', () => {
    expect(parseInput('')).toBeNull()
    expect(parseInput('10')).toBe(10)
    expect(parseInput('01')).toBe(1)
    expect(parseInput('100')).toBe(100)
    expect(parseInput('abc')).toBeNull()
    expect(parseInput('1000')).toBeNull()
  })

  it('判对只认数值相等', () => {
    const problem = { a: 6, b: 4, op: '+' as const, answer: 10 }
    expect(isCorrect(problem, '10')).toBe(true)
    expect(isCorrect(problem, '9')).toBe(false)
    expect(isCorrect(problem, '')).toBe(false)
  })
})

describe('算式范围', () => {
  it('空、0、小数、负、超 999 按规则纠正', () => {
    expect(normalizeRange(undefined)).toBe(10)
    expect(normalizeRange('')).toBe(10)
    expect(normalizeRange(0)).toBe(10)
    expect(normalizeRange(0.4)).toBe(10)
    expect(normalizeRange(-4)).toBe(10)
    expect(normalizeRange('abc')).toBe(10)
    expect(normalizeRange(12.4)).toBe(12)
    expect(normalizeRange('12.6')).toBe(13)
    expect(normalizeRange(2000)).toBe(999)
    expect(normalizeRange(20)).toBe(20)
  })

  it('20 以内加法得数不超过 20，减法被减数不超过 20', () => {
    const adds = allAddProblems(20)
    expect(adds.some((item) => item.answer > 10)).toBe(true)
    for (const item of adds) {
      expect(item.a + item.b).toBeLessThanOrEqual(20)
    }
    const round = makeRound('mix', ROUND_SIZE, mulberry32(21), 20)
    expect(round).toHaveLength(10)
    expect(round.some((item) => item.answer > 10 || item.a > 10)).toBe(true)
    for (const item of round) {
      if (item.op === '+') expect(item.answer).toBeLessThanOrEqual(20)
      else expect(item.a).toBeLessThanOrEqual(20)
    }
    const ten = makeRound('mix', ROUND_SIZE, mulberry32(21))
    for (const item of ten) {
      expect(item.a).toBeLessThanOrEqual(RANGE_MAX)
      expect(item.answer).toBeLessThanOrEqual(RANGE_MAX)
    }
  })
})
