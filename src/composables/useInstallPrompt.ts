import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  classifyInstallSurface,
  installGuide,
  isStandaloneNow,
  resolveInstallKind,
  type BeforeInstallPromptLike,
  type InstallEnv,
  type InstallKind,
} from '../logic/installPrompt'

export type InstallListener = {
  addEventListener(type: string, handler: (event: Event) => void): void
  removeEventListener(type: string, handler: (event: Event) => void): void
}

export function createInstallController(options: {
  env?: () => InstallEnv
  target?: InstallListener
  matchMedia?: (query: string) => { matches: boolean; addEventListener?: (type: string, handler: () => void) => void; removeEventListener?: (type: string, handler: () => void) => void }
}) {
  const envOf = options.env ?? (() => ({
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    standaloneFlag: typeof navigator !== 'undefined' && 'standalone' in navigator ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone) : false,
    matchMedia: typeof window === 'undefined' ? undefined : (query: string) => window.matchMedia(query),
  }))
  const target = options.target ?? (typeof window === 'undefined' ? undefined : window)

  const deferred = ref<BeforeInstallPromptLike | null>(null)
  const installed = ref(false)
  const prompting = ref(false)

  function readStandalone() {
    return isStandaloneNow(envOf())
  }

  function refreshInstalled() {
    if (readStandalone()) installed.value = true
  }

  const showInstall = computed(() => !installed.value)
  const kind = computed<InstallKind>(() =>
    resolveInstallKind(classifyInstallSurface(envOf().userAgent), deferred.value != null),
  )
  const guide = computed(() => installGuide(kind.value))

  function onBeforeInstall(event: Event) {
    const promptEvent = event as Event & BeforeInstallPromptLike
    if (typeof promptEvent.prompt !== 'function') return
    promptEvent.preventDefault()
    deferred.value = promptEvent
  }

  function onAppInstalled() {
    installed.value = true
    deferred.value = null
    prompting.value = false
  }

  function onStandaloneChange() {
    refreshInstalled()
  }

  async function requestInstall() {
    if (!showInstall.value || prompting.value) return
    if (classifyInstallSurface(envOf().userAgent) === 'wechat') return
    const current = deferred.value
    if (!current) return
    prompting.value = true
    deferred.value = null
    try {
      await current.prompt()
      if (current.userChoice) await current.userChoice
    } catch {
      // 取消或异常：事件已消费，不能再 prompt
    } finally {
      prompting.value = false
    }
  }

  const media =
    options.matchMedia?.('(display-mode: standalone)') ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : undefined)

  function start() {
    refreshInstalled()
    target?.addEventListener('beforeinstallprompt', onBeforeInstall)
    target?.addEventListener('appinstalled', onAppInstalled)
    media?.addEventListener?.('change', onStandaloneChange)
  }

  function stop() {
    target?.removeEventListener('beforeinstallprompt', onBeforeInstall)
    target?.removeEventListener('appinstalled', onAppInstalled)
    media?.removeEventListener?.('change', onStandaloneChange)
  }

  return {
    deferred,
    installed,
    prompting,
    showInstall,
    kind,
    guide,
    requestInstall,
    start,
    stop,
    refreshInstalled,
  }
}

export function useInstallPrompt() {
  const controller = createInstallController({})
  onMounted(() => {
    controller.start()
  })
  onUnmounted(() => {
    controller.stop()
  })
  return controller
}
