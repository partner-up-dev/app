# Backend read-only baseline（Phase 2）

快照日期：2026-07-15（Asia/Shanghai）。所有命令从仓库根目录
`/home/yyh/development/Anana/mvp-HA` 执行。除非命令另有说明，生产源范围是
`apps/backend/src/**/*.ts`，排除 `*.test.ts`、`*.spec.ts`，不读取
`node_modules/`、`dist/`、`build/`、虚拟环境、cache 或 `tasks/`。本文件只做
静态目录/文本/相对 import 分析；未执行 unit、scenario、build 或 database command。

## 1. 计数口径总览

| 指标 | 当前结果 | 可复跑证据 |
| --- | ---: | --- |
| 生产 TypeScript 文件 / LOC | 481 / 57,298 | BE-BL-001 |
| 全部 TypeScript（含测试）文件 / LOC | 549 / 65,812 | BE-BL-001 |
| Controllers（生产）文件 / LOC | 29 / 6,760 | BE-BL-001 |
| Domains（生产）文件 / LOC | 293 / 29,864 | BE-BL-001 |
| Entities / Repositories / Infra / Services（生产） | 37 / 3,385；36 / 4,945；41 / 7,246；14 / 2,479 | BE-BL-001 |
| Auth / lib（生产） | 5 / 416；15 / 880 | BE-BL-001 |
| Hono controller method-chain declarations | 194（含未挂载 canonical）；192（排除 canonical） | BE-BL-002 |
| index mount calls / API / internal | 28 / 27 / 1 | BE-BL-002 |
| index 顶层 verification + health routes | 3 | BE-BL-002 |
| method-chain method counts | GET 92，POST 78，PATCH 16，PUT 4，DELETE 2，ALL 2 | BE-BL-002 |
| `zValidator(` calls / direct `c.req.json()` | 188 / 0 | BE-BL-003 |
| direct controller `c.json({ error... })` lines | 25 | BE-BL-003 |
| relative import specifiers / 3+ `../` deep imports | 2,178 / 909 | BE-BL-004 |
| static import graph edges / unique edges | 2,177 / 2,122 | BE-BL-005 |
| cyclic SCC / largest SCC | 3 / 38 nodes | BE-BL-005 |
| top inbound hubs | `lib/problem-details` 140；`entities/user` 124；`entities/partner-request` 114 | BE-BL-005 |
| top outbound hubs | `index` 51；`entities/index` 35；`domains/trade/use-cases/create-order` 29 | BE-BL-005 |
| lexical module-level `new` expressions / DI-like subset | 449 / 379 | BE-BL-006 |
| 500+ / 800+ LOC 生产文件 | 16 / 4 | BE-BL-007 |
| source test files / LOC | 68 / 8,514 | BE-BL-008 |
| backend scenario files / root scenario files / total test files | 26 / 10 / 104 | BE-BL-008 |
| Drizzle / data migration SQL / total | 72 / 12 / 84 | BE-BL-009 |
| migration prefix range / gaps / duplicates | 0000–0085 / 0063,0066 / none | BE-BL-009 |

### Route count semantics

`194/192` 是对 `apps/backend/src/controllers/*.controller.ts` 中
`.get/.post/.put/.patch/.delete/.options/.all(` 的文本出现次数，不是 unique public
endpoint 数，也不是 Hono runtime 展开后的 route table。一个 chain method 一次计数；
同一路径不同 method 分开计数；多行 path 仍按 method token 计一次。`194` 含
未被 `src/index.ts` import/mount 的 `canonical.controller.ts` 两个 declaration；
`192` 排除它。当前有 27 个 `/api/*` mount、1 个 `/internal/*` mount，以及 index
中 3 个顶层 verification/health routes；`/api/payment` 与 `/api/admin` 的重复
mount 是组合多个 route module 的结果，不应当解读为 unique family 数。

## 2. Domain size（生产，不含测试）

命令输出如下；它按 domain 目录递归统计 `*.ts`，排除测试/spec。

