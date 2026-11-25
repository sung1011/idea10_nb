import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import stickerCard from './stickerCard.vue'

function mountCard(props: { stickerId?: string; emoji?: string }) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const vueApp = createApp(stickerCard, props)
  vueApp.mount(el)
  return { el, vueApp }
}

describe('stickerCard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('SVG 贴纸用 base 路径，旧 emoji 仍可显示', () => {
    const svg = mountCard({ stickerId: 'star' })
    const img = svg.el.querySelector('img.art') as HTMLImageElement | null
    expect(svg.el.querySelector('[data-sticker="star"]')).toBeTruthy()
    expect(img?.getAttribute('src')).toBe('/idea10_nb/stickers/sticker-star.svg')
    svg.vueApp.unmount()
    const emoji = mountCard({ emoji: '🌸' })
    expect(emoji.el.querySelector('[data-sticker="🌸"]')?.textContent).toContain('🌸')
    expect(emoji.el.querySelector('img')).toBeFalsy()
    emoji.vueApp.unmount()
  })
})
