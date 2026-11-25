import { describe, expect, it } from 'vitest'
import { ACKED_VERSION_KEY } from '../logic/appVersion'
import { memoryStorage } from '../storage/appStorage'
import { createVersionChecker } from './useAppVersions'

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => data,
  } as Response
}

const remote = [
  { id: 'v0.3.0', version: '0.3.0', date: '2026-11-25', summary: '新功能' },
  { id: 'v0.2.0', version: '0.2.0', date: '2026-11-24', summary: '十题' },
]

describe('版本检测', () => {
  it('加载 0.3.0 构建只 ack 当前构建，远端没有更高版本则不弹', async () => {
    const storage = memoryStorage()
    const checker = createVersionChecker({
      buildVersion: '0.3.0',
      fetch: async () => jsonResponse(remote),
      storage,
    })
    checker.markRunningBuild()
    expect(storage.getItem(ACKED_VERSION_KEY)).toBe('0.3.0')
    await checker.refresh()
    expect(checker.pending.value).toEqual([])
  })

  it('history 是全部分组，pending 只含比构建新的', async () => {
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(remote),
    })
    await checker.refresh()
    expect(checker.history.value.map((item) => item.version)).toEqual(['0.3.0', '0.2.0'])
    expect(checker.pending.value.map((item) => item.version)).toEqual(['0.3.0'])
  })

  it('当前构建已是最新则不弹，即使没有 ack', () => {
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(remote.filter((item) => item.version === '0.2.0')),
      storage: memoryStorage(),
    })
    return checker.refresh().then(() => {
      expect(checker.pending.value).toEqual([])
    })
  })

  it('旧构建遇到远端新版会弹，ack 新版本也不能压掉', async () => {
    const storage = memoryStorage({ [ACKED_VERSION_KEY]: '0.3.0' })
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(remote),
      storage,
    })
    await checker.refresh()
    expect(checker.pending.value.map((item) => item.version)).toEqual(['0.3.0'])
  })

  it('首访运行最新构建只记录当前构建，不 ack 尚未加载的新版', async () => {
    const storage = memoryStorage()
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(remote),
      storage,
    })
    checker.markRunningBuild()
    expect(storage.getItem(ACKED_VERSION_KEY)).toBe('0.2.0')
    await checker.refresh()
    expect(checker.pending.value[0]?.version).toBe('0.3.0')
  })

  it('离线、HTTP 错误、坏 json 静默且不误报', async () => {
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => {
        throw new Error('offline')
      },
    })
    await checker.refresh()
    expect(checker.pending.value).toEqual([])

    const http = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(remote, false, 500),
    })
    await http.refresh()
    expect(http.pending.value).toEqual([])

    const bad = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse('{not json'),
    })
    // json() returns string, parseVersions empty array from non-array
    await bad.refresh()
    expect(bad.pending.value).toEqual([])
  })

  it('请求带时间戳且 cache=no-store', async () => {
    let url = ''
    let init: RequestInit | undefined
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      baseUrl: '/idea10_nb/',
      now: () => 99,
      fetch: async (nextUrl, nextInit) => {
        url = nextUrl
        init = nextInit
        return jsonResponse(remote.filter((item) => item.version === '0.2.0'))
      },
    })
    await checker.refresh()
    expect(url).toBe('/idea10_nb/versions.json?t=99')
    expect(init?.cache).toBe('no-store')
  })

  it('轮询会换成更新的 pending；没有更高版本则收起', async () => {
    let payload: unknown = remote
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(payload),
    })
    await checker.refresh()
    expect(checker.pending.value.map((item) => item.version)).toEqual(['0.3.0'])
    payload = [
      { id: 'v0.4.0', version: '0.4.0', date: '2026-11-26', summary: '更新的说明' },
      ...remote,
    ]
    await checker.refresh()
    expect(checker.pending.value.map((item) => item.version)).toEqual(['0.4.0', '0.3.0'])

    payload = remote.filter((item) => item.version === '0.2.0')
    await checker.refresh()
    expect(checker.pending.value).toEqual([])
  })

  it('json 抛错静默', async () => {
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('bad json')
          },
        }) as unknown as Response,
    })
    await checker.refresh()
    expect(checker.pending.value).toEqual([])
  })

  it('更新用 _reload，不在刷新前 ack 远端版本；连点只触发一次', () => {
    const storage = memoryStorage()
    const replaced: string[] = []
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      storage,
      locationHref: () => 'https://sung1011.github.io/idea10_nb/',
      replace: (href) => {
        replaced.push(href)
      },
      now: () => 42,
    })
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
    checker.applyUpdate()
    checker.applyUpdate()
    expect(replaced).toHaveLength(1)
    expect(replaced[0]).toContain('_reload=42')
    expect(checker.updating.value).toBe(true)
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
  })
})
