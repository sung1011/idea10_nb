import { createApp, reactive } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { confirmBowl, createBowlPlay, tapBowlDigit } from '../logic/bowlMove'
import bowlView from './bowlView.vue'

function ten(first: { a: number; b: number; op: '+' | '-'; answer: number }) {
  return createBowlPlay([
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

function mountBowl(play: ReturnType<typeof createBowlPlay>) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const state = reactive(play)
  const vueApp = createApp(bowlView, { play: state })
  vueApp.mount(el)
  return { el, vueApp, play: state }
}

function confirmButton(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLButtonElement>('.keypad button')].find(
    (node) => node.getAttribute('aria-label') === '确定',
  )
}

describe('盖碗盘面', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('加法 3+□=8：明盘 3、数字 8、碗盖着；选数盘面不变', async () => {
    const play = ten({ a: 3, b: 5, op: '+', answer: 8 })
    const { el, vueApp } = mountBowl(play)
    expect(el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(el.querySelector('[data-bowl-total]')?.textContent?.trim()).toBe('8')
    expect(el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(el.querySelector('[data-revealed]')).toBeFalsy()
    expect(el.querySelector('[data-progress]')?.textContent).toBe('第 1 / 10 题')
    tapBowlDigit(play, '5')
    vueApp.unmount()
    const again = mountBowl(play)
    expect(again.el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(again.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(again.el.querySelector('[data-revealed]')).toBeFalsy()
    expect(again.el.querySelector('.blank')?.textContent).toBe('5')
    again.vueApp.unmount()
  })

  it('减法 8−□=3：明盘 3、数字 8、碗盖着；确认后揭开 5 颗', async () => {
    const play = ten({ a: 8, b: 5, op: '-', answer: 3 })
    const { el, vueApp } = mountBowl(play)
    expect(el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(el.querySelector('[data-bowl-total]')?.textContent?.trim()).toBe('8')
    expect(el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    tapBowlDigit(play, '5')
    confirmBowl(play)
    vueApp.unmount()
    const again = mountBowl(play)
    expect(again.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('open')
    expect(again.el.querySelector('[data-revealed]')?.getAttribute('data-count')).toBe('5')
    expect(again.el.querySelectorAll('[data-revealed] .bean').length).toBe(5)
    expect(again.el.querySelectorAll('[data-visible] .bean').length).toBe(3)
    again.vueApp.unmount()
  })

  it('0 题揭开后是空碗', async () => {
    const play = ten({ a: 5, b: 0, op: '+', answer: 5 })
    const { el, vueApp } = mountBowl(play)
    expect(el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('5')
    expect(el.querySelector('[data-bowl-total]')?.textContent?.trim()).toBe('5')
    tapBowlDigit(play, '0')
    confirmBowl(play)
    vueApp.unmount()
    const again = mountBowl(play)
    expect(again.el.querySelector('[data-revealed]')?.getAttribute('data-count')).toBe('0')
    expect(again.el.querySelectorAll('[data-revealed] .bean').length).toBe(0)
    again.vueApp.unmount()
  })

  it('开场先出示全部豆子，扣碗时整团离开明面', async () => {
    const play = ten({ a: 3, b: 5, op: '+', answer: 8 })
    play.intro = 'bounce'
    const first = mountBowl(play)
    expect(first.el.querySelector('[data-bowl]')?.getAttribute('data-intro')).toBe('bounce')
    expect(first.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('8')
    expect(first.el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(first.el.querySelector('[data-take]')?.getAttribute('data-count')).toBe('5')
    expect(first.el.querySelectorAll('[data-take] .bean').length).toBe(5)
    expect(first.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('away')
    expect(first.el.querySelector('[data-bowl-total]')?.textContent?.trim()).toBe('8')
    tapBowlDigit(play, '5')
    first.vueApp.unmount()
    const typed = mountBowl(play)
    expect(typed.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('8')
    expect(typed.el.querySelector('[data-take]')?.getAttribute('data-count')).toBe('5')
    expect(typed.el.querySelector('.blank')?.textContent).toBe('5')
    expect(confirmButton(typed.el)?.disabled).toBe(true)
    play.intro = 'cover'
    typed.vueApp.unmount()
    const cover = mountBowl(play)
    expect(cover.el.querySelector('[data-bowl]')?.getAttribute('data-intro')).toBe('cover')
    expect(cover.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('3')
    expect(cover.el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(cover.el.querySelectorAll('[data-visible] .bean').length).toBe(3)
    expect(cover.el.querySelector('[data-take]')?.getAttribute('data-count')).toBe('5')
    expect(cover.el.querySelectorAll('[data-take] .bean').length).toBe(5)
    expect(confirmButton(cover.el)?.disabled).toBe(true)
    play.intro = ''
    cover.vueApp.unmount()
    const idle = mountBowl(play)
    expect(idle.el.querySelector('[data-bowl]')?.getAttribute('data-intro')).toBe('idle')
    expect(idle.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('3')
    expect(idle.el.querySelector('[data-take]')).toBeFalsy()
    expect(idle.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(confirmButton(idle.el)?.disabled).toBe(false)
    idle.vueApp.unmount()
  })

  it('0 变化题扣碗不带走豆子', async () => {
    const play = ten({ a: 5, b: 0, op: '+', answer: 5 })
    play.intro = 'bounce'
    const bounce = mountBowl(play)
    expect(bounce.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('5')
    expect(bounce.el.querySelector('[data-take]')).toBeFalsy()
    expect(bounce.el.querySelectorAll('[data-visible] .bean').length).toBe(5)
    play.intro = 'cover'
    bounce.vueApp.unmount()
    const cover = mountBowl(play)
    expect(cover.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('5')
    expect(cover.el.querySelector('[data-take]')).toBeFalsy()
    expect(cover.el.querySelectorAll('[data-visible] .bean').length).toBe(5)
    cover.vueApp.unmount()
  })
})