| Domain | files | LOC |
| --- | ---: | ---: |
| pr-core | 58 | 5,383 |
| trade | 27 | 5,343 |
| anchor-event | 21 | 3,621 |
| ride-hailing | 14 | 2,645 |
| notification | 16 | 2,519 |
| payment | 14 | 2,195 |
| admin-anchor-management | 23 | 1,676 |
| merchandising | 21 | 1,368 |
| bill | 15 | 1,109 |
| pr | 17 | 1,177 |
| admin-commerce-management | 11 | 497 |
| study-sprint | 10 | 419 |
| admin-payment-management | 4 | 327 |
| admin-ride-hailing-management | 7 | 344 |
| anchor-event-route-application | 6 | 298 |
| feedback-questionnaire | 5 | 264 |
| user | 7 | 309 |
| fulfillment | 10 | 174 |
| poi | 7 | 196 |

复跑：

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 排除：*.test.ts、*.spec.ts；只扫描 apps/backend/src/domains/*
for d in apps/backend/src/domains/*; do
  [ -d "$d" ] || continue
  files=$(find "$d" -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' | wc -l)
  loc=$(find "$d" -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print0 |
    xargs -0 -r wc -l | awk 'END{print $1+0}')
  printf '%-42s files=%3s loc=%5s\n' "${d#apps/backend/src/domains/}" "$files" "$loc"
done | sort -k3nr
```

## 3. 生产文件/LOC 与 routes

### BE-BL-001：文件/LOC

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 生产：apps/backend/src/**/*.ts，排除 *.test.ts、*.spec.ts
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print | wc -l
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print0 |
  xargs -0 wc -l | tail -n1
