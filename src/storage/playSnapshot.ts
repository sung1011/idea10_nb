import {
  arriveNext,
  type BusMotion,
  type BusPlay,
  type BusStackMove,
} from '../logic/busMove'
import {
  isValidTrip,
  SEAT_COUNT,
  STATION_COUNT,
  type Animal,
  type AnimalKind,
  type AnimalTint,
  type BusTrip,
  type StationPlan,
  type StopKind,
} from '../logic/busRoute'
import { ROUND_SIZE, type Mode, type Op, type Problem } from '../logic/makeProblem'
import { seesawForDisk, type SeesawPlay } from '../logic/seesawMove'
import { seesawRight } from '../logic/seesawProblem'

export type GameView = 'practice' | 'complete' | 'bus' | 'busComplete' | 'seesaw' | 'seesawComplete'

export type PracticeSnapshot = {
  mode: Mode
  problems: Problem[]
  index: number
  input: string
  showHint: boolean
  settled: boolean
  wrongOnce: boolean[]
  hintOnce: boolean[]
  firstTryThisRound: number
  hintThisRound: number
  feedback: '' | 'wrong'
  stickerEmoji: string
}

export type PlaySnapshot = {
  view: GameView
  practice: PracticeSnapshot
  bus: BusPlay | null
  seesaw: SeesawPlay | null
}

const ANIMAL_KINDS: AnimalKind[] = ['cat', 'rabbit', 'bear', 'bird', 'frog']
const ANIMAL_TINTS: AnimalTint[] = ['teal', 'coral', 'gold', 'cream']
const STICKERS = ['🌟', '🌸', '🌈', '🍀', '🎈', '🐠', '⭐', '🍉']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isMode(value: unknown): value is Mode {
  return value === 'add' || value === 'sub' || value === 'mix'
}

function isOp(value: unknown): value is Op {
  return value === '+' || value === '-'
}

function isKind(value: unknown): value is AnimalKind {
  return ANIMAL_KINDS.includes(value as AnimalKind)
}

function isTint(value: unknown): value is AnimalTint {
  return ANIMAL_TINTS.includes(value as AnimalTint)
}

function isStopKind(value: unknown): value is StopKind {
  return value === 'board' || value === 'alight'
}

function isGameView(value: unknown): value is GameView {
  return (
    value === 'practice' ||
    value === 'complete' ||
    value === 'bus' ||
    value === 'busComplete' ||
    value === 'seesaw' ||
    value === 'seesawComplete'
  )
}

function intIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null
  return value
}

function bools(value: unknown, len: number): boolean[] | null {
  if (!Array.isArray(value) || value.length !== len) return null
  if (!value.every((item) => item === true || item === false)) return null
  return value.slice()
}

function parseAnimal(raw: unknown): Animal | null {
  if (!isRecord(raw)) return null
  if (typeof raw.id !== 'string' || raw.id.length === 0 || raw.id.length > 40) return null
  if (!isKind(raw.kind) || !isTint(raw.tint)) return null
  return { id: raw.id, kind: raw.kind, tint: raw.tint }
}

function parseAnimals(raw: unknown): Animal[] | null {
  if (!Array.isArray(raw)) return null
  const out: Animal[] = []
  for (const item of raw) {
    const animal = parseAnimal(item)
    if (!animal) return null
    out.push(animal)
  }
  return out
}

function parseSeats(raw: unknown): (Animal | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== SEAT_COUNT) return null
  const out: (Animal | null)[] = []
  for (const item of raw) {
    if (item == null) {
      out.push(null)
      continue
    }
    const animal = parseAnimal(item)
    if (!animal) return null
    out.push(animal)
  }
  return out
}

function parseProblem(raw: unknown, mode: Mode): Problem | null {
  if (!isRecord(raw)) return null
  const a = intIn(raw.a, 0, 10)
  const b = intIn(raw.b, 0, 10)
  if (a == null || b == null || !isOp(raw.op) || typeof raw.answer !== 'number' || !Number.isInteger(raw.answer)) {
    return null
  }
  const answer = raw.op === '+' ? a + b : a - b
  if (raw.answer !== answer || answer < 0 || answer > 10) return null
  if (raw.op === '-' && a < b) return null
  if (mode === 'add' && raw.op !== '+') return null
  if (mode === 'sub' && raw.op !== '-') return null
  return { a, b, op: raw.op, answer }
}

