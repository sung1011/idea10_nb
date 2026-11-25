import {
  SEAT_COUNT,
  type Animal,
  type BusTrip,
  type StationPlan,
  type StopKind,
} from './busRoute'

export type SeatMap = (Animal | null)[]

export type BusStackMove =
  | { type: 'board'; animal: Animal; seatIndex: number }
  | { type: 'alight'; animal: Animal; seatIndex: number }

export type DepartResult = 'ok' | 'few' | 'many' | 'locked'

export type BusPlay = {
  trip: BusTrip
  stationIndex: number
  seats: SeatMap
  waiting: Animal[]
  offArea: Animal[]
  stack: BusStackMove[]
  snapshotSeats: SeatMap
  snapshotWaiting: Animal[]
  helperOpen: boolean
  hintOnce: boolean[]
  hintThisTrip: number
  adjustThisTrip: number
  departLocked: boolean
  feedback: '' | 'few' | 'many'
  moving: boolean
  settled: boolean
  accounted: boolean
}

export function emptySeats(): SeatMap {
  return Array.from({ length: SEAT_COUNT }, () => null)
}

export function seatsFrom(animals: Animal[]): SeatMap {
  const seats = emptySeats()
  animals.forEach((animal, index) => {
    if (index < SEAT_COUNT) seats[index] = animal
  })
  return seats
}

export function onboardCount(seats: SeatMap): number {
  return seats.reduce((sum, seat) => sum + (seat ? 1 : 0), 0)
}

export function firstEmptySeat(seats: SeatMap): number {
  return seats.findIndex((seat) => seat == null)
}

export function currentStation(play: BusPlay): StationPlan {
  const station = play.trip.stations[play.stationIndex]
  if (!station) throw new Error('没有当前站')
  return station
}

export function stationKind(play: BusPlay): StopKind {
  return currentStation(play).kind
}

function cloneSeats(seats: SeatMap): SeatMap {
  return seats.slice()
}

function afterChange(play: BusPlay) {
  play.feedback = ''
  play.departLocked = false
}

function snapshotStation(play: BusPlay) {
  const station = currentStation(play)
  play.waiting = station.waiting.slice()
  play.offArea = []
  play.stack = []
  play.snapshotSeats = cloneSeats(play.seats)
  play.snapshotWaiting = play.waiting.slice()
  play.helperOpen = false
  play.feedback = ''
  play.departLocked = false
  play.moving = false
}

export function createBusPlay(trip: BusTrip): BusPlay {
  const play: BusPlay = {
    trip,
    stationIndex: 0,
    seats: seatsFrom(trip.initialOnboard),
    waiting: [],
    offArea: [],
    stack: [],
    snapshotSeats: emptySeats(),
    snapshotWaiting: [],
    helperOpen: false,
    hintOnce: Array.from({ length: trip.stations.length }, () => false),
    hintThisTrip: 0,
    adjustThisTrip: 0,
    departLocked: false,
    feedback: '',
    moving: false,
    settled: false,
    accounted: false,
  }
  snapshotStation(play)
  return play
}

export function tapWaiting(play: BusPlay, animalId: string): boolean {
  if (play.moving || play.settled) return false
  if (stationKind(play) !== 'board') return false
  const at = play.waiting.findIndex((animal) => animal.id === animalId)
  if (at < 0) return false
  const seatIndex = firstEmptySeat(play.seats)
  if (seatIndex < 0) return false
  const animal = play.waiting[at]!
  play.waiting.splice(at, 1)
  play.seats[seatIndex] = animal
  play.stack.push({ type: 'board', animal, seatIndex })
  afterChange(play)
  return true
}

