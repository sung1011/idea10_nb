import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STICKER_FILE, STICKER_IDS } from './stickerPool'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const stickerDir = join(root, 'public/stickers')

const STICKER_ASSET_EXPECT = [
  { id: 'star', file: 'sticker-star.svg', raw: 887, sha256: '99abf92eee4b145a3fdbe1bc7d83e9eb7e3cdc3849b02b58dc45f1aaae149032' },
  { id: 'rabbit', file: 'sticker-rabbit.svg', raw: 1337, sha256: '7b25b08067bc4a0cbf1c7d7dc77ac3b7382982f117166023831a2ac75bf5c13f' },
  { id: 'cat', file: 'sticker-cat.svg', raw: 1380, sha256: 'aefc8cb5e9a6cde728fba63d7562a6c9218f3486538e21b0355e1352c686f503' },
  { id: 'rocket', file: 'sticker-rocket.svg', raw: 1083, sha256: '8115821036b66980fb24e5db75142577edb7379650e4c9a95a65446ccfd611b0' },
  { id: 'dino', file: 'sticker-dino.svg', raw: 1384, sha256: '79da44931b928e7401ebb23026b9120c7b4f85784ee60371e7571d776f90edf5' },
  { id: 'strawberry', file: 'sticker-strawberry.svg', raw: 1519, sha256: '1d9dfc02f814b63a9c006a5be61463183c4daf09b452d451ac942e23f7f1ff4f' },
  { id: 'dog', file: 'sticker-dog.svg', raw: 1335, sha256: 'c94b81e8345464112529669f9b635fba9d835a69885bd67f8df579225c4ed311' },
  { id: 'bear', file: 'sticker-bear.svg', raw: 1416, sha256: '978b55eb27ac93e5a90c583923f5c70c17370484b2f0a12a1316cef1c6218898' },
  { id: 'pig', file: 'sticker-pig.svg', raw: 1234, sha256: '2d51e1f37a1956bad61403b075da3f35260946a80b1ff6a880bec55dc29204d3' },
  { id: 'chick', file: 'sticker-chick.svg', raw: 1670, sha256: 'f913f3d72c112acfb04d2a878ce49e7bc05137e72e6b97da808bf8606e7ef8b8' },
  { id: 'penguin', file: 'sticker-penguin.svg', raw: 1602, sha256: '7585a3d874033085e3cac20a3c568c0c2c0286aac202d7afec2f3e131859d7e8' },
  { id: 'panda', file: 'sticker-panda.svg', raw: 1515, sha256: 'd37910f92bc966847bf05562aff575e81224bdafdf6eff805c0f3eef8f3b17ea' },
  { id: 'fox', file: 'sticker-fox.svg', raw: 1209, sha256: 'cbc7bbcd6030682e5fe568a3307afc24229bce2054c43ab01e479bd690fbd479' },
  { id: 'whale', file: 'sticker-whale.svg', raw: 1118, sha256: 'c808953ed91265bc67ab12b6cfc4182856d2566149b798b6f90e0030e618c560' },
  { id: 'octopus', file: 'sticker-octopus.svg', raw: 1174, sha256: '54e63ae2ebdfe433bb5dabfc537eafbba3ff27a09c852c4a63520930f2359949' },
  { id: 'butterfly', file: 'sticker-butterfly.svg', raw: 1664, sha256: '822579a3a99cf3045824b78b46005ac65f6b95957c7397de492ea2c380bc70e7' },
  { id: 'ladybug', file: 'sticker-ladybug.svg', raw: 1483, sha256: 'd4c6ea3f06be8cb26b3911ecb44a2131340518aff63e503707473041b5ffe7e4' },
  { id: 'sunflower', file: 'sticker-sunflower.svg', raw: 2810, sha256: 'd8a2c3dd83b1b41db798939931f21115d45edff5c2b4e0ad7953e4717505db7c' },
  { id: 'rainbow', file: 'sticker-rainbow.svg', raw: 1371, sha256: '2532d00622d94cfc3f924ce80ea1b26f37666aeddeede8749f48c20e8c2531c3' },
  { id: 'moon', file: 'sticker-moon.svg', raw: 968, sha256: 'cb3dff1087fe49cf366b01d80c47e4831e2e557d75a1281fe3740b33397ab301' },
  { id: 'cherries', file: 'sticker-cherries.svg', raw: 1069, sha256: 'cec7720467a7b12c5c18a73bb7d671f97247f8d287ea0b01df7646fda5559b07' },
  { id: 'watermelon', file: 'sticker-watermelon.svg', raw: 1052, sha256: '3eb974623a7047bec7e71de2904a8036b30f3a94d2f20107d5eb334a99ae0161' },
  { id: 'icecream', file: 'sticker-icecream.svg', raw: 1083, sha256: '37a3d8b10c152bde9f54c65a062ea635c16507c75a08109661177e86ec15f87f' },
  { id: 'car', file: 'sticker-car.svg', raw: 1363, sha256: '0f6e742edeef59c19aa79739248569ad058033798b884e83a6f0c92a3432f9cd' },
  { id: 'sailboat', file: 'sticker-sailboat.svg', raw: 880, sha256: '4affc6e0ebe633110cd377b53310e95f3661320bdd909541431721cf047bf5e0' },
] as const

describe('贴纸资源', () => {
  it('25 枚 SVG 字节、sha256 与 manifest 一致，合计 33606，无 PNG', () => {
    const names = readdirSync(stickerDir)
    expect(names.every((name) => name.endsWith('.svg'))).toBe(true)
    expect(names.some((name) => name.endsWith('.png'))).toBe(false)
    expect(names).toHaveLength(25)
    let total = 0
    for (const asset of STICKER_ASSET_EXPECT) {
      expect(STICKER_IDS).toContain(asset.id)
      expect(STICKER_FILE[asset.id]).toBe(asset.file)
      const path = join(stickerDir, asset.file)
      const data = readFileSync(path)
      expect(data.byteLength).toBe(asset.raw)
      expect(data.byteLength).toBeLessThan(3000)
      expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256)
      total += data.byteLength
      expect(statSync(path).size).toBe(asset.raw)
    }
    expect(total).toBe(33606)
  })
})
