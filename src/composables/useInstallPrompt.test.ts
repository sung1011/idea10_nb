import { describe, expect, it } from 'vitest'
import { createInstallController, type InstallListener } from './useInstallPrompt'

type Handler = (event: Event) => void

function fakeTarget() {
  const map = new Map<string, Set<Handler>>()
  const target: InstallListener & { emit(type: string, event: Event): void } = {
    addEventListener(type, handler) {
      if (!map.has(type)) map.set(type, new Set())
      map.get(type)!.add(handler)
    },
    removeEventListener(type, handler) {
      map.get(type)?.delete(handler)
    },
    emit(type, event) {
      for (const handler of map.get(type) ?? []) handler(event)
    },
  }
  return { target, map }
}

function fakePrompt(options: { outcome?: 'accepted' | 'dismissed'; hold?: () => Promise<void>; fail?: boolean } = {}) {
  let calls = 0
  const promptEvent = {
    preventDefault() {},
    prompt: async () => {
      calls += 1
      if (options.fail) throw new Error('prompt fail')
      if (options.hold) await options.hold()
    },
    userChoice: Promise.resolve({ outcome: options.outcome ?? 'dismissed' }),
    get calls() {
      return calls
    },
  }
  return promptEvent
}

describe('安装控制器', () => {
  it('未确认安装时显示入口；standalone 或 appinstalled 才隐藏', () => {
    const standalone = createInstallController({
      env: () => ({ userAgent: 'Chrome', standaloneFlag: true }),
    })
    standalone.start()
    expect(standalone.showInstall.value).toBe(false)

    const { target } = fakeTarget()
    const live = createInstallController({
      env: () => ({ userAgent: 'Chrome' }),
      target,
    })
    live.start()
    expect(live.showInstall.value).toBe(true)
    target.emit('appinstalled', new Event('appinstalled'))
    expect(live.showInstall.value).toBe(false)
    live.stop()
  })

  it('有 beforeinstallprompt 时点击才 prompt，取消后入口仍在且不能再调同一事件', async () => {
    const { target } = fakeTarget()
    const promptEvent = fakePrompt({ outcome: 'dismissed' })
    const controller = createInstallController({
      env: () => ({ userAgent: 'Chrome' }),
      target,
    })
    controller.start()
    target.emit('beforeinstallprompt', promptEvent as unknown as Event)
    expect(controller.kind.value).toBe('ready')
    expect(controller.showInstall.value).toBe(true)
    await controller.requestInstall()
    expect(promptEvent.calls).toBe(1)
    expect(controller.showInstall.value).toBe(true)
    await controller.requestInstall()
    expect(promptEvent.calls).toBe(1)
    controller.stop()
  })

  it('prompt 异常后入口仍在，事件已消费', async () => {
    const { target } = fakeTarget()
    const promptEvent = fakePrompt({ fail: true })
    const controller = createInstallController({
      env: () => ({ userAgent: 'Chrome' }),
      target,
    })
    controller.start()
    target.emit('beforeinstallprompt', promptEvent as unknown as Event)
    await controller.requestInstall()
    expect(promptEvent.calls).toBe(1)
    expect(controller.showInstall.value).toBe(true)
    await controller.requestInstall()
    expect(promptEvent.calls).toBe(1)
    controller.stop()
  })

  it('重复点击在对话框进行中只 prompt 一次', async () => {
    const { target } = fakeTarget()
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const promptEvent = fakePrompt({ hold: () => held })
    const controller = createInstallController({
      env: () => ({ userAgent: 'Chrome' }),
      target,
    })
    controller.start()
    target.emit('beforeinstallprompt', promptEvent as unknown as Event)
    const first = controller.requestInstall()
    const second = controller.requestInstall()
    expect(controller.prompting.value).toBe(true)
    release()
    await Promise.all([first, second])
    expect(promptEvent.calls).toBe(1)
    controller.stop()
  })

  it('无事件时 iOS / 微信给指引且不调用 prompt', async () => {
    const ios = createInstallController({
      env: () => ({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari' }),
    })
    ios.start()
    expect(ios.showInstall.value).toBe(true)
    expect(ios.kind.value).toBe('ios')
    expect(ios.guide.value).toContain('添加到主屏幕')
    await ios.requestInstall()
    expect(ios.showInstall.value).toBe(true)

    const wechat = createInstallController({
      env: () => ({ userAgent: 'Mozilla/5.0 MicroMessenger' }),
    })
    wechat.start()
    expect(wechat.kind.value).toBe('wechat')
    expect(wechat.guide.value).toContain('系统浏览器')
    ios.stop()
    wechat.stop()
  })

  it('stop 后不再接收事件', () => {
    const { target, map } = fakeTarget()
    const controller = createInstallController({
      env: () => ({ userAgent: 'Chrome' }),
      target,
    })
    controller.start()
    controller.stop()
    expect(map.get('beforeinstallprompt')?.size ?? 0).toBe(0)
    target.emit('beforeinstallprompt', fakePrompt() as unknown as Event)
    expect(controller.deferred.value).toBeNull()
  })
})
