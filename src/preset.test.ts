import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { readExcel, defaultColumns, mapRows } from './excel'
import { applyDefaultGroups, DEFAULT_GROUP_MAPPING, sourceBrandNames } from './preset'
import { classify, weekOf } from './report'
import { prepareReports } from './export'
import { emptyConfig } from './storage'

const sample = 'C:/Users/Admin/Downloads/DanhSachHanhTrinh_26-10-2026_01-11-2026.xlsx'
describe('default group mapping', () => {
  it('creates exactly the requested three shared groups', () => {
    const config = applyDefaultGroups(emptyConfig(), [])
    expect(config.groups.map(g => g.name)).toEqual(['HN', 'HCM', 'Sao Thủ Đô'])
    for (const [group, members] of Object.entries(DEFAULT_GROUP_MAPPING)) {
      const groupId = config.groups.find(g => g.name === group)?.id
      expect(config.brands.filter(b => b.groupId === groupId).map(b => b.name)).toEqual(members)
    }
  })
  it('places every other observed brand into its own file without duplicates', () => {
    const config = applyDefaultGroups(emptyConfig(), ['Thanh Nga', 'Eco 59', 'Taxi 559', 'eco 59', ''])
    expect(config.groups.filter(g => g.name === 'Eco 59')).toHaveLength(1)
    expect(config.groups.filter(g => g.name === 'Taxi 559')).toHaveLength(1)
    expect(config.brands.filter(b => b.name === 'Eco 59')).toHaveLength(1)
  })
})
describe.skipIf(!existsSync(sample))('default mapping with provided workbook', () => {
  it('accounts for all rows and creates solo files for remaining brands', async () => {
    const source = await readExcel(new File([readFileSync(sample)], 'source.xlsx'))
    let config = emptyConfig()
    config.columns = defaultColumns(source.headers)
    config = applyDefaultGroups(config, sourceBrandNames(source.rows))
    const rows = mapRows(source.rows, config.columns)
    const classified = classify(rows, config.brands)
    expect(classified.unknownRows).toHaveLength(1)
    expect(classified.grouped.get(config.groups.find(g => g.name === 'HN')!.id)).toHaveLength(31)
    expect(classified.grouped.get(config.groups.find(g => g.name === 'HCM')!.id)).toHaveLength(7)
    expect(classified.grouped.get(config.groups.find(g => g.name === 'Sao Thủ Đô')!.id)).toHaveLength(1)
    const range = weekOf('2026-10-28')
    const report = await prepareReports(rows, config, range.start, range.end)
    expect(report.files.filter(f => f.name.includes('ChuaPhanLoai'))[0].rows).toBe(1)
    expect(report.files.slice(1).reduce((sum, f) => sum + f.rows, 0)).toBe(63)
    expect(report.files).toHaveLength(16)
  })
})
