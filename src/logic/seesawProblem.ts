import { RANGE_MAX, parseInput, type Problem } from './makeProblem'

/** 左盘开题个数；存档 play.right 的 idle 原点。必须保持为 a，勿改成 answer。 */
export function seesawOrigin(problem: Problem): number {
  return problem.a
}

/** 右盘固定目标。 */
export function seesawTarget(problem: Problem): number {
  return problem.answer
}

/** 存档校验别名：play.right origin = a。 */
export function seesawRight(problem: Problem): number {
  return seesawOrigin(problem)
}

export function seesawUnknown(problem: Problem): number {
  return problem.b
}

/** 确认后左盘应变到的个数。存档字段仍叫 play.right。 */
export function proposedCount(problem: Problem, value: number): number {
  return problem.op === '+' ? problem.a + value : problem.a - value
}

export function proposedRight(problem: Problem, value: number): number {
  return proposedCount(problem, value)
}

export function isLegalCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= RANGE_MAX
}

export function parseSeesawInput(raw: string): number | null {
  return parseInput(raw)
}

export function isSeesawCorrect(problem: Problem, raw: string): boolean {
  const value = parseSeesawInput(raw)
  return value !== null && value === problem.b
}

export function isZeroChange(problem: Problem): boolean {
  return problem.b === 0
}
