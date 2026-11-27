export type PlayKind = 'practice' | 'bus' | 'seesaw' | 'bowl'

export const PLAY_OPTIONS: { id: PlayKind; label: string }[] = [
  { id: 'practice', label: '➕ 算式' },
  { id: 'bus', label: '🚌 坐车' },
  { id: 'seesaw', label: '⚖️ 跷跷板' },
  { id: 'bowl', label: '🐭 小老鼠' },
]

export function playKindOf(view: string): PlayKind | null {
  if (view === 'practice' || view === 'complete') return 'practice'
  if (view === 'bus' || view === 'busComplete') return 'bus'
  if (view === 'seesaw' || view === 'seesawComplete') return 'seesaw'
  if (view === 'bowl' || view === 'bowlComplete') return 'bowl'
  return null
}

export function isPlayKind(value: string): value is PlayKind {
  return value === 'practice' || value === 'bus' || value === 'seesaw' || value === 'bowl'
}