export function tapSeat(play: BusPlay, seatIndex: number): boolean {
  if (play.moving || play.settled) return false
  if (seatIndex < 0 || seatIndex >= SEAT_COUNT) return false
  const animal = play.seats[seatIndex]
  if (!animal) return false
  const kind = stationKind(play)
  if (kind === 'board') {
    if (play.snapshotSeats[seatIndex]?.id === animal.id) return false
    play.seats[seatIndex] = null
    play.waiting.push(animal)
    play.stack = play.stack.filter(
      (move) => !(move.type === 'board' && move.seatIndex === seatIndex && move.animal.id === animal.id),
    )
    afterChange(play)
    return true
  }
  if (play.snapshotSeats[seatIndex]?.id !== animal.id) return false
  play.seats[seatIndex] = null
  play.offArea.push(animal)
  play.stack.push({ type: 'alight', animal, seatIndex })
  afterChange(play)
  return true
}

export function tapOffArea(play: BusPlay, animalId: string): boolean {
  if (play.moving || play.settled) return false
  if (stationKind(play) !== 'alight') return false
  const at = play.offArea.findIndex((animal) => animal.id === animalId)
  if (at < 0) return false
  const animal = play.offArea[at]!
  const move = [...play.stack].reverse().find((item) => item.type === 'alight' && item.animal.id === animal.id)
  if (!move || play.seats[move.seatIndex]) return false
  play.offArea.splice(at, 1)
  play.seats[move.seatIndex] = animal
  play.stack = play.stack.filter((item) => item !== move)
  afterChange(play)
  return true
}

export function undoLast(play: BusPlay): boolean {
  if (play.moving || play.settled) return false
  const move = play.stack[play.stack.length - 1]
  if (!move) return false
  if (move.type === 'board') {
    if (play.seats[move.seatIndex]?.id !== move.animal.id) return false
    play.seats[move.seatIndex] = null
    play.waiting.push(move.animal)
  } else {
    const offAt = play.offArea.findIndex((animal) => animal.id === move.animal.id)
    if (offAt < 0 || play.seats[move.seatIndex]) return false
    play.offArea.splice(offAt, 1)
    play.seats[move.seatIndex] = move.animal
  }
  play.stack.pop()
  afterChange(play)
  return true
}

export function resetStation(play: BusPlay): boolean {
  if (play.moving || play.settled) return false
  if (play.stack.length === 0 && play.feedback === '' && !play.departLocked) {
    play.seats = cloneSeats(play.snapshotSeats)
    play.waiting = play.snapshotWaiting.slice()
    play.offArea = []
    return false
  }
  play.seats = cloneSeats(play.snapshotSeats)
  play.waiting = play.snapshotWaiting.slice()
  play.offArea = []
  play.stack = []
  afterChange(play)
  return true
}

export function toggleHelper(play: BusPlay): boolean {
  if (play.moving || play.settled) return false
  play.helperOpen = !play.helperOpen
  if (play.helperOpen && !play.hintOnce[play.stationIndex]) {
    play.hintOnce[play.stationIndex] = true
    play.hintThisTrip += 1
  }
  return true
}

export function depart(play: BusPlay): DepartResult {
  if (play.moving || play.settled || play.departLocked) return 'locked'
  const target = currentStation(play).target
  const current = onboardCount(play.seats)
  if (current < target) {
    play.feedback = 'few'
    play.adjustThisTrip += 1
    play.departLocked = true
    return 'few'
  }
  if (current > target) {
    play.feedback = 'many'
    play.adjustThisTrip += 1
    play.departLocked = true
    return 'many'
  }
  play.feedback = ''
  play.moving = true
  play.helperOpen = false
  return 'ok'
}

export function arriveNext(play: BusPlay): 'next' | 'done' {
  if (!play.moving || play.settled) return play.settled ? 'done' : 'next'
  play.moving = false
  if (play.stationIndex >= play.trip.stations.length - 1) {
    play.settled = true
    return 'done'
  }
  play.stationIndex += 1
  snapshotStation(play)
  return 'next'
}

export function hasBusProgress(play: BusPlay | null | undefined): boolean {
  if (!play || play.settled) return false
  return (
    play.stationIndex > 0 ||
    play.stack.length > 0 ||
    play.hintThisTrip > 0 ||
    play.feedback !== '' ||
    play.departLocked ||
    play.moving ||
    play.helperOpen
  )
}
