import { describe, expect, it } from 'vitest'
import {
  classifyInstallSurface,
  installGuide,
  isStandaloneNow,
  resolveInstallKind,
} from './installPrompt'

describe('安装表面', () => {
  it('识别微信、iOS 与其他', () => {
    expect(classifyInstallSurface('Mozilla/5.0 MicroMessenger')).toBe('wechat')
    expect(classifyInstallSurface('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
    expect(classifyInstallSurface('Mozilla/5.0 Chrome/120.0.0.0')).toBe('other')
  })

  it('standalone 只认当前独立窗口', () => {
    expect(isStandaloneNow({ userAgent: 'Chrome', standaloneFlag: true })).toBe(true)
    expect(
      isStandaloneNow({
        userAgent: 'Chrome',
        matchMedia: (query) => ({ matches: query.includes('display-mode: standalone') }),
      }),
    ).toBe(true)
    expect(isStandaloneNow({ userAgent: 'Chrome' })).toBe(false)
  })

  it('有可 prompt 事件才是 ready，否则给对应指引', () => {
    expect(resolveInstallKind('other', true)).toBe('ready')
    expect(resolveInstallKind('other', false)).toBe('guide')
    expect(resolveInstallKind('ios', true)).toBe('ios')
    expect(resolveInstallKind('wechat', true)).toBe('wechat')
    expect(installGuide('ios')).toContain('添加到主屏幕')
    expect(installGuide('wechat')).toContain('系统浏览器')
    expect(installGuide('guide')).toContain('菜单')
  })
})
