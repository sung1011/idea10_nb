import { createApp, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import app from './app.vue'
import { STORAGE_KEY } from './storage/appStorage'

const newerRemote = [
  { id: 'v0.3.0', version: '0.3.0', date: '2026-11-25', summary: '新功能' },
  { id: 'v0.2.0', version: '0.2.0', date: '2026-11-24', summary: '十题' },
]

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

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('界面响应', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => newerRemote,
      })),
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('点数字后答案格会变，设置页能打开', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    expect(el.textContent).toContain('第 1 / 10 题')
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

  it('远端更新时设置下出现 popover，设置页隐藏；首题空白可直接更新', async () => {
    const replaced: string[] = []
    vi.spyOn(window.location, 'replace').mockImplementation((url) => {
      replaced.push(String(url))
    })
    const { el, vueApp } = mountApp()
    await flush()
    expect(el.textContent).toContain('更新')
    expect(el.textContent).toContain('0.3.0')
    expect(el.querySelector('.popover')).toBeTruthy()
    expect(el.querySelector('.sticky')?.textContent).toContain('更新')
    expect([...el.querySelectorAll('button')].some((node) => node.textContent?.trim() === '3')).toBe(true)

    button(el, '设置').click()
    await nextTick()
    expect(el.querySelector('.popover')).toBeNull()
    expect(el.textContent).toContain('家长设置')

    button(el, '返回').click()
    await nextTick()
    expect(el.querySelector('.popover')).toBeTruthy()

    button(el, '更新').click()
    await nextTick()
    expect(replaced.some((href) => href.includes('_reload='))).toBe(true)
    vueApp.unmount()
  })

  it('做题中更新需确认，取消不刷新', async () => {
    const replaced: string[] = []
    vi.spyOn(window.location, 'replace').mockImplementation((url) => {
      replaced.push(String(url))
    })
    const { el, vueApp } = mountApp()
    await flush()
    button(el, '3').click()
    await nextTick()
    button(el, '更新').click()
    await nextTick()
    expect(el.textContent).toContain('当前这轮会重新开始')
    expect(replaced).toEqual([])

    button(el, '取消').click()
    await nextTick()
    expect(el.textContent).not.toContain('当前这轮会重新开始')
    expect(replaced).toEqual([])
    expect(el.querySelector('.blank')?.textContent).toBe('3')

    button(el, '更新').click()
    await nextTick()
    button(el, '确定更新').click()
    await nextTick()
    expect(replaced.some((href) => href.includes('_reload='))).toBe(true)
    vueApp.unmount()
  })
})
