import sys, zipfile, xml.etree.ElementTree as ET, json, collections
N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def col(ref):
    s=''.join(c for c in ref if c.isalpha()); n=0
    for c in s:n=n*26+ord(c)-64
    return n-1
for path in sys.argv[1:]:
    with zipfile.ZipFile(path) as z:
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            root=ET.fromstring(z.read('xl/sharedStrings.xml'))
            shared=[''.join(t.text or '' for t in si.findall('.//m:t',N)) for si in root.findall('m:si',N)]
        book=ET.fromstring(z.read('xl/workbook.xml'))
        print('\nFILE',path,'SHEETS',[(s.attrib.get('name'),s.attrib.get('sheetId')) for s in book.findall('.//m:sheet',N)])
        for name in sorted(x for x in z.namelist() if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')):
            root=ET.fromstring(z.read(name)); rows=[]; types=collections.defaultdict(lambda:collections.Counter())
            for row in root.findall('.//m:sheetData/m:row',N):
                cells={}
                for c in row.findall('m:c',N):
                    v=c.find('m:v',N); inline=c.find('m:is',N); formula=c.find('m:f',N); value=v.text if v is not None else None
                    if c.attrib.get('t')=='s' and value is not None:value=shared[int(value)]
                    if inline is not None:value=''.join(t.text or '' for t in inline.findall('.//m:t',N))
                    if value is not None:cells[col(c.attrib['r'])]=value
                    types[col(c.attrib['r'])][('formula' if formula is not None else c.attrib.get('t','n'))]+=1
                if cells:rows.append((int(row.attrib['r']),cells))
            print('SHEET',name,'nonempty rows',len(rows),'maxcol',max((max(x[1]) for x in rows),default=-1)+1)
            for r,cells in rows[:6]:print('ROW',r,json.dumps(cells,ensure_ascii=False))
            print('TYPES',json.dumps({str(k):dict(v) for k,v in types.items()},ensure_ascii=False))
