import sys,zipfile,xml.etree.ElementTree as ET,collections,json
N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def col(ref):
 n=0
 for c in ref:
  if not c.isalpha():break
  n=n*26+ord(c)-64
 return n-1
def read(path):
 with zipfile.ZipFile(path) as z:
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():shared=[''.join(t.text or '' for t in si.findall('.//m:t',N)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',N)]
  root=ET.fromstring(z.read('xl/worksheets/sheet1.xml')); result=[]
  for row in root.findall('.//m:sheetData/m:row',N):
   cells={}
   for c in row.findall('m:c',N):
    v=c.find('m:v',N);inline=c.find('m:is',N);value=v.text if v is not None else None
    if c.attrib.get('t')=='s' and value is not None:value=shared[int(value)]
    if inline is not None:value=''.join(t.text or '' for t in inline.findall('.//m:t',N))
    if value is not None:cells[col(c.attrib['r'])]=value
   if cells:result.append((int(row.attrib['r']),cells))
  return result
src=read(sys.argv[1]);dst=read(sys.argv[2]); sh=src[2][1];dh=dst[0][1]
print('source headers',len(sh),'main headers',len(dh),'data rows',len(src)-3,len(dst)-1)
mapping={i:(i if i<2 else i+1) for i in range(29) if i!=2}
print('header mismatches',[(i,sh[i],dh.get(j)) for i,j in mapping.items() if sh[i]!=dh.get(j)])
differences=[]
for ix,((_,s),(_,d)) in enumerate(zip(src[3:],dst[1:]),1):
 for i,j in mapping.items():
  if s.get(i)!=d.get(j):differences.append((ix,i,s.get(i),d.get(j)))
 for j in (2,3):
  if d.get(j) is not None:differences.append((ix,j,'expected blank',d[j]))
print('value differences',len(differences))
print('first differences',json.dumps(differences[:10],ensure_ascii=False))
print('brand counts',json.dumps(dict(collections.Counter(s.get(3,'') for _,s in src[3:])),ensure_ascii=False))
