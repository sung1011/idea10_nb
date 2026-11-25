import { describe, expect, it } from 'vitest'
import { arriveNext, createBusPlay, depart, onboardCount, tapSeat, tapWaiting } from '../logic/busMove'
import { makeBusTrip } from '../logic/busRoute'
import { makeRound, mulberry32 } from '../logic/makeProblem'
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
  })
})
