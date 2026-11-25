import { describe, expect, it } from 'vitest'
import { mulberry32 } from './makeProblem'
import {
  STOP_NAMES,
  helperLines,
  isValidTrip,
  makeBusTrip,
} from './busRoute'

describe('坐车路线', () => {
  it('200 条随机路线都可解、含上下、无 0 变化、起始 1-9', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const trip = makeBusTrip(mulberry32(seed))
      expect(isValidTrip(trip)).toBe(true)
      expect(trip.startCount).toBeGreaterThanOrEqual(1)
      expect(trip.startCount).toBeLessThanOrEqual(9)
      expect(trip.stations.map((station) => station.name)).toEqual([...STOP_NAMES])
      expect(trip.stations.some((station) => station.kind === 'board')).toBe(true)
      expect(trip.stations.some((station) => station.kind === 'alight')).toBe(true)
      let current = trip.startCount
      for (const station of trip.stations) {
        expect(station.target).not.toBe(current)
        expect(station.target).toBeGreaterThanOrEqual(1)
        expect(station.target).toBeLessThanOrEqual(10)
        current = station.target
      }
    }
  })

  it('上车站候车至少够目标，能多上时多给候车', () => {
    let foundExtra = false
    for (let seed = 1; seed <= 80; seed += 1) {
      const trip = makeBusTrip(mulberry32(seed + 300))
      let current = trip.startCount
      for (const station of trip.stations) {
        if (station.kind === 'board') {
          const need = station.target - current
          const empty = 10 - current
          expect(station.waiting.length).toBeGreaterThanOrEqual(need)
          if (empty > need) {
            expect(station.waiting.length).toBeGreaterThan(need)
            foundExtra = true
          }
        }
        current = station.target
      }
    }
    expect(foundExtra).toBe(true)
  })

  it('辅助数字只给目标人数，不把差额写成句子', () => {
    expect(helperLines(4, 6).current).toBe(4)
    expect(helperLines(4, 6).target).toBe(6)
    expect(helperLines(4, 6).empty).toBe(6)
    expect(helperLines(4, 6).delta).toBe(2)
  })
})
