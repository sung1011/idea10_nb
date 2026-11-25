import { createApp, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import app from './app.vue'
import { STORAGE_KEY } from './storage/appStorage'

const newerRemote = [
  { id: 'v0.7.0', version: '0.7.0', date: '2026-11-28', summary: '测试用更新' },
  { id: 'v0.6.1', version: '0.6.1', date: '2026-11-25', summary: '目标只显示数字，巴士开走' },
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

function byAria(el: HTMLElement, label: string) {
  const found = el.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null
  if (!found) throw new Error(`missing aria ${label}`)
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

  it('点数字后答案格会变，设置页默认题目，切更新后返回仍保留输入', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    expect(el.textContent).toContain('第 1 / 10 题')
    expect(el.querySelector('.blank')?.textContent).toBe('?')

    button(el, '3').click()
    await nextTick()
    expect(el.querySelector('.blank')?.textContent).toBe('3')

    button(el, '设置').click()
    await nextTick()
    expect(el.textContent).toContain('题目')
    expect(el.textContent).toContain('更新')
    expect(el.textContent).toContain('练习次数')
    expect(el.textContent).toContain('加法')

    button(el, '更新').click()
    await flush()
    expect(el.textContent).toContain('当前版本')
    expect(el.textContent).toContain('安装到桌面')
    expect(el.querySelector('[data-install-kind]')).toBeTruthy()

    button(el, '题目').click()
    await nextTick()
    expect(el.textContent).toContain('练习次数')
    button(el, '返回').click()
    await nextTick()
    expect(el.querySelector('.blank')?.textContent).toBe('3')
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
    expect(el.textContent).toContain('0.7.0')
    expect(el.querySelector('.popover')).toBeTruthy()
    expect(el.querySelector('.sticky')?.textContent).toContain('更新')
    expect([...el.querySelectorAll('button')].some((node) => node.textContent?.trim() === '3')).toBe(true)

    button(el, '设置').click()
    await nextTick()
    expect(el.querySelector('.popover')).toBeNull()
    expect(el.textContent).toContain('题目')

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

  it('设置的更新页对未完成轮次也要确认', async () => {
    const replaced: string[] = []
    vi.spyOn(window.location, 'replace').mockImplementation((url) => {
      replaced.push(String(url))
    })
    const { el, vueApp } = mountApp()
    await flush()
    button(el, '3').click()
    await nextTick()
    button(el, '设置').click()
    await nextTick()
    button(el, '更新').click()
    await flush()
    const action = el.querySelector('.update-box .install') as HTMLButtonElement | null
    expect(action?.textContent?.trim()).toBe('更新')
    action?.click()
    await nextTick()
    expect(el.textContent).toContain('当前这轮会重新开始')
    expect(replaced).toEqual([])
    button(el, '取消').click()
    await nextTick()
    button(el, '题目').click()
    await nextTick()
    button(el, '返回').click()
    await nextTick()
    expect(el.querySelector('.blank')?.textContent).toBe('3')
    vueApp.unmount()
  })

  it('顶栏坐车与算术切换保留输入，设置能看到坐车统计', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    button(el, '3').click()
    await nextTick()
    byAria(el, '坐车').click()
    await nextTick()
    expect(el.querySelector('[data-depart]')).toBeTruthy()
    expect(el.querySelectorAll('[data-seat]').length).toBe(10)
    expect(el.querySelectorAll('[data-stop]').length).toBe(5)
    expect(el.querySelector('[data-target]')).toBeTruthy()
    expect(el.querySelector('[data-target] svg')).toBeFalsy()
    expect(el.querySelector('[data-target]')?.textContent?.trim()).toMatch(/^\d+$/)
    expect(el.querySelector('[data-cab]')).toBeTruthy()
    expect(el.querySelectorAll('[data-tire]').length).toBe(2)
    expect(el.querySelectorAll('[data-lamp]').length).toBe(2)
    const child = el.querySelector('.bus')?.textContent ?? ''
    expect(child).not.toMatch(/发车|候车|少了|小帮手|喇叭|撤回|本站重来/)
    byAria(el, '算术').click()
    await nextTick()
    expect(el.querySelector('.blank')?.textContent).toBe('3')
    button(el, '设置').click()
    await nextTick()
    expect(el.textContent).toContain('坐车次数 0')
    expect(el.textContent).toContain('独立完成 0')
    vueApp.unmount()
  })

  it('坐车有进展时更新要确认；完成页不无谓确认', async () => {
    const replaced: string[] = []
    vi.spyOn(window.location, 'replace').mockImplementation((url) => {
      replaced.push(String(url))
    })
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
      onchange: null,
    }))
    const { el, vueApp } = mountApp()
    await flush()
    byAria(el, '坐车').click()
    await nextTick()
    const waiting = el.querySelector('[data-waiting]') as HTMLButtonElement | null
    const filled = el.querySelector('[data-animal]:not([data-animal=""])') as HTMLButtonElement | null
    ;(waiting ?? filled)?.click()
    await nextTick()
    button(el, '更新').click()
    await nextTick()
    expect(el.textContent).toContain('当前这轮会重新开始')
    expect(replaced).toEqual([])
    vueApp.unmount()
  })
})

