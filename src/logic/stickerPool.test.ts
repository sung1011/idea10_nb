import { describe, expect, it } from 'vitest'
import { mulberry32 } from './makeProblem'
import {
  DEFAULT_STICKER_ID,
  STICKER_IDS,
  STICKER_POOL_SIZE,
  dealSticker,
  emptyStickerBag,
  isStickerId,
  parseStickerBag,
  shuffleStickerIds,
  stickerUrl,
} from './stickerPool'

describe('stickerPool', () => {
  it('池为 25 个合法 ID，默认展示 star', () => {
    expect(STICKER_IDS).toHaveLength(25)
    expect(STICKER_POOL_SIZE).toBe(25)
    expect(new Set(STICKER_IDS).size).toBe(25)
    expect(DEFAULT_STICKER_ID).toBe('star')
    expect(isStickerId('star')).toBe(true)
    expect(isStickerId('nope')).toBe(false)
    expect(stickerUrl('star')).toBe('/idea10_nb/stickers/sticker-star.svg')
  })

  it('洗牌 25 枚不重复；rng=1 不越界', () => {
    const order = shuffleStickerIds(mulberry32(21))
    expect(order).toHaveLength(25)
    expect(new Set(order).size).toBe(25)
    expect([...order].sort()).toEqual([...STICKER_IDS].sort())
    expect(shuffleStickerIds(() => 1)).toHaveLength(25)
    expect(new Set(shuffleStickerIds(() => 1)).size).toBe(25)
  })

  it('连续 25 次发完一袋不重复，第 26 次开新袋', () => {
    let bag = emptyStickerBag()
    const rng = mulberry32(22)
    const first: string[] = []
    for (let i = 0; i < 25; i += 1) {
      const dealt = dealSticker(bag, rng)
      bag = dealt.bag
      first.push(dealt.id)
    }
    expect(first).toHaveLength(25)
    expect(new Set(first).size).toBe(25)
    expect(bag.next).toBe(25)
    const again = dealSticker(bag, rng)
    expect(isStickerId(again.id)).toBe(true)
    expect(again.bag.next).toBe(1)
    expect(again.bag.order).toHaveLength(25)
    expect(new Set(again.bag.order).size).toBe(25)
  })

  it('损坏袋与越界游标温和变成空袋，不抛错', () => {
    expect(parseStickerBag(undefined, undefined)).toEqual(emptyStickerBag())
    expect(parseStickerBag(['star'], 0)).toEqual(emptyStickerBag())
    expect(parseStickerBag([...STICKER_IDS, 'star'], 0)).toEqual(emptyStickerBag())
    const dup = STICKER_IDS.slice()
    dup[1] = 'star'
    expect(parseStickerBag(dup, 0)).toEqual(emptyStickerBag())
    expect(parseStickerBag(STICKER_IDS.slice(), 26)).toEqual(emptyStickerBag())
    expect(parseStickerBag(STICKER_IDS.slice(), -1)).toEqual(emptyStickerBag())
    const ok = parseStickerBag(STICKER_IDS.slice(), 7)
    expect(ok.next).toBe(7)
    expect(ok.order[0]).toBe('star')
  })
})
