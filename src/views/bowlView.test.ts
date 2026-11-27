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

function keypad(el: HTMLElement) {
  return el.querySelector('.keypad')
}

describe('小老鼠盘面', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('加法 3+□=8：明盘 3、数字 8、袋子盖着；选数盘面不变，数字靠袋旁，键盘在下', async () => {
    const play = ten({ a: 3, b: 5, op: '+', answer: 8 })
    const { el, vueApp } = mountBowl(play)
    expect(el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(el.querySelector('[data-bowl-total]')?.textContent?.trim()).toBe('8')
    expect(el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(el.querySelector('[data-mouse]')).toBeTruthy()
    expect(el.querySelector('[data-sack]')).toBeTruthy()
    expect(el.querySelector('[data-revealed]')).toBeFalsy()
    expect(el.querySelector('[data-progress]')?.textContent).toBe('第 1 / 10 题')
    expect(el.querySelector('[data-bag-input] .blank')?.textContent).toBe('?')
    expect(el.querySelector('[data-bowl]')?.contains(el.querySelector('[data-bag-input]'))).toBe(true)
    expect(el.querySelector('[data-bowl]')?.contains(keypad(el))).toBe(false)
    expect(keypad(el)?.previousElementSibling?.hasAttribute('data-bowl')).toBe(true)
    tapBowlDigit(play, '5')
    vueApp.unmount()
    const again = mountBowl(play)
    expect(again.el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(again.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(again.el.querySelector('[data-revealed]')).toBeFalsy()
    expect(again.el.querySelector('[data-bag-input] .blank')?.textContent).toBe('5')
    expect(again.el.querySelector('[data-bowl]')?.contains(keypad(again.el))).toBe(false)
    again.vueApp.unmount()
  })

  it('减法 8−□=3：明盘 3、数字 8、袋子盖着；确认后揭开 5 颗', async () => {
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

  it('0 题揭开后是空袋', async () => {
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

  it('开场先出示全部豆子，装袋时整团离开明面；开场不显示输入', async () => {
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
    expect(first.el.querySelector('[data-bag-input]')).toBeFalsy()
    tapBowlDigit(play, '5')
    first.vueApp.unmount()
    const typed = mountBowl(play)
    expect(typed.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('8')
    expect(typed.el.querySelector('[data-take]')?.getAttribute('data-count')).toBe('5')
    expect(typed.el.querySelector('[data-bag-input]')).toBeFalsy()
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
    expect(cover.el.querySelector('[data-bag-input]')).toBeFalsy()
    expect(confirmButton(cover.el)?.disabled).toBe(true)
    play.intro = ''
    cover.vueApp.unmount()
    const idle = mountBowl(play)
    expect(idle.el.querySelector('[data-bowl]')?.getAttribute('data-intro')).toBe('idle')
    expect(idle.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('3')
    expect(idle.el.querySelector('[data-take]')).toBeFalsy()
    expect(idle.el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(idle.el.querySelector('[data-bag-input] .blank')?.textContent).toBe('5')
    expect(idle.el.querySelector('[data-bowl]')?.contains(idle.el.querySelector('[data-bag-input]'))).toBe(
      true,
    )
    expect(confirmButton(idle.el)?.disabled).toBe(false)
    expect(keypad(idle.el)?.previousElementSibling?.hasAttribute('data-bowl')).toBe(true)
    idle.vueApp.unmount()
  })

  it('0 变化题老鼠入场但不带走豆子', async () => {
    const play = ten({ a: 5, b: 0, op: '+', answer: 5 })
    play.intro = 'bounce'
    const bounce = mountBowl(play)
    expect(bounce.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('5')
    expect(bounce.el.querySelector('[data-take]')).toBeFalsy()
    expect(bounce.el.querySelectorAll('[data-visible] .bean').length).toBe(5)
    expect(bounce.el.querySelector('[data-bag-input]')).toBeFalsy()
    play.intro = 'cover'
    bounce.vueApp.unmount()
    const cover = mountBowl(play)
    expect(cover.el.querySelector('[data-pile]')?.getAttribute('data-count')).toBe('5')
    expect(cover.el.querySelector('[data-take]')).toBeFalsy()
    expect(cover.el.querySelectorAll('[data-visible] .bean').length).toBe(5)
    expect(cover.el.querySelector('[data-mouse]')).toBeTruthy()
    cover.vueApp.unmount()
  })

  it('答错不揭袋，豆子保持装走后的静止', async () => {
    const play = ten({ a: 3, b: 5, op: '+', answer: 8 })
    tapBowlDigit(play, '2')
    confirmBowl(play)
    const { el, vueApp } = mountBowl(play)
    expect(el.querySelector('[data-bowl]')?.getAttribute('data-lid')).toBe('closed')
    expect(el.querySelector('[data-revealed]')).toBeFalsy()
    expect(el.querySelector('[data-visible]')?.getAttribute('data-count')).toBe('3')
    expect(el.querySelector('[data-bowl]')?.getAttribute('data-motion')).toBe('shake')
    vueApp.unmount()
  })
})
