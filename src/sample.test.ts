import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { defaultColumns, makeWorkbook, mapRows, readExcel } from './excel'
import { ROW_FORMAT } from './types'
const sourcePath = 'C:/Users/Admin/Downloads/DanhSachHanhTrinh_26-10-2026_01-11-2026.xlsx'
const mainPath = 'D:/D/emddi/kiem_soat_gian_lan/tuan_26-10_1-11/main_26-10-2026_01-11-2026.xlsx'
describe.skipIf(!existsSync(sourcePath) || !existsSync(mainPath))('provided Excel samples',()=>{
  it('generates the same headers and 63 data rows',async()=>{
    const bytes=readFileSync(sourcePath)
    const file=new File([bytes],'source.xlsx')
    const source=await readExcel(file)
    expect(source.headerRow).toBe(6)
    expect(source.rows).toHaveLength(63)
    const columns=defaultColumns(source.headers)
    const blob=await makeWorkbook(mapRows(source.rows,columns),columns,source.format)
    const output=new ExcelJS.Workbook(),reference=new ExcelJS.Workbook()
    await output.xlsx.load(await blob.arrayBuffer())
    await reference.xlsx.load(Uint8Array.from(readFileSync(mainPath)).buffer)
    const a=output.worksheets[0],b=reference.worksheets[0]
    expect(a.rowCount).toBe(b.rowCount)
    expect(a.columnCount).toBe(b.columnCount)
    for(let r=1;r<=b.rowCount;r++)for(let c=1;c<=b.columnCount;c++)expect(a.getRow(r).getCell(c).value).toEqual(b.getRow(r).getCell(c).value)
  })
  it('removes strikethrough, wraps text and keeps useful source styling',async()=>{
    const source=await readExcel(new File([readFileSync(sourcePath)],'source.xlsx'))
    const columns=defaultColumns(source.headers), rows=mapRows(source.rows,columns)
    const main=new ExcelJS.Workbook(),delivery=new ExcelJS.Workbook()
    await main.xlsx.load(await (await makeWorkbook(rows,columns,source.format)).arrayBuffer())
    await delivery.xlsx.load(await (await makeWorkbook(rows.slice(0,2),columns,source.format,120)).arrayBuffer())
    const a=main.worksheets[0],d=delivery.worksheets[0]
    expect(a.getRow(1).height).toBeGreaterThanOrEqual(58)
    expect(a.getRow(2).height).toBeGreaterThanOrEqual(source.rows[0][ROW_FORMAT]?.height ?? 20)
    expect(d.getRow(1).height).toBeGreaterThanOrEqual(58)
    expect(d.getRow(2).height).toBe(120)
    expect(d.getRow(3).height).toBe(120)
    expect(a.getColumn(1).width).toBeCloseTo(source.format.widths['STT'])
    expect(a.getColumn(15).width).toBe(55)
    expect(a.getColumn(16).width).toBe(55)
    for(const sheet of [a,d]) for(const [rowNumber,cell] of [[1,sheet.getRow(1).getCell(1)],[2,sheet.getRow(2).getCell(1)]] as const) {
      expect(cell.font.strike).toBeFalsy()
      expect(cell.font.italic).toBeFalsy()
      expect(Boolean(cell.font.bold)).toBe(rowNumber === 1)
      expect(cell.alignment?.wrapText).toBe(true)
      expect(cell.font.name).toBe('TimesNewRoman')
      expect(cell.font.size).toBe(rowNumber === 1 ? source.format.headerStyles['STT'].font?.size : source.rows[0][ROW_FORMAT]?.styles['STT'].font?.size)
    }
    expect(a.getRow(1).getCell(1).fill).toEqual(source.format.headerStyles['STT'].fill)
    expect(a.getRow(2).getCell(1).border).toEqual(source.rows[0][ROW_FORMAT]?.styles['STT'].border)
  })
})
