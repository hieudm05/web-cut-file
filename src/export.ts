import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { makeWorkbook } from './excel'
import { names, classify } from './report'
import type { Config, Row, WorkbookFormat } from './types'

export type ReportFile = { name: string; blob: Blob; rows: number }
export type Progress = (done: number, total: number, file: string) => void

export async function prepareReports(rows: Row[], config: Config, start: Date, end: Date, confirmedSkip = false, progress?: Progress, format?: WorkbookFormat) {
  const naming = names(config, start, end)
  const { grouped, unknownRows } = classify(rows, config.brands)
  if (unknownRows.length && config.exportMode === 'strict') throw new Error(`${unknownRows.length} dòng chưa phân loại. Chế độ Strict chặn xuất.`)
  if (unknownRows.length && config.exportMode === 'confirmed-skip' && !confirmedSkip) throw new Error(`Cần xác nhận bỏ ${unknownRows.length} dòng khỏi các file nhóm.`)
  const planned: { name: string; rows: Row[]; main?: boolean }[] = [{ name: naming.main, rows, main: true }]
  for (const group of config.groups.filter(g => g.active)) {
    const data = grouped.get(group.id) ?? []
    if (!data.length && group.skipEmpty) continue
    planned.push({ name: naming.group(group.fileName), rows: data })
  }
  if (unknownRows.length && config.exportMode === 'flexible') planned.push({ name: naming.group('ChuaPhanLoai'), rows: unknownRows })
  if (new Set(planned.map(f => f.name.toLocaleLowerCase())).size !== planned.length) throw new Error('Tên file đầu ra bị trùng.')
  const files: ReportFile[] = []
  for (const item of planned) {
    files.push({ name: item.name, rows: item.rows.length, blob: await makeWorkbook(item.rows, config.columns, format, item.main ? undefined : config.groupRowHeight) })
    progress?.(files.length, planned.length, item.name)
  }
  return { folder: naming.folder, files, unknownRows: unknownRows.length }
}

export async function makeZip(folder: string, files: ReportFile[]) {
  const zip = new JSZip()
  for (const file of files) zip.file(`${folder}/${file.name}`, file.blob)
  return zip.generateAsync({ type: 'blob' })
}

export async function writeReports(directory: FileSystemDirectoryHandle, folderName: string, files: ReportFile[], progress?: Progress, confirmOverwrite?: (existing: string[]) => boolean) {
  let folder: FileSystemDirectoryHandle | undefined
  try { folder = await directory.getDirectoryHandle(folderName) } catch (error) { if (error instanceof DOMException && error.name !== 'NotFoundError') throw error }
  const existing: string[] = []
  if (folder) for (const file of files) {
    try { await folder.getFileHandle(file.name); existing.push(file.name) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error }
  }
  if (existing.length && !confirmOverwrite?.(existing)) throw new Error(`Đã hủy ghi đè ${existing.length} file: ${existing.join(', ')}`)
  folder ??= await directory.getDirectoryHandle(folderName, { create: true })
  const written: string[] = []
  for (const file of files) {
    try {
      const handle = await folder.getFileHandle(file.name, { create: true })
      const writer = await handle.createWritable()
      await writer.write(file.blob)
      await writer.close()
      written.push(file.name)
      progress?.(written.length, files.length, file.name)
    } catch (error) { throw new Error(`Ghi ${file.name} thất bại. Đã tạo: ${written.join(', ') || 'chưa có'}. ${String(error)}`) }
  }
  return written
}

export async function exportReports(rows: Row[], config: Config, start: Date, end: Date, directory?: FileSystemDirectoryHandle, confirmedSkip = false, progress?: Progress, confirmOverwrite?: (existing: string[]) => boolean, format?: WorkbookFormat) {
  const report = await prepareReports(rows, config, start, end, confirmedSkip, progress, format)
  if (directory) await writeReports(directory, report.folder, report.files, progress, confirmOverwrite)
  else saveAs(await makeZip(report.folder, report.files), `${report.folder}.zip`)
  return report.files.map(f => f.name)
}
