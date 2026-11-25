import { RANGE_MAX, parseInput, type Problem } from './makeProblem'

export function seesawLeft(problem: Problem): number {
  return problem.answer
}

export function seesawRight(problem: Problem): number {
  return problem.a
}

export function seesawUnknown(problem: Problem): number {
  return problem.b
}

export function proposedRight(problem: Problem, value: number): number {
  return problem.op === '+' ? problem.a + value : problem.a - value
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
