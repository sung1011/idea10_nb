export type InstallSurface = 'wechat' | 'ios' | 'other'
export type InstallKind = 'ready' | 'guide' | 'ios' | 'wechat'

export type BeforeInstallPromptLike = {
  preventDefault(): void
  prompt(): Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallEnv = {
  userAgent: string
  standaloneFlag?: boolean
  matchMedia?: (query: string) => { matches: boolean }
}

export function isStandaloneNow(env: InstallEnv): boolean {
  if (env.standaloneFlag) return true
  try {
    if (env.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    // ignore
  }
  return false
}

export function classifyInstallSurface(userAgent: string): InstallSurface {
  const ua = userAgent.toLowerCase()
  if (ua.includes('micromessenger') || ua.includes('wxwork')) return 'wechat'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  return 'other'
}

export function resolveInstallKind(surface: InstallSurface, canPrompt: boolean): InstallKind {
  if (surface === 'wechat') return 'wechat'
  if (surface === 'ios') return 'ios'
  if (canPrompt) return 'ready'
  return 'guide'
}

export function installGuide(kind: InstallKind): string {
  if (kind === 'ready') return '点按钮后，用系统弹出的窗口安装。'
  if (kind === 'ios') return '在 Safari 点底部分享，再选「添加到主屏幕」。这里不能代为安装。'
  if (kind === 'wechat') return '请用系统浏览器（Safari 或 Chrome）打开后再添加到桌面。微信里不能安装。'
  return '浏览器还没准备好安装窗口。可用菜单里的「安装应用」或「添加到主屏幕」，也可以稍后再试。'
}