# 全部 TS（含测试；仍排除生成目录，因为根位于 src）
find apps/backend/src -type f -name '*.ts' -print | wc -l
find apps/backend/src -type f -name '*.ts' -print0 | xargs -0 wc -l | tail -n1
# 分类：同一排除口径
for d in controllers domains entities repositories infra services auth lib; do
  files=$(find "apps/backend/src/$d" -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' | wc -l)
  loc=$(find "apps/backend/src/$d" -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print0 |
    xargs -0 -r wc -l | awk 'END{print $1+0}')
  printf '%-14s files=%3s loc=%5s\n' "$d" "$files" "$loc"
done
```

结果：生产 481 files / 57,298 LOC；全部 TS 549 / 65,812；分类见 §1。

### BE-BL-002：Hono declarations / mounts

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 只匹配 controller method-chain token；排除 test controller
rg -o --glob '*.controller.ts' --glob '!*.test.ts' \
  '\.(get|post|put|patch|delete|options|all)\(' apps/backend/src/controllers | wc -l
rg -o --glob '*.controller.ts' --glob '!canonical.controller.ts' --glob '!*.test.ts' \
  '\.(get|post|put|patch|delete|options|all)\(' apps/backend/src/controllers | wc -l
rg -n '\.route\(' apps/backend/src/index.ts | wc -l
rg -n '\.route\("/api/' apps/backend/src/index.ts | wc -l
rg -n '\.route\("/internal/' apps/backend/src/index.ts | wc -l
rg -n '^app\.(get|post|put|patch|delete)\(' apps/backend/src/index.ts | wc -l
rg -o --glob '*.controller.ts' --glob '!*.test.ts' \
  '\.(get|post|put|patch|delete|options|all)\(' apps/backend/src/controllers |
  sed -E 's/.*\.([a-z]+)\(.*/\1/' | sort | uniq -c
```

结果：194（含 canonical）、192（排除 canonical）、mount 28（API 27/internal 1）、
顶层 3；method 分布 GET 92/POST 78/PATCH 16/PUT 4/DELETE 2/ALL 2。

## 4. Validation / legacy seam scan

### BE-BL-003：controller boundary

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 生产 controllers，排除 test controller
rg -o --glob '*.controller.ts' --glob '!*.test.ts' 'zValidator\(' apps/backend/src/controllers | wc -l
rg -n --glob '*.controller.ts' --glob '!*.test.ts' \
  'c\.req\.(json|parseBody)\(' apps/backend/src/controllers | wc -l
rg -n --glob '*.controller.ts' --glob '!*.test.ts' \
  'c\.json\(\s*\{[^\n]*(error|message)' apps/backend/src/controllers | wc -l
# legacy service / repository / domain import edges（完整 path 供复核）
rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./services/' apps/backend/src/controllers
rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./repositories/' apps/backend/src/controllers
rg -n --glob '*.ts' --glob '!*.test.ts' \
  'from "\.\./\.\./\.\./services/|from "\.\./\.\./services/' apps/backend/src/domains
```

结果：`zValidator` 188、direct `c.req.json/parseBody` 0、direct controller error
responses 25；controller→legacy services 11 条，controller→repositories 7 条，
domains→top-level legacy services 2 条。raw `c.req.text/formData` callback/upload
路径不纳入 direct JSON count。

## 5. Import edges / SCC / hubs

### BE-BL-004：relative import depth 与反向层边

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 生产 TS；排除 *.test.ts、*.spec.ts；仅统计 from-specifier 文本
rg -o --glob '*.ts' --glob '!*.test.ts' --glob '!*.spec.ts' \
  "from ['\"]\.\.?/" apps/backend/src | wc -l
rg -o --glob '*.ts' --glob '!*.test.ts' --glob '!*.spec.ts' \
  "from ['\"](\.\./){3,}" apps/backend/src | wc -l
printf 'controller→legacy='; rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./services/' apps/backend/src/controllers | wc -l
printf 'controller→repository='; rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./repositories/' apps/backend/src/controllers | wc -l
printf 'domain→legacy='; rg -n --glob '*.ts' --glob '!*.test.ts' \
  'from "\.\./\.\./\.\./services/|from "\.\./\.\./services/' apps/backend/src/domains | wc -l
printf 'repository→domain='; rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./domains/' apps/backend/src/repositories | wc -l
printf 'entity→domain='; rg -n --glob '*.ts' --glob '!*.test.ts' 'from "\.\./domains/' apps/backend/src/entities | wc -l
printf 'infra→legacy='; rg -n --glob '*.ts' --glob '!*.test.ts' \
  'from "\.\./\.\./services/|from "\.\./\.\./\.\./services/' apps/backend/src/infra | wc -l
```

结果：relative specifiers 2,178；3+ `../` deep 909；controller→legacy 11、
controller→repository 7、domain→legacy 2、repository→domain 8、entity→domain 14、
infra→legacy 2。注意：这些是 import 文本边，不是 runtime call graph。

### BE-BL-005：静态 graph、SCC、hub

下列 inline Node 只解析 production `*.ts` 的相对 `import/export ... from` 与
side-effect import；排除 tests/spec；不解析 path alias、动态 import、运行时 DI。

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
node --input-type=module <<'NODE'
import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('apps/backend/src'), files=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()) walk(p); else if(e.isFile()&&p.endsWith('.ts')&&!p.endsWith('.test.ts')&&!p.endsWith('.spec.ts')) files.push(p)}};
walk(root); files.sort();
const key=p=>path.relative(root,p).split(path.sep).join('/').replace(/\.ts$/,'');
const nodes=new Set(files.map(key));
const resolve=(from,s)=>{if(!s.startsWith('.')) return null; const b=path.normalize(path.join(path.dirname(from),s));
  for(const c of [b,`${b}.ts`,path.join(b,'index.ts')]) if(nodes.has(key(c))) return key(c); return null;};
