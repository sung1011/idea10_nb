import { parseInput, type Problem } from './makeProblem'

/** 明盘可见豆子：加法是 a，减法是得数。 */
export function bowlVisibleCount(problem: Problem): number {
  return problem.op === '+' ? problem.a : problem.answer
}

/** 大数字总数：加法是得数，减法是被减数 a。 */
export function bowlTotal(problem: Problem): number {
  return problem.op === '+' ? problem.answer : problem.a
}

/** 碗里盖着的数量，永远是 b。 */
export function bowlHiddenCount(problem: Problem): number {
  return problem.b
}

export function parseBowlInput(raw: string): number | null {
  return parseInput(raw)
}

export function isBowlCorrect(problem: Problem, raw: string): boolean {
  const value = parseBowlInput(raw)
  return value !== null && value === problem.b
}

export function isZeroChange(problem: Problem): boolean {
  return problem.b === 0
}
