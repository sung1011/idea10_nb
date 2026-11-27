import { describe, expect, it } from 'vitest'
import {
  arriveBowlNext,
  bowlForDisk,
  bowlLidOpen,
  confirmBowl,
  createBowlPlay,
  restoreBowl,
  tapBowlDelete,
  tapBowlDigit,
  tapBowlHelp,
} from './bowlMove'

function tenAdd(first = { a: 3, b: 5, op: '+' as const, answer: 8 }) {
  return createBowlPlay([
    first,
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

describe('选数与确定', () => {
  it('选数不揭盖、不透数量；空确定无效', () => {
    const play = tenAdd()
    expect(play.motion).toBe('idle')
    expect(bowlLidOpen(play)).toBe(false)
    expect(tapBowlDigit(play, '5')).toBe(true)
    expect(play.input).toBe('5')
    expect(bowlLidOpen(play)).toBe(false)
    expect(play.motion).toBe('idle')
    expect(tapBowlDelete(play)).toBe(true)
    expect(play.input).toBe('')
    expect(confirmBowl(play)).toBe('empty')
    expect(play.settled).toBe(false)
  })

  it('答对揭盖庆祝，进下一题后重新盖上', () => {
    const play = tenAdd()
    tapBowlDigit(play, '5')
    expect(confirmBowl(play)).toBe('correct')
    expect(play.outcome).toBe('correct')
    expect(play.motion).toBe('cheer')
    expect(bowlLidOpen(play)).toBe(true)
    expect(arriveBowlNext(play)).toBe('next')
    expect(play.index).toBe(1)
    expect(play.motion).toBe('idle')
    expect(bowlLidOpen(play)).toBe(false)
    expect(play.input).toBe('')
  })

  it('合法错答不揭盖，还原后仍是原题且输入已清', () => {
    const play = tenAdd()
    tapBowlDigit(play, '4')
    expect(confirmBowl(play)).toBe('wrong')
    expect(play.outcome).toBe('wrong')
    expect(play.motion).toBe('shake')
    expect(bowlLidOpen(play)).toBe(false)
    expect(play.wrongOnce[0]).toBe(true)
    restoreBowl(play)
    expect(play.index).toBe(0)
    expect(play.motion).toBe('idle')
    expect(play.input).toBe('')
    expect(bowlLidOpen(play)).toBe(false)
  })

  it('0 题必须填 0 才揭开空碗，不自动过关', () => {
    const play = tenAdd({ a: 5, b: 0, op: '+', answer: 5 })
    expect(bowlLidOpen(play)).toBe(false)
    expect(confirmBowl(play)).toBe('empty')
    tapBowlDigit(play, '5')
    expect(confirmBowl(play)).toBe('wrong')
    expect(bowlLidOpen(play)).toBe(false)
    restoreBowl(play)
    tapBowlDigit(play, '0')
    expect(confirmBowl(play)).toBe('correct')
    expect(bowlLidOpen(play)).toBe(true)
    expect(play.problems[0]?.b).toBe(0)
  })
})

describe('磁盘规范化', () => {
  it('庆祝中快照已到下一题 idle；晃动中快照为原题 idle', () => {
    const play = tenAdd()
    tapBowlDigit(play, '5')
    confirmBowl(play)
    expect(play.index).toBe(0)
    const ok = bowlForDisk(play)
    expect(play.index).toBe(0)
    expect(ok.index).toBe(1)
    expect(ok.motion).toBe('idle')
    expect(ok.moving).toBe(false)
    expect(ok.outcome).toBe('')
    expect(bowlLidOpen(ok)).toBe(false)

    const wrong = tenAdd()
    tapBowlDigit(wrong, '2')
    confirmBowl(wrong)
    const disk = bowlForDisk(wrong)
    expect(disk.index).toBe(0)
    expect(disk.motion).toBe('idle')
    expect(disk.input).toBe('')
    expect(disk.wrongOnce[0]).toBe(true)
  })

  it('末题庆祝快照为完成 idle，未结算', () => {
    const play = tenAdd()
    play.index = 9
    tapBowlDigit(play, '3')
    confirmBowl(play)
    const disk = bowlForDisk(play)
    expect(disk.settled).toBe(true)
    expect(disk.accounted).toBe(false)
    expect(disk.motion).toBe('idle')
    expect(disk.moving).toBe(false)
  })

  it('点总数才记一次提示，不改盘面', () => {
    const play = tenAdd()
    expect(tapBowlHelp(play)).toBe(true)
    expect(play.hintThisRound).toBe(1)
    expect(tapBowlHelp(play)).toBe(true)
    expect(play.hintThisRound).toBe(1)
    expect(bowlLidOpen(play)).toBe(false)
    expect(play.input).toBe('')
  })
})
