#!/usr/bin/env python3
from pathlib import Path
import csv, hashlib, json, subprocess, textwrap, zipfile
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4

ROOT=Path.cwd(); APP=Path('apps/web'); OUT=Path('soft-copyright-source'); OUT.mkdir(exist_ok=True)
NAME='PartnerUp Web 软件'; VERSION='V3.2.0'; REF='develop'; LPP=50
SUFFIX={'.vue','.ts','.tsx','.js','.jsx','.mjs','.cjs','.css','.scss','.sass','.less','.html'}
EXCLUDES=('node_modules/','dist/','coverage/','.vite/','.output/','public/','scripts/','/__tests__/','/__mocks__/','/tests/','/test/','/mocks/','/fixtures/')
BAD=('.test.','.spec.','.stories.','.story.','.snap','.generated.','.gen.')
TOP={'index.html','vite.config.ts','uno.config.ts','unocss.config.ts'}

def sh(*a): return subprocess.check_output(a,text=True).strip()
commit=sh('git','rev-parse','30f51b96e2498b4b85014552512a31a7345d86cb')
tracked=sh('git','ls-tree','-r','--name-only',commit,'--','apps/web').splitlines()

def include(p):
 r=p[len('apps/web/'):]
 if Path(r).suffix.lower() not in SUFFIX: return False
 if not (r.startswith('src/') or r in TOP): return False
 q='/'+r
 if any(x in q for x in EXCLUDES) or any(x in r for x in BAD): return False
 return True

def rank(p):
 r=p[len('apps/web/'):]
 order=['src/app/','src/domains/','src/processes/','src/pages/','src/shared/','src/stores/','src/lib/','src/router/','src/locales/','src/styles/']
 for i,x in enumerate(order):
  if r.startswith(x): return (i,r.lower())
 return (99,r.lower())
files=sorted([p for p in tracked if include(p)],key=rank)
rows=[]; file_meta=[]
for idx,p in enumerate(files,1):
 data=subprocess.check_output(['git','show',f'{commit}:{p}'])
 text=data.decode('utf-8','replace').replace('\r\n','\n').replace('\r','\n')
 lines=text.split('\n')
 if lines and lines[-1]=='': lines.pop()
 first=len(rows)+1
 for n,line in enumerate(lines,1):
  expanded=line.expandtabs(2)
  chunks=textwrap.wrap(expanded,width=108,replace_whitespace=False,drop_whitespace=False) or ['']
  for j,ch in enumerate(chunks,1): rows.append({'file_id':f'F{idx:04d}','path':p,'line':n,'seg':j,'text':ch})
 file_meta.append({'file_id':f'F{idx:04d}','path':p,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'source_lines':len(lines),'first_display_row':first,'last_display_row':len(rows)})
all_pages=[rows[i:i+LPP] for i in range(0,len(rows),LPP)]
if len(all_pages)>60:
 selected=all_pages[:30]+all_pages[-30:]; mode='front_30_back_30'
else: selected=all_pages; mode='full'

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
pdf=OUT/'source-program-identification-material.pdf'; c=Canvas(str(pdf),pagesize=A4)
w,h=A4
for pn,page in enumerate(selected,1):
 c.setFont('STSong-Light',8); c.drawString(36,h-28,f'{NAME} {VERSION} 源程序鉴别材料')
 c.setFont('STSong-Light',6.5); c.drawRightString(w-36,h-28,f'提交 {commit[:12]} | {REF}')
 y=h-45
 for r in page:
  c.setFont('STSong-Light',5.8); c.drawString(28,y,f"{r['file_id']} {r['line']:06d} | {r['text']}")
  y-=14.3
 c.setFont('STSong-Light',7); c.drawString(36,20,'仓库：partner-up-dev/app | 路径：apps/web')
 c.drawRightString(w-36,20,f'第 {pn} 页 / 共 {len(selected)} 页'); c.showPage()
c.save()
with (OUT/'source-files.csv').open('w',newline='',encoding='utf-8-sig') as f:
 wr=csv.DictWriter(f,fieldnames=file_meta[0].keys()); wr.writeheader(); wr.writerows(file_meta)
with (OUT/'source-page-map.csv').open('w',newline='',encoding='utf-8-sig') as f:
 wr=csv.writer(f); wr.writerow(['material_page','row_on_page','file_id','path','source_line','segment'])
 for pn,page in enumerate(selected,1):
  for rn,r in enumerate(page,1): wr.writerow([pn,rn,r['file_id'],r['path'],r['line'],r['seg']])
manifest={'schema_version':1,'software':{'name':NAME,'version':VERSION},'source':{'repository':'https://github.com/partner-up-dev/app','ref':REF,'commit_sha':commit,'application_root':'apps/web'},'selection':{'mode':mode,'lines_per_page':LPP,'source_files':len(files),'display_rows':len(rows),'material_pages':len(selected)},'files':file_meta}
(OUT/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'README.md').write_text(f'# 源程序鉴别材料\n\n- 软件名称：{NAME}\n- 版本：{VERSION}\n- 固定提交：`{commit}`\n- 纳入文件：{len(files)}\n- 排版代码行：{len(rows)}\n- 输出页数：{len(selected)}\n- 选择方式：{mode}\n',encoding='utf-8')
zip_path=OUT/'source-program-identification-material.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for p in [pdf,OUT/'source-files.csv',OUT/'source-page-map.csv',OUT/'source-manifest.json',OUT/'README.md']:
  z.write(p,p.name)
print(zip_path)