function occupiedSeats(el: HTMLElement) {
  return [...el.querySelectorAll('[data-seat]')].filter((node) => node.getAttribute('data-animal')).length
}

async function waitCabinIdle(el: HTMLElement) {
  const start = Date.now()
  while (Date.now() - start < 2500) {
    if (el.querySelector('[data-again]')) return
    const cabin = el.querySelector('[data-cabin]')
    if (!cabin) return
    const motion = cabin.getAttribute('data-motion')
    if (!motion || motion === 'idle') {
      await nextTick()
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 30))
    await nextTick()
  }
}

async function playOneStop(el: HTMLElement, wait = true) {
  const target = Number(el.querySelector('[data-target]')?.getAttribute('data-target'))
  if (!Number.isFinite(target)) throw new Error('no target')
  const board = el.querySelector('[data-kind="board"]')
  if (board) {
    while (occupiedSeats(el) < target) {
      const waiting = el.querySelector('[data-waiting]') as HTMLButtonElement | null
      if (!waiting) throw new Error('no waiting')
      waiting.click()
      await nextTick()
    }
    while (occupiedSeats(el) > target) {
      const fresh = el.querySelector('[data-kind="fresh"]') as HTMLButtonElement | null
      if (!fresh) throw new Error('no fresh')
      fresh.click()
      await nextTick()
    }
  } else {
    while (occupiedSeats(el) > target) {
      const seat = [...el.querySelectorAll('[data-seat]')].find((node) => node.getAttribute('data-animal')) as
        | HTMLButtonElement
        | undefined
      if (!seat) throw new Error('no seat')
      seat.click()
      await nextTick()
    }
    while (occupiedSeats(el) < target) {
      const off = el.querySelector('[data-off]') as HTMLButtonElement | null
      if (!off) throw new Error('no off')
      off.click()
      await nextTick()
    }
  }
  const depart = el.querySelector('[data-depart]') as HTMLButtonElement | null
  if (!depart) throw new Error('no depart')
  depart.click()
  await nextTick()
  if (wait) await waitCabinIdle(el)
}

describe('坐车界面整局', () => {
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
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
      onchange: null,
    }))
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('故意错一次、提示一次后走完五站，统计只加一次', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    byAria(el, '坐车').click()
    await nextTick()
    const depart = el.querySelector('[data-depart]') as HTMLButtonElement
    depart.click()
    await nextTick()
    expect(el.querySelector('[data-motion="leave"], [data-motion="flash"]')).toBeFalsy()
    expect(el.querySelector('[data-cue="board-more"], [data-cue="board-back"], [data-cue="alight-more"], [data-cue="alight-back"]')).toBeTruthy()
    expect(el.querySelector('.bus')?.textContent).not.toMatch(/少了|多了/)
    const targetBtn = el.querySelector('[data-target]') as HTMLButtonElement
    targetBtn.click()
    await nextTick()
    expect(el.querySelector('[data-help]')).toBeTruthy()
    expect(el.querySelector('[data-help-slot]')).toBeTruthy()
    for (let i = 0; i < 5; i += 1) {
      await playOneStop(el)
    }
    expect(el.querySelector('[data-again]')).toBeTruthy()
    expect(el.textContent).not.toContain('车票')
    button(el, '设置').click()
    await nextTick()
    expect(el.textContent).toContain('坐车次数 1')
    expect(el.textContent).toContain('独立完成 0')
    expect(el.textContent).toContain('调整次数 1')
    expect(el.textContent).toContain('坐车提示 1')
    vueApp.unmount()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').busTripsCompleted).toBe(1)
  })
})

describe('坐车动画与撤回', () => {
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

  it('点刚上车的动物能退回候车', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    byAria(el, '坐车').click()
    await nextTick()
    if (!el.querySelector('[data-kind="board"]')) {
      vueApp.unmount()
      return
    }
    const before = occupiedSeats(el)
    const waiting = el.querySelector('[data-waiting]') as HTMLButtonElement
    waiting.click()
    await nextTick()
    expect(occupiedSeats(el)).toBe(before + 1)
    const fresh = el.querySelector('[data-kind="fresh"]') as HTMLButtonElement
    fresh.click()
    await nextTick()
    expect(occupiedSeats(el)).toBe(before)
    vueApp.unmount()
  })

  it('正常动画发车后会锁住并过站', async () => {
    const { el, vueApp } = mountApp()
    await nextTick()
    byAria(el, '坐车').click()
    await nextTick()
    const firstTarget = el.querySelector('[data-target]')?.getAttribute('data-target')
    await playOneStop(el, false)
    const wheel = el.querySelector('[data-depart]') as HTMLButtonElement
    expect(wheel.disabled || el.querySelector('[data-motion="leave"]')).toBeTruthy()
    expect(el.querySelector('[data-target] svg')).toBeFalsy()
    await waitCabinIdle(el)
    await nextTick()
    const laterTarget = el.querySelector('[data-target]')?.getAttribute('data-target')
    const again = el.querySelector('[data-again]')
    const idle = el.querySelector('[data-motion="idle"]')
    expect(Boolean(again) || Boolean(idle) || laterTarget !== firstTarget).toBe(true)
    vueApp.unmount()
  })
})


