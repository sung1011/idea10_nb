export const STICKER_IDS = [
  'star',
  'rabbit',
  'cat',
  'rocket',
  'dino',
  'strawberry',
  'dog',
  'bear',
  'pig',
  'chick',
  'penguin',
  'panda',
  'fox',
  'whale',
  'octopus',
  'butterfly',
  'ladybug',
  'sunflower',
  'rainbow',
  'moon',
  'cherries',
  'watermelon',
  'icecream',
  'car',
  'sailboat',
] as const

export type StickerId = (typeof STICKER_IDS)[number]

export const STICKER_POOL_SIZE = STICKER_IDS.length
export const DEFAULT_STICKER_ID: StickerId = 'star'
export const LEGACY_STICKER_EMOJIS = ['🌟', '🌸', '🌈', '🍀', '🎈', '🐠', '⭐', '🍉'] as const

const STICKER_SET = new Set<string>(STICKER_IDS)

export const STICKER_FILE: Record<StickerId, string> = {
  star: 'sticker-star.svg',
  rabbit: 'sticker-rabbit.svg',
  cat: 'sticker-cat.svg',
  rocket: 'sticker-rocket.svg',
  dino: 'sticker-dino.svg',
  strawberry: 'sticker-strawberry.svg',
  dog: 'sticker-dog.svg',
  bear: 'sticker-bear.svg',
  pig: 'sticker-pig.svg',
  chick: 'sticker-chick.svg',
  penguin: 'sticker-penguin.svg',
  panda: 'sticker-panda.svg',
  fox: 'sticker-fox.svg',
  whale: 'sticker-whale.svg',
  octopus: 'sticker-octopus.svg',
  butterfly: 'sticker-butterfly.svg',
  ladybug: 'sticker-ladybug.svg',
  sunflower: 'sticker-sunflower.svg',
  rainbow: 'sticker-rainbow.svg',
  moon: 'sticker-moon.svg',
  cherries: 'sticker-cherries.svg',
  watermelon: 'sticker-watermelon.svg',
  icecream: 'sticker-icecream.svg',
  car: 'sticker-car.svg',
  sailboat: 'sticker-sailboat.svg',
}

export type StickerBag = {
  order: StickerId[]
  next: number
}

export function isStickerId(value: unknown): value is StickerId {
  return typeof value === 'string' && STICKER_SET.has(value)
}

export function isLegacyStickerEmoji(value: unknown): value is string {
  return typeof value === 'string' && (LEGACY_STICKER_EMOJIS as readonly string[]).includes(value)
}

export function emptyStickerBag(): StickerBag {
  return { order: [], next: 0 }
}

export function stickerUrl(id: StickerId): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}stickers/${STICKER_FILE[id]}`
}

export function displayStickerId(id: string | undefined, fallback: boolean): StickerId | '' {
  if (isStickerId(id)) return id
  return fallback ? DEFAULT_STICKER_ID : ''
}

function unitRng(rng: () => number): number {
  const raw = rng()
  return raw >= 0 && raw < 1 ? raw : 0
}

export function shuffleStickerIds(rng: () => number): StickerId[] {
  const out = STICKER_IDS.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(unitRng(rng) * (i + 1))
    const current = out[i]!
    out[i] = out[j]!
    out[j] = current
  }
  return out
}

export function isValidBagOrder(value: unknown): value is StickerId[] {
  if (!Array.isArray(value) || value.length !== STICKER_POOL_SIZE) return false
  const seen = new Set<string>()
  for (const item of value) {
    if (!isStickerId(item) || seen.has(item)) return false
    seen.add(item)
  }
  return seen.size === STICKER_POOL_SIZE
}

export function parseStickerBag(order: unknown, next: unknown): StickerBag {
  if (order == null && next == null) return emptyStickerBag()
  if (!isValidBagOrder(order)) return emptyStickerBag()
  if (typeof next !== 'number' || !Number.isInteger(next) || next < 0 || next > STICKER_POOL_SIZE) {
    return emptyStickerBag()
  }
  return { order: order.slice(), next }
}

export function dealSticker(bag: StickerBag, rng: () => number): { id: StickerId; bag: StickerBag } {
  const live = isValidBagOrder(bag.order) && bag.next >= 0 && bag.next <= STICKER_POOL_SIZE
  if (!live || bag.next >= STICKER_POOL_SIZE) {
    const order = shuffleStickerIds(rng)
    return { id: order[0]!, bag: { order, next: 1 } }
  }
  return { id: bag.order[bag.next]!, bag: { order: bag.order.slice(), next: bag.next + 1 } }
}
