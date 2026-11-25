export type PlayKind = 'practice' | 'bus' | 'seesaw'

export const PLAY_OPTIONS: { id: PlayKind; label: string }[] = [
  { id: 'practice', label: '算式' },
  { id: 'bus', label: '坐车' },
  { id: 'seesaw', label: '跷跷板' },
]

export function playKindOf(view: string): PlayKind | null {
  if (view === 'practice' || view === 'complete') return 'practice'
  if (view === 'bus' || view === 'busComplete') return 'bus'
  if (view === 'seesaw' || view === 'seesawComplete') return 'seesaw'
  return null
}

export function isPlayKind(value: string): value is PlayKind {
  return value === 'practice' || value === 'bus' || value === 'seesaw'
}
