export const RANGE_MAX = 10
export const DEFAULT_RANGE = 10
export const RANGE_LIMIT = 999
export const ROUND_SIZE = 10

/** 空、0、非正数回 10；小数取最近正整数；超过 999 按 999。 */
export function normalizeRange(raw: unknown): number {
  if (raw === '' || raw == null) return DEFAULT_RANGE
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RANGE
  const rounded = Math.round(n)
  if (rounded <= 0) return DEFAULT_RANGE
  return Math.min(RANGE_LIMIT, rounded)
}

export type Mode = 'add' | 'sub' | 'mix'
export type Op = '+' | '-'

export type Problem = {
  a: number
  b: number
  op: Op
  answer: number
}

export function problemKey(problem: Problem): string {
  return `${problem.a}${problem.op}${problem.b}`
}

/** 任一操作数为 0 或答案为 0，如 0+8、3-0、4-4。 */
export function isZeroRelated(problem: Problem): boolean {
  return problem.a === 0 || problem.b === 0 || problem.answer === 0
}

export function allAddProblems(range = RANGE_MAX): Problem[] {
  const max = normalizeRange(range)
  const out: Problem[] = []
  for (let a = 0; a <= max; a += 1) {
    for (let b = 0; b <= max; b += 1) {
      const answer = a + b
      if (answer <= max) {
        out.push({ a, b, op: '+', answer })
      }
    }
  }
  return out
}

export function allSubProblems(range = RANGE_MAX): Problem[] {
  const max = normalizeRange(range)
  const out: Problem[] = []
  for (let a = 0; a <= max; a += 1) {
    for (let b = 0; b <= max; b += 1) {
      if (a >= b) {
        out.push({ a, b, op: '-', answer: a - b })
      }
    }
  }
  return out
}

export function allProblems(mode: Mode, range = RANGE_MAX): Problem[] {
  if (mode === 'add') return allAddProblems(range)
  if (mode === 'sub') return allSubProblems(range)
  return [...allAddProblems(range), ...allSubProblems(range)]
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const current = out[i]!
    out[i] = out[j]!
    out[j] = current
  }
  return out
}

export function sampleUnique<T>(pool: readonly T[], count: number, rng: () => number): T[] {
  if (count > pool.length) {
    throw new Error(`题库不足：需要 ${count} 题，只有 ${pool.length} 题`)
  }
  return shuffle(pool, rng).slice(0, count)
}

function pickOnePreferNormal(pool: readonly Problem[], rng: () => number): Problem {
  const normals = pool.filter((item) => !isZeroRelated(item))
  const source = normals.length > 0 ? normals : pool
  return sampleUnique(source, 1, rng)[0]!
}

/** 单次遍历抽样，含 0 题最多 1 道，不因过滤空转。 */
export function sampleWithZeroCap(
  pool: readonly Problem[],
  count: number,
  rng: () => number,
  alreadyZero = false,
): Problem[] {
  const shuffled = shuffle(pool, rng)
  const out: Problem[] = []
  let zeros = alreadyZero ? 1 : 0
  for (const item of shuffled) {
    if (out.length >= count) break
    if (isZeroRelated(item)) {
      if (zeros >= 1) continue
      zeros += 1
    }
    out.push(item)
  }
  if (out.length < count) {
    for (const item of shuffled) {
      if (out.length >= count) break
      if (out.some((picked) => problemKey(picked) === problemKey(item))) continue
      if (isZeroRelated(item) && zeros >= 1) continue
      if (isZeroRelated(item)) zeros += 1
      out.push(item)
    }
  }
  if (out.length < count && shuffled.length > 0) {
    let cursor = 0
    while (out.length < count && cursor < shuffled.length * count) {
      const item = shuffled[cursor % shuffled.length]!
      cursor += 1
      if (isZeroRelated(item) && zeros >= 1 && shuffled.some((entry) => !isZeroRelated(entry))) continue
      if (isZeroRelated(item) && zeros < 1) zeros += 1
      out.push(item)
    }
  }
  if (out.length < count) {
    throw new Error(`题库不足：需要 ${count} 题，只抽到 ${out.length} 题`)
  }
  return out
}

export function makeRound(
  mode: Mode,
  count = ROUND_SIZE,
  rng: () => number = Math.random,
  range = RANGE_MAX,
): Problem[] {
  const max = normalizeRange(range)
  if (mode === 'add' || mode === 'sub') {
    return sampleWithZeroCap(allProblems(mode, max), count, rng)
  }

  const adds = allAddProblems(max)
  const subs = allSubProblems(max)
  const addPick = pickOnePreferNormal(adds, rng)
  const usedZero = isZeroRelated(addPick)
  const subSource = usedZero ? subs.filter((item) => !isZeroRelated(item)) : subs
  const subPick = pickOnePreferNormal(subSource.length > 0 ? subSource : subs, rng)
  const restPool = [...adds, ...subs].filter(
    (item) => problemKey(item) !== problemKey(addPick) && problemKey(item) !== problemKey(subPick),
  )
  const rest = sampleWithZeroCap(restPool, count - 2, rng, usedZero || isZeroRelated(subPick))
  return shuffle([addPick, subPick, ...rest], rng)
}

export function parseInput(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null
  return Number(raw)
}

export function practiceInputMaxLen(range = RANGE_MAX): number {
  return String(normalizeRange(range)).length
}

export function isCorrect(problem: Problem, raw: string): boolean {
  const value = parseInput(raw)
  return value !== null && value === problem.answer
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
