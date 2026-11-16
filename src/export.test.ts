import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { readExcel, defaultColumns, mapRows } from './excel'
import { prepareReports, makeZip, writeReports } from './export'
import { classify, weekOf } from './report'
import { emptyConfig } from './storage'
import type { Config } from './types'
const sourcePath = 'C:/Users/Admin/Downloads/DanhSachHanhTrinh_26-10-2026_01-11-2026.xlsx'
const artifactDir = 'verification-output'
async function fixture() {
  const source = await readExcel(new File([readFileSync(sourcePath)], 'source.xlsx'))
  const config: Config = emptyConfig()
  config.columns = defaultColumns(source.headers)
  config.categories = [{ id: 'c', name: 'Kiểm chứng' }]
  config.groups = [
    { id: 'multi', categoryId: 'c', name: 'Nhóm chung', fileName: 'NhomChung', active: true, skipEmpty: true },
    { id: 'solo', categoryId: 'c', name: 'Nhóm riêng', fileName: 'HoangLong', active: true, skipEmpty: true },
  ]
  config.brands = [
    { id: 'a', groupId: 'multi', name: 'Thanh Nga', aliases: [], active: true },
    { id: 'b', groupId: 'multi', name: 'Long Biên', aliases: [], active: true },
    { id: 'd', groupId: 'solo', name: 'HTX Hoàng Long', aliases: [], active: true },
  ]
  return { config, rows: mapRows(source.rows, config.columns), range: weekOf('2026-10-28'), format: source.format }
}
describe.skipIf(!existsSync(sourcePath))('Phase 09 real output', () => {
  it('creates and reopens all four workbooks and ZIP', async () => {
    const { config, rows, range, format } = await fixture()
    const result = await prepareReports(rows, config, range.start, range.end, false, undefined, format)
    expect(result.files).toHaveLength(4)
    expect(result.files.map(f => f.rows)).toEqual([63, 34, 4, 25])
    expect(result.files.slice(1).reduce((n, f) => n + f.rows, 0)).toBe(rows.length)
    const classifications = classify(rows, config.brands)
    expect(classifications.unknownRows).toHaveLength(25)
    mkdirSync(artifactDir, { recursive: true })
    for (const file of result.files) {
      const bytes = Buffer.from(await file.blob.arrayBuffer())
      writeFileSync(`${artifactDir}/${file.name}`, bytes)
      const book = new ExcelJS.Workbook()
      await book.xlsx.load(Uint8Array.from(bytes).buffer)
      expect(book.worksheets).toHaveLength(1)
      const sheet = book.worksheets[0]
      expect(sheet.name).toBe('Dữ liệu')
      expect(sheet.columnCount).toBe(30)
      expect(sheet.rowCount).toBe(file.rows + 1)
      if (file.name.startsWith('main_')) expect(sheet.getRow(2).height).toBeGreaterThanOrEqual(20)
      else expect(sheet.getRow(2).height).toBe(120)
      expect(sheet.getColumn(15).width).toBe(55)
      expect((sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1)).toEqual(config.columns.map(c => c.title))
      const brands: string[] = []
      const rideIds: string[] = []
      for (let r = 2; r <= sheet.rowCount; r++) {
        brands.push(String(sheet.getRow(r).getCell(5).value ?? ''))
        rideIds.push(String(sheet.getRow(r).getCell(7).value ?? ''))
        expect(sheet.getRow(r).getCell(3).value).toBeNull()
        expect(sheet.getRow(r).getCell(4).value).toBeNull()
      }
      expect(new Set(rideIds).size).toBe(rideIds.length)
      if (file.name.includes('NhomChung')) expect(new Set(brands)).toEqual(new Set(['Thanh Nga', 'Long Biên']))
      if (file.name.includes('HoangLong')) expect(new Set(brands)).toEqual(new Set(['HTX Hoàng Long']))
      if (file.name.includes('ChuaPhanLoai')) expect(brands).toContain('')
      expect(String(sheet.getRow(2).getCell(17).value)).toMatch(/\d{2}\/\d{2}\/2026 - \d{2}:\d{2}:\d{2}/)
    }
    const zipBlob = await makeZip(result.folder, result.files)
    writeFileSync(`${artifactDir}/${result.folder}.zip`, Buffer.from(await zipBlob.arrayBuffer()))
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer())
    for (const file of result.files) expect(await zip.file(`${result.folder}/${file.name}`)?.async('uint8array')).toEqual(new Uint8Array(await file.blob.arrayBuffer()))
  })
  it('enforces Strict and Confirmed Skip modes while retaining main', async () => {
    const { config, rows, range } = await fixture()
    config.exportMode = 'strict'
    await expect(prepareReports(rows, config, range.start, range.end)).rejects.toThrow('Strict')
    config.exportMode = 'confirmed-skip'
    await expect(prepareReports(rows, config, range.start, range.end)).rejects.toThrow('xác nhận')
    const report = await prepareReports(rows, config, range.start, range.end, true)
    expect(report.files.map(f => f.rows)).toEqual([63, 34, 4])
  })
  it('refuses to overwrite an existing file', async () => {
    const { config, rows, range } = await fixture()
    const result = await prepareReports(rows, config, range.start, range.end)
    const existingFile = { name: result.files[0].name }
    const folder = { getFileHandle: async () => existingFile }
    const directory = { getDirectoryHandle: async () => folder } as unknown as FileSystemDirectoryHandle
    await expect(writeReports(directory, result.folder, result.files)).rejects.toThrow('Đã hủy ghi đè')
  })
  it('writes all files to a selected directory and confirms overwrite', async () => {
    const { config, rows, range } = await fixture()
    const result = await prepareReports(rows, config, range.start, range.end)
    const stored = new Map<string, Blob>()
    const folder = { getFileHandle: async (name: string, options?: { create?: boolean }) => {
      if (!options?.create && !stored.has(name)) throw new DOMException('missing', 'NotFoundError')
      return { createWritable: async () => ({ write: async (blob: Blob) => { stored.set(name, blob) }, close: async () => {} }) }
    } }
    const directory = { getDirectoryHandle: async () => folder } as unknown as FileSystemDirectoryHandle
    expect(await writeReports(directory, result.folder, result.files)).toHaveLength(4)
    expect(stored.size).toBe(4)
    let asked: string[] = []
    await writeReports(directory, result.folder, result.files, undefined, existing => { asked = existing; return true })
    expect(asked).toHaveLength(4)
  })
})