function parsePractice(raw: unknown, mode: Mode): PracticeSnapshot | null {
  if (!isRecord(raw)) return null
  if (raw.mode !== mode || !isMode(raw.mode)) return null
  if (!Array.isArray(raw.problems) || raw.problems.length !== ROUND_SIZE) return null
  const problems: Problem[] = []
  const keys = new Set<string>()
  for (const item of raw.problems) {
    const problem = parseProblem(item, mode)
    if (!problem) return null
    const key = `${problem.a}${problem.op}${problem.b}`
    if (keys.has(key)) return null
    keys.add(key)
    problems.push(problem)
  }
  const settled = raw.settled === true
  const index = intIn(raw.index, 0, ROUND_SIZE - 1)
  if (index == null) return null
  if (typeof raw.input !== 'string' || raw.input.length > 2 || !/^\d*$/.test(raw.input)) return null
  if (raw.showHint !== true && raw.showHint !== false) return null
  const wrongOnce = bools(raw.wrongOnce, ROUND_SIZE)
  const hintOnce = bools(raw.hintOnce, ROUND_SIZE)
  if (!wrongOnce || !hintOnce) return null
  const firstTryThisRound = intIn(raw.firstTryThisRound, 0, ROUND_SIZE)
  const hintThisRound = intIn(raw.hintThisRound, 0, ROUND_SIZE)
  if (firstTryThisRound == null || hintThisRound == null) return null
  if (raw.feedback !== '' && raw.feedback !== 'wrong') return null
  const stickerEmoji = STICKERS.includes(raw.stickerEmoji as (typeof STICKERS)[number])
    ? (raw.stickerEmoji as string)
    : STICKERS[0]
  return {
    mode,
    problems,
    index,
    input: raw.input,
    showHint: raw.showHint,
    settled,
    wrongOnce,
    hintOnce,
    firstTryThisRound,
    hintThisRound,
    feedback: raw.feedback,
    stickerEmoji,
  }
}

function parseStation(raw: unknown): StationPlan | null {
  if (!isRecord(raw)) return null
  if (typeof raw.name !== 'string' || raw.name.length > 20) return null
  if (!isStopKind(raw.kind)) return null
  const target = intIn(raw.target, 1, SEAT_COUNT)
  const waiting = parseAnimals(raw.waiting)
  if (target == null || !waiting) return null
  return { name: raw.name, kind: raw.kind, target, waiting }
}

function parseTrip(raw: unknown): BusTrip | null {
  if (!isRecord(raw)) return null
  const startCount = intIn(raw.startCount, 1, 9)
  const initialOnboard = parseAnimals(raw.initialOnboard)
  if (startCount == null || !initialOnboard || initialOnboard.length !== startCount) return null
  if (!Array.isArray(raw.stations) || raw.stations.length !== STATION_COUNT) return null
  const stations: StationPlan[] = []
  for (const item of raw.stations) {
    const station = parseStation(item)
    if (!station) return null
    stations.push(station)
  }
  const trip = { startCount, initialOnboard, stations }
  return isValidTrip(trip) ? trip : null
}

function parseStack(raw: unknown): BusStackMove[] | null {
  if (!Array.isArray(raw) || raw.length > SEAT_COUNT) return null
  const out: BusStackMove[] = []
  for (const item of raw) {
    if (!isRecord(item)) return null
    const animal = parseAnimal(item.animal)
    const seatIndex = intIn(item.seatIndex, 0, SEAT_COUNT - 1)
    if (!animal || seatIndex == null) return null
    if (item.type === 'board' || item.type === 'alight') {
      out.push({ type: item.type, animal, seatIndex })
    } else {
      return null
    }
  }
  return out
}

function parseMotion(value: unknown): BusMotion {
  if (value === 'leave' || value === 'enter' || value === 'flash' || value === 'idle') return value
  return 'idle'
}

