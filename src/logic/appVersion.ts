export const ACKED_VERSION_KEY = 'idea10Nb.ackedVersion'
export const RELOAD_PARAM = '_reload'

export type AppVersion = {
  id: string
  version: string
  date: string
  summary: string
}

export type VersionGroup = {
  version: string
  date: string
  summaries: string[]
  ids: string[]
}

export function isAppVersion(value: unknown): value is AppVersion {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.version === 'string' &&
    typeof entry.date === 'string' &&
    typeof entry.summary === 'string'
  )
}

export function parseVersions(data: unknown): AppVersion[] {
  if (!Array.isArray(data)) return []
  return data.filter(isAppVersion)
}

export function groupVersions(entries: AppVersion[]): VersionGroup[] {
  const groups: VersionGroup[] = []
  const byVersion = new Map<string, VersionGroup>()
  for (const entry of entries) {
    let group = byVersion.get(entry.version)
    if (!group) {
      group = { version: entry.version, date: entry.date, summaries: [], ids: [] }
      byVersion.set(entry.version, group)
      groups.push(group)
    }
    group.summaries.push(entry.summary)
    group.ids.push(entry.id)
    if (entry.date > group.date) group.date = entry.date
  }
  return groups
}

function parseSemver(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareSemver(a: string, b: string): number {
  const left = parseSemver(a)
  const right = parseSemver(b)
  if (!left || !right) return 0
  for (let i = 0; i < 3; i += 1) {
    const diff = left[i]! - right[i]!
    if (diff !== 0) return diff
  }
  return 0
}

/** 只把远端比当前构建更新的组当成待更新，不看 ack。 */
export function pendingGroups(groups: VersionGroup[], buildVersion: string): VersionGroup[] {
  return groups.filter((group) => compareSemver(group.version, buildVersion) > 0)
}

export function readAcked(storage: Pick<Storage, 'getItem'>): string | null {
  try {
    return storage.getItem(ACKED_VERSION_KEY)
  } catch {
    return null
  }
}

export function writeAcked(storage: Pick<Storage, 'setItem'>, version: string): void {
  try {
    storage.setItem(ACKED_VERSION_KEY, version)
  } catch {
    // 写失败不挡练习
  }
}

export function clearAcked(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(ACKED_VERSION_KEY)
  } catch {
    // ignore
  }
}

export function versionsUrl(baseUrl: string, now: number): string {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${root}versions.json?t=${now}`
}

export function withReloadParam(href: string, now: number): string {
  const url = new URL(href)
  url.searchParams.set(RELOAD_PARAM, String(now))
  return url.toString()
}

export function stripReloadParam(href: string): string | null {
  const url = new URL(href)
  if (!url.searchParams.has(RELOAD_PARAM)) return null
  url.searchParams.delete(RELOAD_PARAM)
  return `${url.pathname}${url.search}${url.hash}`
}
