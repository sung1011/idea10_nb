import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { createSeesawPlay, tiltDeg } from '../logic/seesawMove'
import seesawView from './seesawView.vue'

function ten(first: { a: number; b: number; op: '+' | '-'; answer: number }) {
  return createSeesawPlay([
    first,
    { a: 1, b: 1, op: '+', answer: 2 },
    { a: 2, b: 1, op: '+', answer: 3 },
    { a: 3, b: 1, op: '+', answer: 4 },
    { a: 4, b: 1, op: '+', answer: 5 },
    { a: 5, b: 1, op: '+', answer: 6 },
    { a: 6, b: 1, op: '+', answer: 7 },
    { a: 2, b: 2, op: '+', answer: 4 },
    { a: 3, b: 2, op: '+', answer: 5 },
    { a: 4, b: 2, op: '+', answer: 6 },
  ])
}

function mountSeesaw(play: ReturnType<typeof createSeesawPlay>) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const vueApp = createApp(seesawView, { play })
  vueApp.mount(el)
  return { el, vueApp }
}

describe('跷跷板盘面与算式', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('3+□=8 开题左 3 右 8 右沉，目标在右盘', () => {
    const play = ten({ a: 3, b: 5, op: '+', answer: 8 })
    const { el, vueApp } = mountSeesaw(play)
    expect(el.querySelector('[data-pan="left"]')?.getAttribute('data-count')).toBe('3')
    expect(el.querySelector('[data-pan="right"]')?.getAttribute('data-count')).toBe('8')
    expect(el.querySelector('[data-seesaw]')?.getAttribute('data-tilt')).toBe(String(tiltDeg(3, 8)))
    expect(Number(el.querySelector('[data-seesaw]')?.getAttribute('data-tilt'))).toBeGreaterThan(0)
    expect(el.querySelector('[data-right-target]')?.textContent?.trim()).toBe('8')
    expect(el.querySelector('[data-left-target]')).toBeFalsy()
    expect(el.querySelector('.eq')?.textContent?.replace(/\s/g, '')).toContain('3+?=8')
    vueApp.unmount()
  })

  it('8−□=3 开题左 8 右 3 左沉', () => {
    const play = ten({ a: 8, b: 5, op: '-', answer: 3 })
    const { el, vueApp } = mountSeesaw(play)
    expect(el.querySelector('[data-pan="left"]')?.getAttribute('data-count')).toBe('8')
    expect(el.querySelector('[data-pan="right"]')?.getAttribute('data-count')).toBe('3')
    expect(Number(el.querySelector('[data-seesaw]')?.getAttribute('data-tilt'))).toBeLessThan(0)
    expect(el.querySelector('[data-right-target]')?.textContent?.trim()).toBe('3')
    vueApp.unmount()
  })
})
