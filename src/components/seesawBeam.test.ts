import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import seesawBeam from './seesawBeam.vue'

function mountBeam(props: { left: number; right: number; tilt: number; motion: string }) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const vueApp = createApp(seesawBeam, props)
  vueApp.mount(el)
  return { el, vueApp }
}

describe('跷跷板反馈图形', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('答对中央大对勾和星光，不挡点击', () => {
    const { el, vueApp } = mountBeam({ left: 7, right: 7, tilt: 0, motion: 'cheer' })
    const overlay = el.querySelector('[data-feedback="ok"]') as HTMLElement | null
    expect(overlay).toBeTruthy()
    expect(overlay?.querySelectorAll('svg.spark')).toHaveLength(4)
    expect(overlay?.textContent?.trim()).toBe('')
    expect(overlay?.style.pointerEvents).toBe('none')
    expect(el.querySelector('[data-feedback="retry"]')).toBeFalsy()
    vueApp.unmount()
  })

  it('答错中央重试箭头，倾角仍按数量差', () => {
    const { el, vueApp } = mountBeam({ left: 7, right: 5, tilt: -14, motion: 'hold' })
    const stage = el.querySelector('[data-seesaw]')
    const overlay = el.querySelector('[data-feedback="retry"]') as HTMLElement | null
    expect(stage?.getAttribute('data-tilt')).toBe('-14')
    expect(overlay).toBeTruthy()
    expect(overlay?.querySelectorAll('svg.spark')).toHaveLength(0)
    expect(overlay?.textContent?.trim()).toBe('')
    expect(overlay?.style.pointerEvents).toBe('none')
    expect(el.querySelector('[data-feedback="ok"]')).toBeFalsy()
    vueApp.unmount()
  })

  it('回平过程不提前弹出对勾', () => {
    const { el, vueApp } = mountBeam({ left: 7, right: 7, tilt: 0, motion: 'level' })
    expect(el.querySelector('[data-feedback]')).toBeFalsy()
    vueApp.unmount()
  })
})
