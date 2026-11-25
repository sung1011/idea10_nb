import { createApp, nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import playSwitch from './playSwitch.vue'
import type { PlayKind } from '../logic/playKind'

function mountSwitch(value: PlayKind, onChange: (kind: PlayKind) => void = () => {}) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const vueApp = createApp(playSwitch, {
    value,
    onChange,
  })
  vueApp.mount(el)
  return { el, vueApp }
}

describe('玩法下拉', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('原生 select 的 value 仍是玩法 id，文案带系统 emoji', async () => {
    const { el, vueApp } = mountSwitch('practice')
    const select = el.querySelector('[data-play-switch]') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.getAttribute('aria-label')).toBe('玩法')
    expect([...select.options].map((item) => item.value)).toEqual(['practice', 'bus', 'seesaw'])
    expect([...select.options].map((item) => item.textContent?.trim())).toEqual(['➕ 算式', '🚌 坐车', '⚖️ 跷跷板'])
    expect(select.value).toBe('practice')
    expect(select.options[select.selectedIndex]?.textContent?.trim()).toBe('➕ 算式')
    vueApp.unmount()

    const bus = mountSwitch('bus')
    const busSelect = bus.el.querySelector('[data-play-switch]') as HTMLSelectElement
    expect(busSelect.value).toBe('bus')
    expect(busSelect.options[busSelect.selectedIndex]?.textContent?.trim()).toBe('🚌 坐车')
    bus.vueApp.unmount()

    const seesaw = mountSwitch('seesaw')
    const seesawSelect = seesaw.el.querySelector('[data-play-switch]') as HTMLSelectElement
    expect(seesawSelect.value).toBe('seesaw')
    expect(seesawSelect.options[seesawSelect.selectedIndex]?.textContent?.trim()).toBe('⚖️ 跷跷板')
    seesawSelect.value = 'practice'
    seesawSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    expect(seesawSelect.value).toBe('practice')
    seesaw.vueApp.unmount()
  })
})
