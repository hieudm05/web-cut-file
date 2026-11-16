import ExcelJS from 'exceljs'
import { ROW_FORMAT } from './types'
import type { Column, Row, WorkbookFormat } from './types'

export const normalize = (v: unknown) => String(v ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
const cellValue = (v: ExcelJS.CellValue): ExcelJS.CellValue => {
  if (v && typeof v === 'object' && 'formula' in v) return v.result ?? null
  return v
}
const cloneStyle = (style: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> => JSON.parse(JSON.stringify(style)) as Partial<ExcelJS.Style>
const exportStyle = (style: Partial<ExcelJS.Style> | undefined, vertical: 'top' | 'middle', header = false): Partial<ExcelJS.Style> => {
  const result = cloneStyle(style ?? {})
  result.font = { ...result.font, bold: header, italic: false, strike: false }
  result.alignment = { ...result.alignment, vertical, wrapText: true }
  return result
}
const columnWidth = (column: Column, format?: WorkbookFormat) => {
  const width = format?.widths[column.source] ?? (column.id === 'brand-reply' ? format?.widths['T.thái K.tra'] : column.id === 'gps-image' ? format?.widths['Hãng'] : undefined)
  if (normalize(column.title) === 'stt') return Math.max(7, Math.min(10, width ?? 8))
  return Math.max(16, Math.min(55, width ?? column.title.length + 3))
}
const contentHeight = (row: Row, columns: Column[], widths: number[]) => {
  const lines = Math.max(1, ...columns.map((column, i) => {
    const value = row[column.title]
    if (value === null || value === undefined) return 1
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
    return Math.ceil(text.length / Math.max(5, widths[i] - 3))
  }))
  return Math.min(96, Math.max(20, lines * 19 + 4))
}
export async function readExcel(file: File) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  let best: { headers: string[]; rows: Row[]; sheet: string; headerRow: number; format: WorkbookFormat } | null = null
  for (const ws of wb.worksheets) {
    for (let h = 1; h <= Math.min(ws.rowCount, 25); h++) {
      const header = ws.getRow(h)
      const headers = Array.from({ length: ws.columnCount }, (_, i) => String(header.getCell(i + 1).text ?? '').trim())
      if (!headers.some(x => normalize(x) === 'hãng')) continue
      const format: WorkbookFormat = { headerHeight: header.height, defaultRowHeight: ws.properties.defaultRowHeight, widths: {}, headerStyles: {} }
      headers.forEach((key, i) => { if (key) { const width = ws.getColumn(i + 1).width; if (width) format.widths[key] = width; format.headerStyles[key] = cloneStyle(header.getCell(i + 1).style) } })
      const rows: Row[] = []
      for (let r = h + 1; r <= ws.rowCount; r++) {
        const record: Row = {}
        const rowFormat = { height: ws.getRow(r).height, styles: {} as Record<string, Partial<ExcelJS.Style>> }
        let filled = false
        headers.forEach((key, i) => { if (key) { const cell = ws.getRow(r).getCell(i + 1); const v = cellValue(cell.value); record[key] = v; rowFormat.styles[key] = cloneStyle(cell.style); if (v !== null && v !== '') filled = true } })
        record[ROW_FORMAT] = rowFormat
        if (filled) rows.push(record)
      }
      if (!best || rows.length > best.rows.length) best = { headers: headers.filter(Boolean), rows, sheet: ws.name, headerRow: h, format }
    }
  }
  if (!best) throw new Error('Không tìm thấy sheet có cột Hãng trong 25 dòng đầu.')
  return best
}
export function defaultColumns(headers: string[]): Column[] {
  const make = (title: string, source: string, id: string): Column => ({ id, title, source, required: normalize(title) === 'hãng' })
  const hasReferenceShape = headers.length === 29 && normalize(headers[0]) === 'stt' && normalize(headers[1]) === 't.thái k.tra' && normalize(headers[2]) === 'thời gian truy thu' && normalize(headers[3]) === 'hãng'
  if (hasReferenceShape) return [
    make(headers[0],headers[0],'col-0'), make(headers[1],headers[1],'col-1'),
    make('Hãng phản hồi','','brand-reply'),
    make('HÌnh ảnh GPS trong 2 giờ kể từ thời gian huỷ','','gps-image'),
    ...headers.slice(3).map((title,i)=>make(title,title,`col-${i+3}`)),
  ]
  return [...headers.map((title,i)=>make(title,title,`col-${i}`)),make('Hãng phản hồi','','brand-reply'),make('HÌnh ảnh GPS trong 2 giờ kể từ thời gian huỷ','','gps-image')]
}
export function mapRows(rows: Row[], columns: Column[]): Row[] {
  return rows.map(row => { const mapped: Row = Object.fromEntries(columns.map(col => {
    const key = Object.keys(row).find(k => normalize(k) === normalize(col.source))
    return [col.title, key ? row[key] : null]
  })); if (row[ROW_FORMAT]) mapped[ROW_FORMAT] = row[ROW_FORMAT]; return mapped })
}
export async function makeWorkbook(rows: Row[], columns: Column[], format?: WorkbookFormat, groupRowHeight?: number): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Dữ liệu')
  if (format?.defaultRowHeight) ws.properties.defaultRowHeight = format.defaultRowHeight
  const widths = columns.map(col => columnWidth(col, format))
  ws.columns = columns.map((col, i) => ({ header: col.title, key: col.title, width: widths[i] }))
  ws.getRow(1).height = Math.max(58, format?.headerHeight ?? 26)
  columns.forEach((col, i) => {
    const style = format?.headerStyles[col.source] ?? (format && (col.id === 'brand-reply' || col.id === 'gps-image') ? format.headerStyles['T.thái K.tra'] : undefined)
    ws.getRow(1).getCell(i + 1).style = exportStyle(style, 'middle', true)
  })
  rows.forEach(row => {
    const added = ws.addRow(row)
    added.height = groupRowHeight ?? Math.max(row[ROW_FORMAT]?.height ?? format?.defaultRowHeight ?? 20, contentHeight(row, columns, widths))
    columns.forEach((col, i) => {
      const style = row[ROW_FORMAT]?.styles[col.source] ?? ((col.id === 'brand-reply' || col.id === 'gps-image') ? row[ROW_FORMAT]?.styles['T.thái K.tra'] : undefined)
      added.getCell(i + 1).style = exportStyle(style, groupRowHeight ? 'top' : 'middle')
    })
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  if (!format) ws.getRow(1).font = { bold: true }
  const bytes = await wb.xlsx.writeBuffer()
  return new Blob([bytes as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
