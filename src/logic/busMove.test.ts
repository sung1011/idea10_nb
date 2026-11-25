import { describe, expect, it } from 'vitest'
import { mulberry32 } from './makeProblem'
import {
  arriveNext,
  createBusPlay,
  currentStation,
  depart,
  errorCue,
  hasBusProgress,
  helpSlots,
  onboardCount,
  resetStation,
  tapOffArea,
  tapSeat,
  tapWaiting,
  toggleHelper,
  undoLast,
} from './busMove'
import { STATION_COUNT, makeBusTrip, type Animal, type BusTrip } from './busRoute'

function animal(id: string): Animal {
  return { id, kind: 'cat', tint: 'teal' }
}

function handmadeTrip(): BusTrip {
  return {
    startCount: 3,
    initialOnboard: [animal('p1'), animal('p2'), animal('p3')],
    stations: [
      { name: '家门口', kind: 'board', target: 5, waiting: [animal('w1'), animal('w2'), animal('w3')] },
      { name: '花园', kind: 'alight', target: 2, waiting: [] },
      { name: '池塘', kind: 'board', target: 4, waiting: [animal('w4'), animal('w5'), animal('w6')] },
      { name: '果园', kind: 'alight', target: 1, waiting: [] },
      { name: '野餐地', kind: 'board', target: 3, waiting: [animal('w7'), animal('w8')] },
    ],
  }
}

function boardUntil(play: ReturnType<typeof createBusPlay>, count: number) {
  const need = count - onboardCount(play.seats)
  for (let i = 0; i < need; i += 1) {
    const next = play.waiting[0]
    if (!next) throw new Error('no waiting')
    expect(tapWaiting(play, next.id)).toBe(true)
  }
}

function alightUntil(play: ReturnType<typeof createBusPlay>, count: number) {
  while (onboardCount(play.seats) > count) {
    const index = play.seats.findIndex((seat) => seat)
    expect(tapSeat(play, index)).toBe(true)
  }
}

function passStation(play: ReturnType<typeof createBusPlay>) {
  const target = currentStation(play).target
  if (currentStation(play).kind === 'board') boardUntil(play, target)
  else alightUntil(play, target)
  expect(depart(play)).toBe('ok')
  expect(arriveNext(play)).toMatch(/next|done/)
}

