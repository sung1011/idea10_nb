import { shuffle } from './makeProblem'

export const STOP_NAMES = ['家门口', '花园', '池塘', '果园', '野餐地'] as const
export const SEAT_COUNT = 10
export const STATION_COUNT = 10

export type StopKind = 'board' | 'alight'
export type AnimalKind = 'cat' | 'rabbit' | 'bear' | 'bird' | 'frog'
export type AnimalTint = 'teal' | 'coral' | 'gold' | 'cream'

export type Animal = {
  id: string
  kind: AnimalKind
  tint: AnimalTint
}

export type StationPlan = {
  name: string
  kind: StopKind
  target: number
  waiting: Animal[]
}

export type BusTrip = {
  startCount: number
  initialOnboard: Animal[]
  stations: StationPlan[]
}

const ANIMAL_KINDS: AnimalKind[] = ['cat', 'rabbit', 'bear', 'bird', 'frog']
const ANIMAL_TINTS: AnimalTint[] = ['teal', 'coral', 'gold', 'cream']

export function createAnimalFactory(rng: () => number) {
  let seq = 0
  return function makeAnimal(): Animal {
    seq += 1
    return {
      id: `a${seq}`,
      kind: ANIMAL_KINDS[Math.floor(rng() * ANIMAL_KINDS.length)]!,
      tint: ANIMAL_TINTS[Math.floor(rng() * ANIMAL_TINTS.length)]!,
    }
  }
}

export function stationTaskText(name: string, target: number): string {
  return `${name}站。车上要有 ${target} 只小动物。`
}

export function helperLines(current: number, target: number): {
  current: number
  target: number
  empty: number
  delta: number
  text: string
} {
  const empty = SEAT_COUNT - current
  const delta = target - current
  const diff =
    delta > 0 ? `还差 ${delta}` : delta < 0 ? `要下去 ${-delta}` : '人数刚好'
  const text = `现在 ${current}，要 ${target}，空位 ${empty}，${diff}。`
  return { current, target, empty, delta, text }
}

function pickInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function waitingForBoard(need: number, empty: number, rng: () => number, makeAnimal: () => Animal): Animal[] {
  const canOvershoot = empty > need
  let extra = 0
  if (canOvershoot) {
    extra = 1
    if (need + 2 <= empty && rng() < 0.45) extra = 2
  }
  return Array.from({ length: need + extra }, () => makeAnimal())
}

export function isValidTrip(trip: BusTrip): boolean {
  if (trip.startCount < 1 || trip.startCount > 9) return false
  if (trip.initialOnboard.length !== trip.startCount) return false
  if (trip.stations.length !== STATION_COUNT) return false
  let current = trip.startCount
  let sawBoard = false
  let sawAlight = false
  for (let i = 0; i < trip.stations.length; i += 1) {
    const station = trip.stations[i]
    if (!station) return false
    if (station.target < 1 || station.target > SEAT_COUNT) return false
    if (station.target === current) return false
    if (station.kind === 'board') {
      if (station.target <= current) return false
      if (current === SEAT_COUNT) return false
      const need = station.target - current
      if (station.waiting.length < need) return false
      sawBoard = true
    } else if (station.kind === 'alight') {
      if (station.target >= current) return false
      if (current <= 1) return false
      sawAlight = true
    } else {
      return false
    }
    current = station.target
  }
  return sawBoard && sawAlight
}

export function makeBusTrip(rng: () => number = Math.random): BusTrip {
  const makeAnimal = createAnimalFactory(rng)
  const startCount = pickInt(1, 9, rng)
  let current = startCount
  let sawBoard = false
  let sawAlight = false
  const stations: StationPlan[] = []

  for (let i = 0; i < STATION_COUNT; i += 1) {
    const last = i === STATION_COUNT - 1
    const canBoard = current < SEAT_COUNT
    const canAlight = current > 1
    let kind: StopKind
    if (!canAlight) kind = 'board'
    else if (!canBoard) kind = 'alight'
    else if (last && !sawBoard) kind = 'board'
    else if (last && !sawAlight) kind = 'alight'
    else kind = rng() < 0.5 ? 'board' : 'alight'

    let target: number
    if (kind === 'board') {
      target = pickInt(current + 1, SEAT_COUNT, rng)
    } else {
      target = pickInt(1, current - 1, rng)
    }

    const waiting =
      kind === 'board'
        ? waitingForBoard(target - current, SEAT_COUNT - current, rng, makeAnimal)
        : []

    stations.push({
      name: String(i + 1),
      kind,
      target,
      waiting: shuffle(waiting, rng),
    })
    if (kind === 'board') sawBoard = true
    else sawAlight = true
    current = target
  }

  const trip: BusTrip = {
    startCount,
    initialOnboard: Array.from({ length: startCount }, () => makeAnimal()),
    stations,
  }
  if (!isValidTrip(trip)) {
    throw new Error('坐车路线生成失败')
  }
  return trip
}
