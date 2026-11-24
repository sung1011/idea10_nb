import { onMounted, onUnmounted, ref } from 'vue'
import {
  ACKED_VERSION_KEY,
  groupVersions,
  parseVersions,
  pendingGroups,
  stripReloadParam,
  versionsUrl,
  withReloadParam,
  writeAcked,
  type VersionGroup,
} from '../logic/appVersion'

export const POLL_MS = 10_000

export type VersionFetch = (url: string, init?: RequestInit) => Promise<Response>
export type VersionReloader = (href: string) => void

function pendingSignature(groups: VersionGroup[]): string {
  return groups.map((group) => `${group.version}|${group.date}|${group.summaries.join('\n')}`).join(';;')
}

export function createVersionChecker(options: {
  buildVersion: string
  baseUrl?: string
  fetch?: VersionFetch
  now?: () => number
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  locationHref?: () => string
  replace?: VersionReloader
  replaceState?: (url: string) => void
}) {
  const buildVersion = options.buildVersion
  const baseUrl = options.baseUrl ?? (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/')
  const fetchImpl = options.fetch ?? fetch
  const now = options.now ?? Date.now
  const storage = options.storage ?? localStorage
  const locationHref = options.locationHref ?? (() => window.location.href)
  const replace = options.replace ?? ((href: string) => window.location.replace(href))
  const replaceState =
    options.replaceState ?? ((url: string) => window.history.replaceState(null, '', url))

  const pending = ref<VersionGroup[]>([])
  const history = ref<VersionGroup[]>([])
  const confirming = ref(false)

  async function refresh() {
    try {
      const response = await fetchImpl(versionsUrl(baseUrl, now()), { cache: 'no-store' })
      if (!response.ok) return
      const data: unknown = await response.json()
      if (!Array.isArray(data)) return
      const groups = groupVersions(parseVersions(data))
      history.value = groups
      const next = pendingGroups(groups, buildVersion)
      if (confirming.value && next.length > 0) return
      if (pendingSignature(pending.value) === pendingSignature(next)) {
        if (next.length === 0) confirming.value = false
        return
      }
      pending.value = next
      if (next.length === 0) confirming.value = false
    } catch {
      // 离线或坏数据：保持现状，不误报
    }
  }

  function markRunningBuild() {
    writeAcked(storage, buildVersion)
  }

  function stripReload() {
    if (typeof window === 'undefined') return
    const next = stripReloadParam(locationHref())
    if (next) replaceState(next)
  }

  function askConfirm() {
    confirming.value = true
  }

  function cancelConfirm() {
    confirming.value = false
  }

  function applyUpdate() {
    replace(withReloadParam(locationHref(), now()))
  }

  return {
    buildVersion,
    pending,
    history,
    confirming,
    ackKey: ACKED_VERSION_KEY,
    refresh,
    markRunningBuild,
    stripReload,
    askConfirm,
    cancelConfirm,
    applyUpdate,
  }
}

export function useAppVersions() {
  const checker = createVersionChecker({
    buildVersion: __APP_VERSION__,
  })
  let timer = 0

  onMounted(() => {
    checker.stripReload()
    checker.markRunningBuild()
    void checker.refresh()
    timer = window.setInterval(() => {
      void checker.refresh()
    }, POLL_MS)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return checker
}
