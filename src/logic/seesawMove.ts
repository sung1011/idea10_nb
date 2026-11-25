import { ROUND_SIZE, type Problem } from './makeProblem'
import {
  isLegalCount,
  isSeesawCorrect,
  parseSeesawInput,
  proposedCount,
  seesawRight,
  seesawTarget,
} from './seesawProblem'

export type SeesawMotion = 'idle' | 'apply' | 'hold' | 'restore' | 'level' | 'cheer'

export const SEESAW_LEVEL_MS = 420
export const SEESAW_CELEBRATE_MS = 1000
export const SEESAW_HOLD_MS = 800
export const TILT_PER = 7
export const TILT_MAX = 28

export type SeesawPlay = {
  problems: Problem[]
  index: number
  input: string
  /** 左盘当前个数。存档键仍为 right，idle 原点是 a。 */
  right: number
  motion: SeesawMotion
  outcome: '' | 'correct' | 'wrong'
  moving: boolean
  settled: boolean
  accounted: boolean
  locked: boolean
  wrongOnce: boolean[]
  hintOnce: boolean[]
  firstTryThisRound: number
  hintThisRound: number
}

export type SeesawConfirmResult = 'empty' | 'locked' | 'correct' | 'wrong'

export function tiltDeg(left: number, right: number): number {
  const raw = (right - left) * TILT_PER
  return Math.max(-TILT_MAX, Math.min(TILT_MAX, raw))
}

export function currentProblem(play: SeesawPlay): Problem {
  const problem = play.problems[play.index]
  if (!problem) throw new Error('没有当前题')
  return problem
}

export function currentLeft(play: SeesawPlay): number {
  return play.right
}

export function currentTarget(play: SeesawPlay): number {
  return seesawTarget(currentProblem(play))
}

export function originRight(play: SeesawPlay): number {
  return seesawRight(currentProblem(play))
}

export function createSeesawPlay(problems: Problem[]): SeesawPlay {
  if (problems.length !== ROUND_SIZE) throw new Error('跷跷板必须 10 题')
  const first = problems[0]
  if (!first) throw new Error('没有题目')
  return {
    problems,
    index: 0,
    input: '',
    right: seesawRight(first),
    motion: 'idle',
    outcome: '',
    moving: false,
    settled: false,
    accounted: false,
    locked: false,
    wrongOnce: Array.from({ length: ROUND_SIZE }, () => false),
    hintOnce: Array.from({ length: ROUND_SIZE }, () => false),
    firstTryThisRound: 0,
    hintThisRound: 0,
  }
}

export function restoreSeesaw(play: SeesawPlay) {
  play.right = originRight(play)
  play.motion = 'idle'
  play.outcome = ''
  play.moving = false
  play.locked = false
  play.input = ''
}

export function beginSeesawCheer(play: SeesawPlay) {
  if (play.outcome !== 'correct') return
  play.motion = 'cheer'
  play.moving = true
  play.locked = true
}

export function arriveSeesawNext(play: SeesawPlay): 'next' | 'done' {
  if (play.index >= play.problems.length - 1) {
    play.moving = false
    play.motion = 'idle'
    play.outcome = ''
    play.settled = true
    play.locked = true
    play.input = ''
    return 'done'
  }
  play.index += 1
  const next = play.problems[play.index]
  play.right = next ? seesawRight(next) : 0
  play.motion = 'idle'
  play.outcome = ''
  play.moving = false
  play.locked = false
  play.input = ''
  return 'next'
}

export function tapSeesawDigit(play: SeesawPlay, digit: string): boolean {
  if (play.moving || play.settled || play.locked) return false
  if (!/^\d$/.test(digit)) return false
  if (play.input.length >= 2) return false
  play.input += digit
  return true
}

export function tapSeesawDelete(play: SeesawPlay): boolean {
  if (play.moving || play.settled || play.locked) return false
  if (play.input === '') return false
  play.input = play.input.slice(0, -1)
  return true
}

export function confirmSeesaw(play: SeesawPlay): SeesawConfirmResult {
  if (play.moving || play.settled || play.locked) return 'locked'
  if (play.input === '') return 'empty'
  const problem = currentProblem(play)
  const value = parseSeesawInput(play.input)
  if (value == null) return 'empty'
  const nextRight = proposedCount(problem, value)
  const legal = isLegalCount(nextRight)
  const correct = isSeesawCorrect(problem, play.input)

  play.input = ''
  play.locked = true
  play.moving = true

  if (!correct || !legal) {
    play.wrongOnce[play.index] = true
    play.outcome = 'wrong'
    if (legal) {
      play.right = nextRight
      play.motion = 'hold'
    } else {
      play.right = originRight(play)
      play.motion = 'hold'
    }
    return 'wrong'
  }

  if (!play.wrongOnce[play.index]) {
    play.firstTryThisRound += 1
  }
  play.right = nextRight
  play.outcome = 'correct'
  play.motion = 'level'
  return 'correct'
}

export function tapSeesawHelp(play: SeesawPlay): boolean {
  if (play.moving || play.settled) return false
  if (!play.hintOnce[play.index]) {
    play.hintOnce[play.index] = true
    play.hintThisRound += 1
  }
  return true
}

export function seesawForDisk(play: SeesawPlay): SeesawPlay {
  const copy = JSON.parse(JSON.stringify(play)) as SeesawPlay
  if (copy.settled) {
    copy.moving = false
    copy.motion = 'idle'
    copy.outcome = ''
    copy.locked = true
    copy.input = ''
    return copy
  }
  if (copy.outcome === 'correct' || copy.motion === 'level' || copy.motion === 'cheer') {
    arriveSeesawNext(copy)
    return copy
  }
  if (copy.outcome === 'wrong' || copy.motion === 'hold' || copy.motion === 'restore' || copy.motion === 'apply') {
    restoreSeesaw(copy)
    return copy
  }
  copy.moving = false
  copy.motion = 'idle'
  copy.outcome = ''
  copy.locked = false
  copy.right = originRight(copy)
  return copy
}

export function hasSeesawProgress(play: SeesawPlay | null | undefined): boolean {
  if (!play || play.settled) return false
  return (
    play.index > 0 ||
    play.input !== '' ||
    play.hintThisRound > 0 ||
    play.moving ||
    play.motion !== 'idle' ||
    play.wrongOnce.some(Boolean)
  )
}