function parseBus(raw: unknown): BusPlay | null {
  if (raw == null) return null
  if (!isRecord(raw)) return null
  const trip = parseTrip(raw.trip)
  const stationIndex = intIn(raw.stationIndex, 0, STATION_COUNT - 1)
  const seats = parseSeats(raw.seats)
  const waiting = parseAnimals(raw.waiting)
  const offArea = parseAnimals(raw.offArea)
  const stack = parseStack(raw.stack)
  const snapshotSeats = parseSeats(raw.snapshotSeats)
  const snapshotWaiting = parseAnimals(raw.snapshotWaiting)
  const hintOnce = bools(raw.hintOnce, STATION_COUNT)
  if (
    !trip ||
    stationIndex == null ||
    !seats ||
    !waiting ||
    !offArea ||
    !stack ||
    !snapshotSeats ||
    !snapshotWaiting ||
    !hintOnce
  ) {
    return null
  }
  const hintThisTrip = intIn(raw.hintThisTrip, 0, STATION_COUNT)
  const adjustThisTrip = intIn(raw.adjustThisTrip, 0, 10_000)
  if (hintThisTrip == null || adjustThisTrip == null) return null
  if (raw.helperOpen !== true && raw.helperOpen !== false) return null
  if (raw.departLocked !== true && raw.departLocked !== false) return null
  if (raw.feedback !== '' && raw.feedback !== 'few' && raw.feedback !== 'many') return null
  if (raw.settled !== true && raw.settled !== false) return null
  if (raw.accounted !== true && raw.accounted !== false) return null
  const play: BusPlay = {
    trip,
    stationIndex,
    seats,
    waiting,
    offArea,
    stack,
    snapshotSeats,
    snapshotWaiting,
    helperOpen: raw.helperOpen,
    hintOnce,
    hintThisTrip,
    adjustThisTrip,
    departLocked: raw.departLocked,
    feedback: raw.feedback,
    moving: raw.moving === true,
    motion: parseMotion(raw.motion),
    settled: raw.settled,
    accounted: raw.accounted,
    shownBoardGesture: raw.shownBoardGesture === true,
    shownAlightGesture: raw.shownAlightGesture === true,
  }
  return busForDisk(play)
}

export function busForDisk(play: BusPlay): BusPlay {
  const copy = JSON.parse(JSON.stringify(play)) as BusPlay
  if (copy.settled) {
    copy.moving = false
    copy.motion = 'idle'
    return copy
  }
  if (copy.motion === 'enter') {
    copy.moving = false
    copy.motion = 'idle'
    return copy
  }
  if (copy.moving) {
    arriveNext(copy, false)
  }
  copy.moving = false
  copy.motion = 'idle'
  return copy
}

export function emptyPractice(mode: Mode, problems: Problem[], stickerEmoji = STICKERS[0]): PracticeSnapshot {
  return {
    mode,
    problems,
    index: 0,
    input: '',
    showHint: false,
    settled: false,
    wrongOnce: Array.from({ length: ROUND_SIZE }, () => false),
    hintOnce: Array.from({ length: ROUND_SIZE }, () => false),
    firstTryThisRound: 0,
    hintThisRound: 0,
    feedback: '',
    stickerEmoji,
  }
}

function parseSeesawMotion(value: unknown): SeesawPlay['motion'] {
  if (
    value === 'idle' ||
    value === 'apply' ||
    value === 'hold' ||
    value === 'restore' ||
    value === 'level' ||
    value === 'cheer'
  ) {
    return value
  }
  return 'idle'
}

