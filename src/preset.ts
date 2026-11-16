import { normalize } from './excel'
import type { Brand, Config, Group, Row } from './types'

export const DEFAULT_GROUP_MAPPING: Record<string, string[]> = {
  HN: ['Thanh Nga', 'HTX Phúc Thịnh', 'Taxi Hương Lúa', 'Vạn Xuân', 'Taxi Quê Lụa', 'Taxi Lan Anh', 'Taxi Alpha', 'Taxi Trôi Phùng'],
  HCM: ['HTX Hoàng Long', 'VinaTaxi', 'HTX Du Lịch Sài Gòn'],
  'Sao Thủ Đô': ['Taxi Sao Thủ Đô', 'HTX Thành Đô'],
}

export function sourceBrandNames(rows: Row[]): string[] {
  const names = new Map<string, string>()
  for (const row of rows) {
    const key = Object.keys(row).find(k => normalize(k) === 'hãng')
    const name = String(key ? row[key] ?? '' : '').trim()
    if (name && !names.has(normalize(name))) names.set(normalize(name), name)
  }
  return [...names.values()]
}

export function applyDefaultGroups(config: Config, sourceNames: string[]): Config {
  const result: Config = { ...config, categories: [], groups: [], brands: [] }
  const categoryId = crypto.randomUUID()
  const soloCategoryId = crypto.randomUUID()
  result.categories = [{ id: categoryId, name: 'Nhóm mặc định' }, { id: soloCategoryId, name: 'Hãng riêng' }]
  const assigned = new Set<string>()
  const fileNames = new Set(['chuaphanloai'])
  const addGroup = (name: string, parentId: string, fileName = name): Group => {
    let candidate = fileName, number = 2
    while (fileNames.has(normalize(candidate))) candidate = `${fileName}_${number++}`
    fileNames.add(normalize(candidate))
    const group = { id: crypto.randomUUID(), name, fileName: candidate, categoryId: parentId, active: true, skipEmpty: true }
    result.groups.push(group)
    return group
  }
  const addBrand = (name: string, groupId: string): Brand => {
    const brand = { id: crypto.randomUUID(), name, aliases: [], groupId, active: true }
    result.brands.push(brand)
    assigned.add(normalize(name))
    return brand
  }
  for (const [name, members] of Object.entries(DEFAULT_GROUP_MAPPING)) {
    const group = addGroup(name, categoryId)
    for (const member of members) addBrand(member, group.id)
  }
  for (const name of sourceNames) {
    if (assigned.has(normalize(name))) continue
    const group = addGroup(name, soloCategoryId)
    addBrand(name, group.id)
  }
  return result
}
