import { describe, expect, it } from 'vitest'
import { classify, formatDate, names, previousWeekOf, validateConfig, weekOf } from './report'
import { defaultColumns, mapRows } from './excel'
import { emptyConfig } from './storage'
describe('report logic',()=>{
  it('calculates Monday to Sunday across years',()=>{ const {start,end}=weekOf('2027-01-01');expect(start.toISOString().slice(0,10)).toBe('2026-12-28');expect(end.toISOString().slice(0,10)).toBe('2027-01-03') })
  it('defaults to the complete previous week on Monday, Sunday, and across years',()=>{
    for (const [today, expectedStart, expectedEnd] of [
      ['2026-11-16', '09-11-2026', '15-11-2026'],
      ['2026-11-22', '09-11-2026', '15-11-2026'],
      ['2027-01-01', '21-12-2026', '27-12-2026'],
    ]) {
      const {start,end}=previousWeekOf(new Date(`${today}T12:00:00`))
      expect(formatDate(start)).toBe(expectedStart)
      expect(formatDate(end)).toBe(expectedEnd)
    }
  })
  it('maps source and adds two empty columns',()=>{ const columns=defaultColumns(['Hãng','Mã chuyến']);const rows=mapRows([{'Hãng':'ABC','Mã chuyến':'001'}],columns);expect(rows[0]['Mã chuyến']).toBe('001');expect(rows[0]['Hãng phản hồi']).toBeNull();expect(rows[0]['HÌnh ảnh GPS trong 2 giờ kể từ thời gian huỷ']).toBeNull() })
  it('uses the exact reference column positions',()=>{const source=['STT','T.thái K.tra','Thời gian truy thu','Hãng',...Array.from({length:25},(_,i)=>`Cột ${i}`)];const columns=defaultColumns(source);expect(columns).toHaveLength(30);expect(columns.map(c=>c.title).slice(0,5)).toEqual(['STT','T.thái K.tra','Hãng phản hồi','HÌnh ảnh GPS trong 2 giờ kể từ thời gian huỷ','Hãng']);expect(columns.some(c=>c.source==='Thời gian truy thu')).toBe(false)})
  it('classifies aliases without losing rows',()=>{const brands=[{id:'b',name:'ABC',aliases:['A B C'],groupId:'g',active:true}];const result=classify([{'Hãng':' a b c '},{'Hãng':'New'}],brands);expect(result.grouped.get('g')).toHaveLength(1);expect(result.unknown.get('New')).toBe(1)})
  it('detects duplicate names',()=>{const config=emptyConfig();config.groups=[{id:'1',name:'A',fileName:'same',categoryId:'x',active:true,skipEmpty:true},{id:'2',name:'B',fileName:'SAME',categoryId:'x',active:true,skipEmpty:true}];expect(validateConfig(config)).toHaveLength(1)})
  it('creates report names',()=>{const config=emptyConfig();const {start,end}=weekOf('2026-10-28');expect(names(config,start,end).main).toBe('main_26-10-2026_01-11-2026.xlsx')})
})
