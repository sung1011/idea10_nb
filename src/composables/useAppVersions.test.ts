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

  it('确认中轮询不改弹窗；更新消失才收起', async () => {
    let payload: unknown = remote
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      fetch: async () => jsonResponse(payload),
    })
    await checker.refresh()
    checker.askConfirm()
    payload = [
      { id: 'v0.4.0', version: '0.4.0', date: '2026-11-26', summary: '更新的说明' },
      ...remote,
    ]
    await checker.refresh()
    expect(checker.confirming.value).toBe(true)
    expect(checker.pending.value.map((item) => item.version)).toEqual(['0.3.0'])

    payload = remote.filter((item) => item.version === '0.2.0')
    await checker.refresh()
    expect(checker.confirming.value).toBe(false)
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

  it('更新用 _reload，不在刷新前 ack 远端版本；取消确认不 ack', () => {
    const storage = memoryStorage()
    let replaced = ''
    const checker = createVersionChecker({
      buildVersion: '0.2.0',
      storage,
      locationHref: () => 'https://sung1011.github.io/idea10_nb/',
      replace: (href) => {
        replaced = href
      },
      now: () => 42,
    })
    checker.askConfirm()
    expect(checker.confirming.value).toBe(true)
    checker.cancelConfirm()
    expect(checker.confirming.value).toBe(false)
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
    checker.applyUpdate()
    expect(replaced).toContain('_reload=42')
    expect(storage.getItem(ACKED_VERSION_KEY)).toBeNull()
  })
})