const edges=[], rx=/(?:from\s+|import\s*)["']([^"']+)["']/g;
for(const f of files){const t=fs.readFileSync(f,'utf8'); let m; while((m=rx.exec(t))){const to=resolve(f,m[1]); if(to) edges.push([key(f),to,m[1]]);}}
const indeg=new Map([...nodes].map(n=>[n,0])), outdeg=new Map([...nodes].map(n=>[n,0]));
for(const [a,b] of edges){indeg.set(b,indeg.get(b)+1); outdeg.set(a,outdeg.get(a)+1);}
const top=(m)=>[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
console.log({files:files.length,edges:edges.length,uniqueEdges:new Set(edges.map(([a,b])=>a+'\\0'+b)).size,
  topIn:top(indeg),topOut:top(outdeg)});
const adj=new Map([...nodes].map(n=>[n,[]])); for(const [a,b] of edges) if(a!==b&&!adj.get(a).includes(b)) adj.get(a).push(b);
let i=0,stack=[],on=new Set(),idx=new Map(),low=new Map(),scc=[];
function strong(v){idx.set(v,i);low.set(v,i++);stack.push(v);on.add(v);for(const w of adj.get(v)){
  if(!idx.has(w)){strong(w);low.set(v,Math.min(low.get(v),low.get(w)));}
  else if(on.has(w)) low.set(v,Math.min(low.get(v),idx.get(w)));}
  if(low.get(v)===idx.get(v)){const c=[];let w;do{w=stack.pop();on.delete(w);c.push(w)}while(w!==v);scc.push(c);}}
for(const n of nodes) if(!idx.has(n)) strong(n);
const cyclic=scc.filter(c=>c.length>1).sort((a,b)=>b.length-a.length);
console.log({sccCount:scc.length,cyclicSccCount:cyclic.length,largestCyclicSize:cyclic[0]?.length??0});
NODE
```

结果：481 nodes，2,177 edges / 2,122 unique edges；3 cyclic SCC，最大 SCC 38；
top inbound `lib/problem-details` 140、`entities/user` 124、`entities/partner-request`
114；top outbound `index` 51、`entities/index` 35、`domains/trade/use-cases/create-order`
29。`rg` 的 2,178 与 parser 的 2,177 相差一条：`canonical.controller.ts` 的
`../services/YourService` 是相对 `from` specifier，但目标文件不存在，解析器因此只计入
2,177 条可解析边；故两个数字不可混称。

## 6. Module-level constructors / composition seams

### BE-BL-006

“module-level”按 lexical brace depth 为 0 的 `new Class(...)` token 计数；
“DI-like”只保留 `Hono`、`*Repository`、`*Service`、`JobRunnerImpl`、
`PricingApplication`，不代表每个实例都需要注入重构。

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
node --input-type=module <<'NODE'
import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('apps/backend/src'), files=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()) walk(p); else if(e.isFile()&&p.endsWith('.ts')&&!p.endsWith('.test.ts')&&!p.endsWith('.spec.ts')) files.push(p)}}; walk(root);
let all=0,di=0;
for(const f of files){let depth=0;for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){
  if(depth===0) for(const m of line.matchAll(/\bnew\s+([A-Za-z_$][\w$]*)/g)){all++;const n=m[1];
    if(n==='Hono'||n.endsWith('Repository')||n.endsWith('Service')||n==='JobRunnerImpl'||n==='PricingApplication') di++;}
  depth+=(line.match(/{/g)||[]).length-(line.match(/}/g)||[]).length;}}
console.log({moduleLevelNew:all,diLike:di});
NODE
rg -o --glob '*.ts' --glob '!*.test.ts' --glob '!*.spec.ts' \
  'setInterval\(' apps/backend/src | wc -l
```

结果：module-level `new` 449、DI-like 379、`setInterval(` 0。代表性 composition seam：`partner-request.controller.ts:56-58`、
`wechat.controller.ts:53-58`、多个 domain use-case 的 module-level repositories，
以及 `index.ts:76` 的 `new Hono()` 与 import-time job registration。

## 7. Large files

### BE-BL-007

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 生产源；排除 tests/spec；不读取生成目录
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -exec wc -l {} + |
  awk '$1>=500 && $2!="total"{c++} END{print "ge500=" c+0}'
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -exec wc -l {} + |
  awk '$1>=800 && $2!="total"{c++} END{print "ge800=" c+0}'
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -exec wc -l {} + |
  sort -nr | sed -n '1,21p'
```

结果：`>=500` 16 files，`>=800` 4 files。最大文件为：

| file | LOC |
| --- | ---: |
| `controllers/wechat.controller.ts` | 2,038 |
| `domains/ride-hailing/services/caocao-provider.ts` | 1,222 |
| `domains/trade/use-cases/create-order.ts` | 1,179 |
| `infra/analytics/anchor-event-funnel.model.ts` | 1,044 |
| `domains/payment/services/payment-provider.ts` | 726 |
| `repositories/UserNotificationOptRepository.ts` | 719 |
| `domains/trade/use-cases/cancel-ride-hailing-order-from-order-detail.ts` | 676 |
| `domains/trade/use-cases/offer-listing.ts` | 667 |
| `repositories/PartnerRepository.ts` | 636 |
| `controllers/admin-commerce-management.controller.ts` | 601 |

## 8. Test distribution

### BE-BL-008

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# source unit-ish tests
find apps/backend/src -type f \( -name '*.test.ts' -o -name '*.spec.ts' \) -print | wc -l
find apps/backend/src -type f \( -name '*.test.ts' -o -name '*.spec.ts' \) -print0 |
  xargs -0 wc -l | tail -n1
# backend scenario 与 root cross-unit scenario；排除 node_modules/generated
find apps/backend/tests -type f \( -name '*.test.ts' -o -name '*.scenario.test.ts' \) -print | wc -l
find tests/scenario -type f \( -name '*.test.ts' -o -name '*.scenario.test.ts' \) -print | wc -l
find apps/backend/src apps/backend/tests tests/scenario -type f \
  \( -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.scenario.test.ts' \) -print | wc -l
```

结果：source tests 68 files / 8,514 LOC；backend scenario 26；root system scenario 10；
全局 test file count 104。source test 按 top-level：domains 48、infra 12、services 3、
entities 2、scripts 1、lib 1、controllers 1。未运行任何测试；这些数字只表示文件分布。

## 9. Migration directory baseline

### BE-BL-009

```bash
# cwd: /home/yyh/development/Anana/mvp-HA
# 只读文件名；不连接数据库、不读取 app_migrations 实例
node --input-type=module <<'NODE'
import fs from 'node:fs'; import path from 'node:path';
const rows=[]; for(const d of ['apps/backend/drizzle','apps/backend/data-migrations'])
  for(const f of fs.readdirSync(d)){const m=f.match(/^(\d+)_.*\.sql$/);if(m) rows.push([Number(m[1]),path.join(d,f)]);}
rows.sort((a,b)=>a[0]-b[0]); const ns=rows.map(r=>r[0]); const gaps=[];
for(let n=ns[0];n<=ns.at(-1);n++) if(!ns.includes(n)) gaps.push(n);
const dup=ns.filter((n,i)=>ns.indexOf(n)!==i);
console.log({drizzle:rows.filter(([,p])=>p.startsWith('apps/backend/drizzle/')).length,
 dataMigrations:rows.filter(([,p])=>p.startsWith('apps/backend/data-migrations/')).length,
 total:rows.length,min:ns[0],max:ns.at(-1),gaps,duplicates:[...new Set(dup)]});
NODE
```

结果：Drizzle 72、data 12、total 84；prefix 0–85；gaps `[63,66]`（即 0063/0066）；
duplicates `[]`。目录数字不证明某 migration 已在任何环境应用。

## 10. Interpretation limits

- SCC/hub/deep import 结果是静态相对 import 拓扑，不是运行时依赖、SQL 查询图或网络调用图。
- LOC 受 formatter/注释影响，适合比较同一命令口径下的后续快照，不适合作为质量分数。
- route declaration count 不等于 unique endpoint count；要回答 endpoint uniqueness 需 Hono route introspection 或运行时注册表，未在本阶段执行。
- Provider、OAuth 和 callback raw body 的 payload schema 需要 scenario/contract evidence；静态 `zValidator` count 不能证明完整行为正确。