describe('当站上下车与撤回', () => {
  it('上车站只能动本站新上车，原乘客点了无效', () => {
    const play = createBusPlay(handmadeTrip())
    expect(onboardCount(play.seats)).toBe(3)
    expect(tapSeat(play, 0)).toBe(false)
    expect(play.seats[0]?.id).toBe('p1')
    expect(tapWaiting(play, 'w1')).toBe(true)
    expect(onboardCount(play.seats)).toBe(4)
    const newSeat = play.seats.findIndex((seat) => seat?.id === 'w1')
    expect(tapSeat(play, newSeat)).toBe(true)
    expect(play.waiting.some((item) => item.id === 'w1')).toBe(true)
    expect(onboardCount(play.seats)).toBe(3)
  })

  it('下车站只能撤刚下车，不能点候车上车', () => {
    const play = createBusPlay(handmadeTrip())
    boardUntil(play, 5)
    expect(depart(play)).toBe('ok')
    expect(arriveNext(play)).toBe('next')
    expect(currentStation(play).kind).toBe('alight')
    expect(tapWaiting(play, 'w3')).toBe(false)
    expect(tapSeat(play, 0)).toBe(true)
    expect(play.offArea[0]?.id).toBe('p1')
    expect(tapOffArea(play, 'p1')).toBe(true)
    expect(play.seats[0]?.id).toBe('p1')
    expect(play.offArea).toEqual([])
  })

  it('撤回弹栈顶，本站重来回到快照且不换目标', () => {
    const play = createBusPlay(handmadeTrip())
    const target = currentStation(play).target
    tapWaiting(play, 'w1')
    tapWaiting(play, 'w2')
    expect(undoLast(play)).toBe(true)
    expect(play.waiting.some((item) => item.id === 'w2')).toBe(true)
    expect(resetStation(play)).toBe(true)
    expect(onboardCount(play.seats)).toBe(3)
    expect(play.waiting.map((item) => item.id)).toEqual(['w1', 'w2', 'w3'])
    expect(currentStation(play).target).toBe(target)
    expect(play.stationIndex).toBe(0)
  })

  it('发车少/多保留现场，锁住连点，改过才能再计调整', () => {
    const play = createBusPlay(handmadeTrip())
    expect(hasBusProgress(play)).toBe(false)
    expect(depart(play)).toBe('few')
    expect(play.adjustThisTrip).toBe(1)
    expect(play.feedback).toBe('few')
    expect(onboardCount(play.seats)).toBe(3)
    expect(depart(play)).toBe('locked')
    expect(play.adjustThisTrip).toBe(1)
    tapWaiting(play, 'w1')
    tapWaiting(play, 'w2')
    tapWaiting(play, 'w3')
    expect(depart(play)).toBe('many')
    expect(play.adjustThisTrip).toBe(2)
    expect(depart(play)).toBe('locked')
    expect(play.adjustThisTrip).toBe(2)
    expect(play.seats.some((seat) => seat?.id === 'w3')).toBe(true)
    expect(errorCue(play)).toBe('board-back')
  })

  it('四类错误方向：上车少要再上、上车多退回；下车多请回、下车少再下', () => {
    const play = createBusPlay(handmadeTrip())
    expect(depart(play)).toBe('few')
    expect(errorCue(play)).toBe('board-more')
    tapWaiting(play, 'w1')
    tapWaiting(play, 'w2')
    tapWaiting(play, 'w3')
    expect(depart(play)).toBe('many')
    expect(errorCue(play)).toBe('board-back')
    expect(helpSlots(play).some((slot) => slot.kind === 'extra')).toBe(true)

    const alight = createBusPlay(handmadeTrip())
    boardUntil(alight, 5)
    depart(alight)
    arriveNext(alight)
    expect(currentStation(alight).kind).toBe('alight')
    expect(depart(alight)).toBe('many')
    expect(errorCue(alight)).toBe('alight-more')
    alightUntil(alight, 0)
    expect(depart(alight)).toBe('few')
    expect(errorCue(alight)).toBe('alight-back')
    const slots = helpSlots(alight)
    expect(slots.filter((slot) => slot.kind === 'missing').length).toBe(2)
  })

  it('keepMoving 时下一站仍锁定并进入驶入阶段', () => {
    const play = createBusPlay(handmadeTrip())
    boardUntil(play, 5)
    expect(depart(play)).toBe('ok')
    expect(arriveNext(play, true)).toBe('next')
    expect(play.stationIndex).toBe(1)
    expect(play.moving).toBe(true)
    expect(play.motion).toBe('enter')
    expect(tapSeat(play, 0)).toBe(false)
  })

  it('过站人数承接，完成只到终点', () => {
    const play = createBusPlay(handmadeTrip())
    passStation(play)
    expect(play.stationIndex).toBe(1)
    expect(onboardCount(play.seats)).toBe(5)
    passStation(play)
    expect(onboardCount(play.seats)).toBe(2)
    passStation(play)
    passStation(play)
    passStation(play)
    expect(play.settled).toBe(true)
    expect(arriveNext(play)).toBe('done')
    expect(hasBusProgress(play)).toBe(false)
  })

  it('小帮手每站首次计 1，收起再开不加', () => {
    const play = createBusPlay(handmadeTrip())
    toggleHelper(play)
    toggleHelper(play)
    toggleHelper(play)
    expect(play.hintThisTrip).toBe(1)
    boardUntil(play, 5)
    depart(play)
    arriveNext(play)
    toggleHelper(play)
    expect(play.hintThisTrip).toBe(2)
  })

  it('生成路线十题才能走完，第五题不结束', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const play = createBusPlay(makeBusTrip(mulberry32(seed)))
      expect(play.trip.stations).toHaveLength(STATION_COUNT)
      expect(play.hintOnce).toHaveLength(STATION_COUNT)
      for (let i = 0; i < 5; i += 1) passStation(play)
      expect(play.settled).toBe(false)
      expect(play.stationIndex).toBe(5)
      while (!play.settled) passStation(play)
      expect(play.stationIndex).toBe(STATION_COUNT - 1)
      expect(play.settled).toBe(true)
    }
  })
})