function parseSeesaw(raw: unknown, mode: Mode): SeesawPlay | null {
  if (raw == null) return null
  if (!isRecord(raw)) return null
  if (!Array.isArray(raw.problems) || raw.problems.length !== ROUND_SIZE) return null
  const problems: Problem[] = []
  const keys = new Set<string>()
  for (const item of raw.problems) {
    const problem = parseProblem(item, mode)
    if (!problem) return null
    const key = `${problem.a}${problem.op}${problem.b}`
    if (keys.has(key)) return null
    keys.add(key)
    problems.push(problem)
  }
  const settled = raw.settled === true
  const index = intIn(raw.index, 0, ROUND_SIZE - 1)
  if (index == null) return null
  if (typeof raw.input !== 'string' || raw.input.length > 2 || !/^\d*$/.test(raw.input)) return null
  const wrongOnce = bools(raw.wrongOnce, ROUND_SIZE)
  const hintOnce = bools(raw.hintOnce, ROUND_SIZE)
  if (!wrongOnce || !hintOnce) return null
  const firstTryThisRound = intIn(raw.firstTryThisRound, 0, ROUND_SIZE)
  const hintThisRound = intIn(raw.hintThisRound, 0, ROUND_SIZE)
  if (firstTryThisRound == null || hintThisRound == null) return null
  const right = intIn(raw.right, 0, 10)
  if (right == null) return null
  if (raw.accounted !== true && raw.accounted !== false) return null
  if (raw.locked !== true && raw.locked !== false) return null
  if (raw.outcome !== '' && raw.outcome !== 'correct' && raw.outcome !== 'wrong') return null
  const play: SeesawPlay = {
    problems,
    index,
    input: raw.input,
    right,
    motion: parseSeesawMotion(raw.motion),
    outcome: raw.outcome,
    moving: raw.moving === true,
    settled,
    accounted: raw.accounted,
    locked: raw.locked,
    wrongOnce,
    hintOnce,
    firstTryThisRound,
    hintThisRound,
  }
  const origin = seesawRight(problems[index]!)
  if (!settled && play.motion === 'idle' && play.outcome === '' && play.right !== origin) return null
  return seesawForDisk(play)
}

export function parsePlay(raw: unknown, mode: Mode): PlaySnapshot | null {
  if (raw == null) return null
  if (!isRecord(raw)) return null
  if (!isGameView(raw.view)) return null
  const practice = parsePractice(raw.practice, mode)
  if (!practice) return null
  let bus: BusPlay | null = null
  if (raw.bus != null) {
    bus = parseBus(raw.bus)
    if (!bus) return null
  }
  let seesaw: SeesawPlay | null = null
  if (raw.seesaw != null) {
    seesaw = parseSeesaw(raw.seesaw, mode)
  }
  let view = raw.view
  if ((view === 'seesaw' || view === 'seesawComplete') && !seesaw) {
    view = practice.settled ? 'complete' : 'practice'
  }
  if ((view === 'bus' || view === 'busComplete') && !bus) return null
  if (view === 'complete' && !practice.settled) return null
  if (view === 'busComplete' && bus && !bus.settled) return null
  if (view === 'seesawComplete' && seesaw && !seesaw.settled) view = 'seesaw'
  if (view === 'seesaw' && seesaw?.settled) view = 'seesawComplete'
  return { view, practice, bus, seesaw }
}

export function livePractice(state: {
  mode: Mode
  problems: Problem[]
  index: number
  input: string
  showHint: boolean
  settled: boolean
  wrongOnce: boolean[]
  hintOnce: boolean[]
  firstTryThisRound: number
  hintThisRound: number
  feedback: '' | 'wrong'
  stickerEmoji: string
}): PracticeSnapshot {
  return {
    mode: state.mode,
    problems: state.problems.map((item) => ({ ...item })),
    index: state.index,
    input: state.input,
    showHint: state.showHint,
    settled: state.settled,
    wrongOnce: state.wrongOnce.slice(),
    hintOnce: state.hintOnce.slice(),
    firstTryThisRound: state.firstTryThisRound,
    hintThisRound: state.hintThisRound,
    feedback: state.feedback,
    stickerEmoji: state.stickerEmoji,
  }
}

export function gameViewFrom(
  view: string,
  openedView: string | null,
  settled: boolean,
): GameView {
  const source = view === 'settings' ? openedView ?? (settled ? 'complete' : 'practice') : view
  if (
    source === 'practice' ||
    source === 'complete' ||
    source === 'bus' ||
    source === 'busComplete' ||
    source === 'seesaw' ||
    source === 'seesawComplete'
  ) {
    return source
  }
  return settled ? 'complete' : 'practice'
}
