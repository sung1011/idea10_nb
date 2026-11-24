import { createApp, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import app from './app.vue'
import { STORAGE_KEY } from './storage/appStorage'

function mountApp() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const vueApp = createApp(app)
  vueApp.mount(el)
  return { el, vueApp }
}

function button(el: HTMLElement, label: string) {
  const found = [...el.querySelectorAll('button')].find((node) => node.textContent?.trim() === label)
  if (!found) throw new Error(`missing button ${label}`)
  return found
}

describe('界面响应', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
  })

  it('点数字后答案格会变，设置页能打开', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    expect(el.textContent).toContain('第 1 / 5 题')
    expect(el.querySelector('.blank')?.textContent).toBe('?')

    button(el, '3').click()
    await nextTick()
    expect(el.querySelector('.blank')?.textContent).toBe('3')

    button(el, '设置').click()
    await nextTick()
    expect(el.textContent).toContain('家长设置')
    expect(el.textContent).toContain('练习次数')
    vueApp.unmount()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
