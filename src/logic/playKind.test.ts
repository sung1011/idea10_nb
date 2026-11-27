import { describe, expect, it } from 'vitest'
import { isPlayKind, PLAY_OPTIONS, playKindOf } from './playKind'

describe('玩法种类', () => {
  it('完成页与进行中同属一个玩法', () => {
    expect(playKindOf('practice')).toBe('practice')
    expect(playKindOf('complete')).toBe('practice')
    expect(playKindOf('bus')).toBe('bus')
    expect(playKindOf('busComplete')).toBe('bus')
    expect(playKindOf('seesaw')).toBe('seesaw')
    expect(playKindOf('seesawComplete')).toBe('seesaw')
    expect(playKindOf('bowl')).toBe('bowl')
    expect(playKindOf('bowlComplete')).toBe('bowl')
    expect(playKindOf('settings')).toBeNull()
  })

  it('下拉四项固定为算式坐车跷跷板盖碗', () => {
    expect(PLAY_OPTIONS.map((item) => item.id)).toEqual(['practice', 'bus', 'seesaw', 'bowl'])
    expect(PLAY_OPTIONS.map((item) => item.label)).toEqual(['➕ 算式', '🚌 坐车', '⚖️ 跷跷板', '🥣 盖碗'])
    expect(isPlayKind('practice')).toBe(true)
    expect(isPlayKind('bowl')).toBe(true)
    expect(isPlayKind('math')).toBe(false)
  })
})
