import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { groupVersions, parseVersions, pendingGroups } from './appVersion'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readPngSize(path: string): { width: number; height: number; colorType: number } {
  const data = readFileSync(path)
  expect(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true)
  expect(data.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25]!,
  }
}

describe('主屏幕清单与图标', () => {
  it('manifest 路径、standalone 与 any 图标', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8')) as {
      id: string
      name: string
      short_name: string
      lang: string
      display: string
      start_url: string
      scope: string
      theme_color: string
      background_color: string
      icons: { src: string; sizes: string; type: string; purpose: string }[]
    }
    expect(manifest.name).toBe('一起算')
    expect(manifest.short_name).toBe('一起算')
    expect(manifest.lang).toBe('zh-CN')
    expect(manifest.display).toBe('standalone')
    expect(manifest.id).toBe('/idea10_nb/')
    expect(manifest.start_url).toBe('/idea10_nb/')
    expect(manifest.scope).toBe('/idea10_nb/')
    expect(manifest.theme_color).toBe('#fff4e4')
    expect(manifest.background_color).toBe('#fff4e4')
    expect(manifest.icons.map((item) => item.sizes).sort()).toEqual(['192x192', '512x512'])
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png')
      expect(icon.purpose).toBe('any')
      expect(icon.purpose).not.toContain('maskable')
      expect(icon.src.startsWith('/idea10_nb/icons/')).toBe(true)
    }
  })

  it('各尺寸 PNG 为不透明方形，来自生成资源', () => {
    const files = [
      ['public/icons/icon-512.png', 512],
      ['public/icons/icon-192.png', 192],
      ['public/icons/apple-touch-icon.png', 180],
      ['public/icons/favicon-32.png', 32],
    ] as const
    for (const [rel, size] of files) {
      const info = readPngSize(join(root, rel))
      expect(info.width).toBe(size)
      expect(info.height).toBe(size)
      expect(info.colorType).toBe(2)
    }
  })

  it('index 链到 manifest 与苹果触屏图标，并带独立窗口 meta', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    expect(html).toContain('href="/idea10_nb/manifest.webmanifest"')
    expect(html).toContain('href="/idea10_nb/icons/favicon-32.png"')
    expect(html).toContain('href="/idea10_nb/icons/apple-touch-icon.png"')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain('mobile-web-app-capable')
    expect(html).toContain('apple-mobile-web-app-title')
    expect(html).not.toContain('serviceWorker')
    expect(html).not.toContain('navigator.serviceWorker')
  })
})

describe('0.6.14 版本检测', () => {
  it('旧构建 0.6.13 遇到远端 0.6.14 会提示；已是 0.6.14 不提示', () => {
    const entries = parseVersions(JSON.parse(readFileSync(join(root, 'public/versions.json'), 'utf8')))
    expect(entries[0]?.version).toBe('0.6.14')
    const groups = groupVersions(entries)
    expect(pendingGroups(groups, '0.6.13').map((item) => item.version)[0]).toBe('0.6.14')
    expect(pendingGroups(groups, '0.6.14')).toEqual([])
  })
})
