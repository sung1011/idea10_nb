import { describe, expect, it } from 'vitest'
import { arriveNext, createBusPlay, depart, onboardCount, tapSeat, tapWaiting } from '../logic/busMove'
import { makeBusTrip } from '../logic/busRoute'
import { makeRound, mulberry32 } from '../logic/makeProblem'
import { createBowlPlay } from '../logic/bowlMove'
import { createSeesawPlay } from '../logic/seesawMove'
import { busForDisk, emptyPractice, livePractice, parsePlay } from './playSnapshot'

function fillToTarget(play: ReturnType<typeof createBusPlay>) {
  const target = play.trip.stations[play.stationIndex]!.target
  if (play.trip.stations[play.stationIndex]!.kind === 'board') {
    while (onboardCount(play.seats) < target) tapWaiting(play, play.waiting[0]!.id)
  } else {
    while (onboardCount(play.seats) > target) {
      const index = play.seats.findIndex((seat) => seat)
      expect(tapSeat(play, index)).toBe(true)
    }
  }
}

describe('busForDisk', () => {
  it('驶离中快照已到下一题 idle', () => {
    const play = createBusPlay(makeBusTrip(mulberry32(2)))
    fillToTarget(play)
    expect(depart(play)).toBe('ok')
    play.motion = 'leave'
    const disk = busForDisk(play)
    expect(play.stationIndex).toBe(0)
    expect(play.moving).toBe(true)
    expect(disk.moving).toBe(false)
    expect(disk.motion).toBe('idle')
    expect(disk.stationIndex).toBe(1)
    expect(disk.settled).toBe(false)
  })

  it('驶入中快照停在当前题 idle', () => {
    const play = createBusPlay(makeBusTrip(mulberry32(3)))
    fillToTarget(play)
    depart(play)
    arriveNext(play, true)
    expect(play.motion).toBe('enter')
    const disk = busForDisk(play)
    expect(disk.stationIndex).toBe(play.stationIndex)
    expect(disk.moving).toBe(false)
    expect(disk.motion).toBe('idle')
  })

  it('末题驶离快照为已完成 idle', () => {
    const play = createBusPlay(makeBusTrip(mulberry32(4)))
    while (play.stationIndex < play.trip.stations.length - 1) {
      fillToTarget(play)
      depart(play)
      arriveNext(play)
    }
    fillToTarget(play)
    expect(depart(play)).toBe('ok')
    play.motion = 'leave'
    const disk = busForDisk(play)
    expect(disk.settled).toBe(true)
    expect(disk.moving).toBe(false)
    expect(disk.accounted).toBe(false)
  })
})

