import { ROUND_SIZE, type Problem } from './makeProblem'
import { isBowlCorrect, parseBowlInput } from './bowlProblem'

export type BowlMotion = 'idle' | 'cheer' | 'shake'

export const BOWL_CELEBRATE_MS = 1000
export const BOWL_SHAKE_MS = 800

export type BowlPlay = {
  problems: Problem[]
  index: number
  input: string
  motion: BowlMotion
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

export type BowlConfirmResult = 'empty' | 'locked' | 'correct' | 'wrong'

export function currentBowlProblem(play: BowlPlay): Problem {
  const problem = play.problems[play.index]
  if (!problem) throw new Error('没有当前题')
  return problem
}

export function createBowlPlay(problems: Problem[]): BowlPlay {
  if (problems.length !== ROUND_SIZE) throw new Error('盖碗必须 10 题')
  if (!problems[0]) throw new Error('没有题目')
  return {
    problems,
    index: 0,
    input: '',
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

export function restoreBowl(play: BowlPlay) {
  play.motion = 'idle'
  play.outcome = ''
  play.moving = false
  play.locked = false
  play.input = ''
}

export function arriveBowlNext(play: BowlPlay): 'next' | 'done' {
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
  play.motion = 'idle'
  play.outcome = ''
  play.moving = false
  play.locked = false
  play.input = ''
  return 'next'
}

export function tapBowlDigit(play: BowlPlay, digit: string): boolean {
  if (play.moving || play.settled || play.locked) return false
  if (!/^\d$/.test(digit)) return false
  if (play.input.length >= 2) return false
  play.input += digit
  return true
}

export function tapBowlDelete(play: BowlPlay): boolean {
  if (play.moving || play.settled || play.locked) return false
  if (play.input === '') return false
  play.input = play.input.slice(0, -1)
  return true
}

export function confirmBowl(play: BowlPlay): BowlConfirmResult {
  if (play.moving || play.settled || play.locked) return 'locked'
  if (play.input === '') return 'empty'
  const problem = currentBowlProblem(play)
  const value = parseBowlInput(play.input)
  if (value == null) return 'empty'
  const correct = isBowlCorrect(problem, play.input)

  play.input = ''
  play.locked = true
  play.moving = true

  if (!correct) {
    play.wrongOnce[play.index] = true
    play.outcome = 'wrong'
    play.motion = 'shake'
    return 'wrong'
  }

  if (!play.wrongOnce[play.index]) {
    play.firstTryThisRound += 1
  }
  play.outcome = 'correct'
  play.motion = 'cheer'
  return 'correct'
}

export function tapBowlHelp(play: BowlPlay): boolean {
  if (play.moving || play.settled) return false
  if (!play.hintOnce[play.index]) {
    play.hintOnce[play.index] = true
    play.hintThisRound += 1
  }
  return true
}

export function bowlLidOpen(play: BowlPlay): boolean {
  return play.outcome === 'correct' && play.motion === 'cheer'
}

export function bowlForDisk(play: BowlPlay): BowlPlay {
  const copy = JSON.parse(JSON.stringify(play)) as BowlPlay
  if (copy.settled) {
    copy.moving = false
    copy.motion = 'idle'
    copy.outcome = ''
    copy.locked = true
    copy.input = ''
    return copy
  }
  if (copy.outcome === 'correct' || copy.motion === 'cheer') {
    arriveBowlNext(copy)
    return copy
  }
  if (copy.outcome === 'wrong' || copy.motion === 'shake') {
    restoreBowl(copy)
    return copy
  }
  copy.moving = false
  copy.motion = 'idle'
  copy.outcome = ''
  copy.locked = false
  copy.input = copy.input
  return copy
}

export function hasBowlProgress(play: BowlPlay | null | undefined): boolean {
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
