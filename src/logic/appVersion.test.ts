import { describe, expect, it } from 'vitest'
import {
  compareSemver,
  groupVersions,
  parseVersions,
  pendingGroups,
  stripReloadParam,
  versionsUrl,
  withReloadParam,
} from './appVersion'

describe('版本解析与分组', () => {
  it('丢掉非法条目，按 version 分组且保留文件顺序', () => {
    const parsed = parseVersions([
      { id: 'v0.3.0', version: '0.3.0', date: '2026-11-25', summary: '新' },
      { id: 'v0.3.0-b', version: '0.3.0', date: '2026-11-25', summary: '补充' },
      { id: 'v0.2.0', version: '0.2.0', date: '2026-11-24', summary: '十题' },
      { bad: true },
    ])
    expect(parsed).toHaveLength(3)
    const groups = groupVersions(parsed)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.version).toBe('0.3.0')
    expect(groups[0]?.summaries).toEqual(['新', '补充'])
    expect(groups[1]?.version).toBe('0.2.0')
  })

  it('pending 只比构建版本，ack 不影响', () => {
    const groups = groupVersions(
      parseVersions([
        { id: 'v0.3.0', version: '0.3.0', date: '2026-11-25', summary: '新' },
        { id: 'v0.2.0', version: '0.2.0', date: '2026-11-24', summary: '十题' },
      ]),
    )
    expect(pendingGroups(groups, '0.2.0').map((item) => item.version)).toEqual(['0.3.0'])
    expect(pendingGroups(groups, '0.3.0')).toEqual([])
    expect(pendingGroups(groups, '0.1.0').map((item) => item.version)).toEqual(['0.3.0', '0.2.0'])
    expect(compareSemver('0.2.0', '0.2.0')).toBe(0)
  })

  it('非法 json 当空列表', () => {
    expect(parseVersions('{')).toEqual([])
    expect(parseVersions(null)).toEqual([])
    expect(pendingGroups([], '0.2.0')).toEqual([])
  })
})

describe('刷新地址', () => {
  it('加上并去掉 _reload', () => {
    const next = withReloadParam('https://sung1011.github.io/idea10_nb/', 123)
    expect(next).toContain('_reload=123')
    expect(stripReloadParam(next)).toBe('/idea10_nb/')
    expect(versionsUrl('/idea10_nb/', 9)).toBe('/idea10_nb/versions.json?t=9')
  })
})
