import { describe, expect, it } from 'vitest'
import { makeRound, mulberry32 } from './makeProblem'
import {
  arriveSeesawNext,
  confirmSeesaw,
  createSeesawPlay,
  restoreSeesaw,
  seesawForDisk,
  tapSeesawDelete,
  tapSeesawDigit,
  tapSeesawHelp,
  tiltDeg,
} from './seesawMove'
import { seesawLeft, seesawRight } from './seesawProblem'

function addPlay() {
  return createSeesawPlay([
    { a: 3, b: 4, op: '+', answer: 7 },
    { a: 1, b: 2, op: '+', answer: 3 },
    { a: 2, b: 2, op: '+', answer: 4 },
    { a: 4, b: 1, op: '+', answer: 5 },
    { a: 0, b: 3, op: '+', answer: 3 },
    { a: 5, b: 0, op: '+', answer: 5 },
    { a: 6, b: 2, op: '+', answer: 8 },
    { a: 2, b: 5, op: '+', answer: 7 },
    { a: 1, b: 1, op: '+', answer: 2 },
    { a: 3, b: 3, op: '+', answer: 6 },
  ])
}

describe('倾角与开题', () => {
  it('开题按数量差倾斜，已水平不自动过关', () => {
    const play = addPlay()
    expect(tiltDeg(seesawLeft(play.problems[0]!), play.right)).toBe(tiltDeg(7, 3))
    expect(tiltDeg(7, 3)).toBeLessThan(0)
    expect(play.settled).toBe(false)
    const flat = createSeesawPlay([
      { a: 5, b: 0, op: '+', answer: 5 },
      ...addPlay().problems.slice(1),
    ])
    expect(tiltDeg(5, flat.right)).toBe(0)
    expect(flat.settled).toBe(false)
    expect(confirmSeesaw(flat)).toBe('empty')
  })
})

describe('选数与确定', () => {
  it('未确认不改盘面不改倾角', () => {
    const play = addPlay()
    const right = play.right
    expect(tapSeesawDigit(play, '4')).toBe(true)
    expect(play.right).toBe(right)
    expect(play.motion).toBe('idle')
    expect(tapSeesawDelete(play)).toBe(true)
    expect(play.right).toBe(right)
    expect(confirmSeesaw(play)).toBe('empty')
  })

  it('正确整批后右盘等于左盘', () => {
    const play = addPlay()
    tapSeesawDigit(play, '4')
    expect(confirmSeesaw(play)).toBe('correct')
    expect(play.right).toBe(7)
    expect(play.outcome).toBe('correct')
    expect(play.motion).toBe('level')
    expect(arriveSeesawNext(play)).toBe('next')
    expect(play.index).toBe(1)
    expect(play.right).toBe(1)
  })

  it('错答改到合法错误个数，还原后回到原右盘', () => {
    const play = addPlay()
    tapSeesawDigit(play, '2')
    expect(confirmSeesaw(play)).toBe('wrong')
    expect(play.right).toBe(5)
    expect(play.wrongOnce[0]).toBe(true)
    restoreSeesaw(play)
    expect(play.right).toBe(3)
    expect(play.input).toBe('')
    expect(play.motion).toBe('idle')
    tapSeesawDigit(play, '4')
    expect(confirmSeesaw(play)).toBe('correct')
    expect(play.firstTryThisRound).toBe(0)
  })

  it('超过 10 或会画出负苹果时不改个数，仍按错答', () => {
    const play = addPlay()
    tapSeesawDigit(play, '9')
    expect(confirmSeesaw(play)).toBe('wrong')
    expect(play.right).toBe(3)
    restoreSeesaw(play)
    const sub = createSeesawPlay([
      { a: 3, b: 1, op: '-', answer: 2 },
      ...addPlay().problems.slice(1),
    ])
    tapSeesawDigit(sub, '9')
    expect(confirmSeesaw(sub)).toBe('wrong')
    expect(sub.right).toBe(3)
  })

  it('0 变化必须填 0 确认', () => {
    const play = addPlay()
    play.index = 5
    play.right = seesawRight(play.problems[5]!)
    expect(play.right).toBe(5)
    expect(tiltDeg(5, 5)).toBe(0)
    expect(confirmSeesaw(play)).toBe('empty')
    tapSeesawDigit(play, '0')
    expect(confirmSeesaw(play)).toBe('correct')
  })
})

describe('磁盘快照', () => {
  it('正确动画中快照已到下一题 idle', () => {
    const play = addPlay()
    tapSeesawDigit(play, '4')
    confirmSeesaw(play)
    const disk = seesawForDisk(play)
    expect(play.index).toBe(0)
    expect(disk.index).toBe(1)
    expect(disk.motion).toBe('idle')
    expect(disk.moving).toBe(false)
    expect(disk.right).toBe(1)
  })

  it('错误动画中快照是原题 idle', () => {
    const play = addPlay()
    tapSeesawDigit(play, '1')
    confirmSeesaw(play)
    expect(play.right).toBe(4)
    const disk = seesawForDisk(play)
    expect(disk.right).toBe(3)
    expect(disk.index).toBe(0)
    expect(disk.motion).toBe('idle')
    expect(play.right).toBe(4)
  })

  it('末题正确快照为已完成', () => {
    const play = addPlay()
    while (play.index < 9) {
      play.input = String(play.problems[play.index]!.b)
      confirmSeesaw(play)
      arriveSeesawNext(play)
    }
    play.input = String(play.problems[9]!.b)
    confirmSeesaw(play)
    const disk = seesawForDisk(play)
    expect(disk.settled).toBe(true)
    expect(disk.accounted).toBe(false)
    expect(disk.moving).toBe(false)
  })

  it('帮助只记一次且不改盘', () => {
    const play = createSeesawPlay(makeRound('mix', 10, mulberry32(3)))
    const right = play.right
    expect(tapSeesawHelp(play)).toBe(true)
    expect(tapSeesawHelp(play)).toBe(true)
    expect(play.hintThisRound).toBe(1)
    expect(play.right).toBe(right)
  })
})
