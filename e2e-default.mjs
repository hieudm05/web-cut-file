import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext({ acceptDownloads: true })
const page = await context.newPage()
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.locator('input[type=file][accept=".xlsx"]').setInputFiles('C:/Users/Admin/Downloads/DanhSachHanhTrinh_26-10-2026_01-11-2026.xlsx')
  await page.locator('tbody tr').first().waitFor()
  await page.locator('input[type=date]').first().fill('2026-10-28')
  assert.match(await page.locator('main').innerText(), /16 file/)
  await page.locator('nav button').nth(1).click()
  const groups = await page.locator('.group input[aria-label="Tên nhóm"]').evaluateAll(nodes => nodes.map(node => node.value))
  assert.deepEqual(groups.slice(0, 3), ['HN', 'HCM', 'Sao Thủ Đô'])
  assert.equal(groups.length, 14)
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('nav button').nth(1).click()
  assert.equal(await page.locator('.group').count(), 14)
  await page.locator('nav button').first().click()
  await page.locator('input[type=file][accept=".xlsx"]').setInputFiles('C:/Users/Admin/Downloads/DanhSachHanhTrinh_26-10-2026_01-11-2026.xlsx')
  await page.locator('tbody tr').first().waitFor()
  await page.locator('input[type=date]').first().fill('2026-10-28')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.primary').filter({ hasText: /ZIP/ }).click()
  const download = await downloadPromise
  mkdirSync('verification-output', { recursive: true })
  await download.saveAs('verification-output/default-groups-browser.zip')
  const zip = await JSZip.loadAsync(readFileSync('verification-output/default-groups-browser.zip'))
  const files = Object.values(zip.files).filter(f => f.name.endsWith('.xlsx'))
  assert.equal(files.length, 16)
  const counts = new Map()
  for (const file of files) { const book = new ExcelJS.Workbook(); await book.xlsx.load(Uint8Array.from(await file.async('uint8array')).buffer); const sheet = book.worksheets[0]; const base = file.name.split('/').at(-1); counts.set(base.split('_')[0], sheet.rowCount - 1); if (base.startsWith('main_')) assert.ok(sheet.getRow(2).height >= 20); else assert.equal(sheet.getRow(2).height, 120); assert.equal(sheet.getRow(1).height, 58); assert.equal(sheet.getRow(1).getCell(1).font.name, 'TimesNewRoman'); assert.equal(sheet.getRow(1).getCell(1).font.bold, true); assert.ok(!sheet.getRow(1).getCell(1).font.italic); assert.ok(!sheet.getRow(2).getCell(1).font.bold); assert.ok(!sheet.getRow(2).getCell(1).font.italic); assert.ok(!sheet.getRow(1).getCell(1).font.strike); assert.ok(!sheet.getRow(2).getCell(1).font.strike); assert.equal(sheet.getRow(1).getCell(4).alignment.wrapText, true); assert.equal(sheet.getColumn(15).width, 55) }
  assert.equal(counts.get('HN'), 31)
  assert.equal(counts.get('HCM'), 7)
  assert.equal(counts.get('ChuaPhanLoai'), 1)
  console.log('Default mapping E2E PASS: 14 groups persisted, 16 files, HN 31, HCM 7, unclassified 1')
} finally { await browser.close() }