describe('parsePlay', () => {
  it('座位对不上的会话整份丢弃', () => {
    const play = createBusPlay(makeBusTrip(mulberry32(5)))
    const raw = JSON.parse(JSON.stringify({ view: 'bus', practice: null, bus: play }))
    expect(parsePlay(raw, 'mix')).toBeNull()
  })

  it('完整算术与坐车字段 roundtrip 后一致', () => {
    const problems = makeRound('mix', 10, mulberry32(6))
    const bus = createBusPlay(makeBusTrip(mulberry32(7)))
    bus.helperOpen = true
    bus.hintOnce[0] = true
    bus.hintThisTrip = 1
    const snapshot = {
      view: 'bus' as const,
      practice: livePractice({
        ...emptyPractice('mix', problems, '🌸'),
        index: 4,
        input: '10',
        showHint: true,
        wrongOnce: Array.from({ length: 10 }, (_, i) => i === 1),
        hintOnce: Array.from({ length: 10 }, (_, i) => i === 4),
        firstTryThisRound: 3,
        hintThisRound: 1,
        feedback: 'wrong' as const,
      }),
      bus,
    }
    const parsed = parsePlay(JSON.parse(JSON.stringify(snapshot)), 'mix')
    expect(parsed?.view).toBe('bus')
    expect(parsed?.practice).toEqual(snapshot.practice)
    expect(parsed?.bus?.helperOpen).toBe(true)
    expect(parsed?.bus?.hintThisTrip).toBe(1)
    expect(parsed?.bus?.trip.startCount).toBe(bus.trip.startCount)
    expect(parsed?.bus?.seats).toEqual(bus.seats)
    expect(parsed?.seesaw).toBeNull()
    expect(parsed?.bowl).toBeNull()
  })

  it('跷跷板 roundtrip；完成标记不一致时保另两局', () => {
    const problems = makeRound('mix', 10, mulberry32(8))
    const bus = createBusPlay(makeBusTrip(mulberry32(9)))
    const seesaw = createSeesawPlay(problems)
    seesaw.input = '2'
    const snapshot = {
      view: 'seesaw' as const,
      practice: emptyPractice('mix', problems, '🌈'),
      bus,
      seesaw,
    }
    const parsed = parsePlay(JSON.parse(JSON.stringify(snapshot)), 'mix')
    expect(parsed?.view).toBe('seesaw')
    expect(parsed?.seesaw?.input).toBe('2')
    expect(parsed?.bus?.trip.startCount).toBe(bus.trip.startCount)
    const mismatched = JSON.parse(JSON.stringify(snapshot)) as {
      view: string
      seesaw: { settled: boolean }
    }
    mismatched.view = 'seesawComplete'
    mismatched.seesaw.settled = false
    const kept = parsePlay(mismatched, 'mix')
    expect(kept?.view).toBe('seesaw')
    expect(kept?.practice.problems).toHaveLength(10)
    expect(kept?.bus).toBeTruthy()
  })

  it('v3 idle 档 play.right 仍按 a 校验，不等于 answer 时不丢', () => {
    const problems = [
      { a: 3, b: 5, op: '+' as const, answer: 8 },
      { a: 1, b: 1, op: '+' as const, answer: 2 },
      { a: 2, b: 1, op: '+' as const, answer: 3 },
      { a: 4, b: 1, op: '+' as const, answer: 5 },
      { a: 5, b: 1, op: '+' as const, answer: 6 },
      { a: 6, b: 1, op: '+' as const, answer: 7 },
      { a: 0, b: 2, op: '+' as const, answer: 2 },
      { a: 2, b: 2, op: '+' as const, answer: 4 },
      { a: 3, b: 2, op: '+' as const, answer: 5 },
      { a: 4, b: 2, op: '+' as const, answer: 6 },
    ]
    const seesaw = createSeesawPlay(problems)
    expect(seesaw.right).toBe(3)
    seesaw.input = '4'
    seesaw.wrongOnce[0] = true
    const snapshot = {
      view: 'seesaw' as const,
      practice: emptyPractice('mix', problems, '🍀'),
      bus: createBusPlay(makeBusTrip(mulberry32(12))),
      seesaw,
    }
    const parsed = parsePlay(JSON.parse(JSON.stringify(snapshot)), 'mix')
    expect(parsed?.seesaw?.index).toBe(0)
    expect(parsed?.seesaw?.input).toBe('4')
    expect(parsed?.seesaw?.right).toBe(3)
    expect(parsed?.seesaw?.wrongOnce[0]).toBe(true)
    const broken = JSON.parse(JSON.stringify(snapshot)) as { seesaw: { right: number } }
    broken.seesaw.right = 8
    expect(parsePlay(broken, 'mix')?.seesaw).toBeNull()
  })

  it('旧算术 emoji 保留；坏贴纸字段不丢三局', () => {
    const problems = makeRound('mix', 10, mulberry32(13))
    const bus = createBusPlay(makeBusTrip(mulberry32(14)))
    bus.settled = true
    bus.accounted = true
    const seesaw = createSeesawPlay(problems)
    const practice = emptyPractice('mix', problems, '🌸')
    practice.settled = true
    const parsed = parsePlay(
      {
        view: 'complete',
        practice,
        bus,
        seesaw,
        busSticker: 'not-a-sticker',
        seesawSticker: 12,
      },
      'mix',
    )
    expect(parsed?.practice.stickerEmoji).toBe('🌸')
    expect(parsed?.practice.stickerId).toBeUndefined()
    expect(parsed?.busSticker).toBeUndefined()
    expect(parsed?.seesawSticker).toBeUndefined()
    expect(parsed?.bus?.settled).toBe(true)
    expect(parsed?.seesaw?.index).toBe(0)
    expect(parsed?.view).toBe('complete')
  })

  it('盖碗 roundtrip；坏盖碗只退回算式，坐车仍在', () => {
    const problems = makeRound('mix', 10, mulberry32(15))
    const bus = createBusPlay(makeBusTrip(mulberry32(16)))
    const bowl = createBowlPlay(problems)
    bowl.input = '5'
    const snapshot = {
      view: 'bowl' as const,
      practice: emptyPractice('mix', problems, '🍀'),
      bus,
      seesaw: createSeesawPlay(problems),
      bowl,
    }
    const parsed = parsePlay(JSON.parse(JSON.stringify(snapshot)), 'mix')
    expect(parsed?.view).toBe('bowl')
    expect(parsed?.bowl?.input).toBe('5')
    expect(parsed?.bus?.trip.startCount).toBe(bus.trip.startCount)
    expect(parsed?.seesaw?.problems).toHaveLength(10)
    const broken = JSON.parse(JSON.stringify(snapshot)) as { view: string; bowl: unknown }
    broken.bowl = { broken: true }
    const kept = parsePlay(broken, 'mix')
    expect(kept?.view).toBe('practice')
    expect(kept?.bowl).toBeNull()
    expect(kept?.practice.problems).toHaveLength(10)
    expect(kept?.bus).toBeTruthy()
    expect(kept?.seesaw).toBeTruthy()
    const badSticker = JSON.parse(JSON.stringify(snapshot)) as { bowlSticker: unknown }
    badSticker.bowlSticker = 'not-a-sticker'
    const degraded = parsePlay(badSticker, 'mix')
    expect(degraded?.bowlSticker).toBeUndefined()
    expect(degraded?.bowl?.index).toBe(0)
    expect(degraded?.bus).toBeTruthy()
  })

  it('旧 v4 盖碗无 intro 字段仍读成 idle，不丢另两局', () => {
    const problems = makeRound('mix', 10, mulberry32(17))
    const bowl = createBowlPlay(problems)
    bowl.input = '2'
    bowl.intro = 'bounce'
    const snapshot = {
      view: 'bowl' as const,
      practice: emptyPractice('mix', problems, '🍀'),
      bus: createBusPlay(makeBusTrip(mulberry32(18))),
      seesaw: createSeesawPlay(problems),
      bowl,
    }
    const raw = JSON.parse(JSON.stringify(snapshot)) as { bowl: Record<string, unknown> }
    delete raw.bowl.intro
    const parsed = parsePlay(raw, 'mix')
    expect(parsed?.bowl?.intro).toBe('')
    expect(parsed?.bowl?.input).toBe('2')
    expect(parsed?.bowl?.motion).toBe('idle')
    expect(parsed?.bus).toBeTruthy()
    expect(parsed?.seesaw).toBeTruthy()
  })

  it('算式可恢复大于 10 的题，跷跷板和盖碗仍只接受 10 以内', () => {
    const big = { a: 15, b: 5, op: '+' as const, answer: 20 }
    const ten = makeRound('mix', 10, mulberry32(19))
    const practiceProblems = [big, ...ten.slice(1)]
    const ok = parsePlay(
      {
        view: 'practice',
        practice: emptyPractice('mix', practiceProblems, '🌈'),
        bus: null,
        seesaw: null,
        bowl: null,
      },
      'mix',
    )
    expect(ok?.practice.problems[0]).toEqual(big)

    const seesawRaw = JSON.parse(
      JSON.stringify({
        view: 'seesaw',
        practice: emptyPractice('mix', ten, '🌈'),
        bus: null,
        seesaw: createSeesawPlay(practiceProblems),
        bowl: null,
      }),
    )
    const seesawParsed = parsePlay(seesawRaw, 'mix')
    expect(seesawParsed?.seesaw).toBeNull()
    expect(seesawParsed?.practice.problems).toHaveLength(10)

    const bowlRaw = JSON.parse(
      JSON.stringify({
        view: 'bowl',
        practice: emptyPractice('mix', ten, '🌈'),
        bus: null,
        seesaw: null,
        bowl: createBowlPlay(practiceProblems),
      }),
    )
    const bowlParsed = parsePlay(bowlRaw, 'mix')
    expect(bowlParsed?.bowl).toBeNull()
  })
})
