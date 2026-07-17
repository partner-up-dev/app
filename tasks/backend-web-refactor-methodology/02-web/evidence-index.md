# Web Evidence Index

| ID | Type | Claim | Source / command | Result | Confidence | Recheck cost |
| --- | --- | --- | --- | --- | --- | --- |
| WEB-001 | Command / Fact | production files, LOC, bucket/domain size | `cwd=/home/yyh/development/Anana/mvp-HA`; command below | 437 files / 85,932 LOC; full bucket output captured below | High | seconds |
| WEB-002 | Command / Fact | reactive/query counts and large SFC inventory | same command as WEB-001 | reactive 1, ref 453, computed 1,292, watch 169, useQuery 50, useMutation 78; 37 SFC ≥500 LOC | High (syntactic metric) | seconds |
| WEB-003 | Command / Fact | legacy-bucket size | same command as WEB-001 | lib 7/511 LOC, router 1/1, stores 1/4, queries 0/0 | High | seconds |
| WEB-004 | Command / Fact | direct RPC/raw fetch locations | `cwd=/home/yyh/development/Anana/mvp-HA`; command below | 117 `client.api`, 81 `adminClient.api`, 1 Vue `client.api`, 5 raw fetch | High (textual) | seconds |
| WEB-005 | Command / Fact | key normalization coverage | same commands as WEB-001 and WEB-004 | 219 `queryKeys` refs, 159 `queryKey:`; 2 literal arrays | High (textual) | seconds |
| WEB-006 | Source / Open question | `WeChatOAuthCallbackPage.vue` is Vue direct-RPC seam | `apps/web/src/pages/WeChatOAuthCallbackPage.vue:84`; WEB-004 command | one direct `client.api` Vue call | High for existence; low for intent | minutes |
| WEB-007 | Source / Fact | literal commerce query keys | `apps/web/src/domains/commerce/queries/useCommerce.ts:253,607`; command below | exactly two `queryKey: [` sites | High | seconds |
| WEB-008 | Command / Fact | cross-owner graph, SCC, hubs | `cwd=/home/yyh/development/Anana/mvp-HA`; command below | 707 cross-owner edges / 94 pairs; one 5-file SCC; hubs reported below | Medium-high (static resolver limits documented) | seconds |
| WEB-009 | Command / Fact | routes, testids and key-family method count | `cwd=/home/yyh/development/Anana/mvp-HA`; command below | 47 route records, 323 attributes in 91 files, 11 key families | High (textual) | seconds |
| WEB-010 | Command / Fact | test distribution | `cwd=/home/yyh/development/Anana/mvp-HA`; command below | 48 files; detailed distribution below | High | seconds |
| WEB-011 | Source / Fact | OAuth sequencing and nonce hygiene | `apps/web/src/processes/wechat/oauth-handoff.ts:28-84`; `apps/web/src/processes/auth/useAuthSessionBootstrap.ts:54-129`; `apps/web/src/processes/wechat/useRouteWeChatAutoLogin.ts:84-112` | nonce exchange includes credentials; bootstrap/auto-login defer | High | minutes |
| WEB-012 | Source / Fact | canonical PR preview read | `docs/20-product-tdd/pr-lifecycle-contracts.md:41-45`; `apps/web/src/domains/pr/ui/primitives/PRPreviewCard.vue:32-95` | card accepts id/context and queries canonical detail | High | minutes |

<a id="web-001"></a><a id="web-002"></a><a id="web-003"></a><a id="web-005"></a>

## WEB-001 / WEB-002 / WEB-003 / WEB-005 — inventory command

**cwd:** `/home/yyh/development/Anana/mvp-HA`

**exclusions:** test/spec files, dependencies, generated output, caches and `tasks/` (the walk starts only at `apps/web/src`).
**exit:** 0

```bash
node - <<'NODE'
const fs=require('fs'), path=require('path'); const root='apps/web/src';
const exts=new Set(['.ts','.tsx','.vue']);
const isProd=p=>exts.has(path.extname(p))&&!/\.(test|spec)\.[^.]+$/.test(p);
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);}
const files=walk(root).filter(isProd), lines=p=>fs.readFileSync(p,'utf8').split(/\r?\n/).length-1;
const bucket=p=>{const r=path.relative(root,p).split(path.sep);return r[0]==='domains'?`domains/${r[1]||''}`:r[0]};
const agg=new Map;for(const f of files){const k=bucket(f),v=agg.get(k)||[0,0];v[0]++;v[1]+=lines(f);agg.set(k,v)}
console.log('PRODUCTION_FILES',files.length,'LOC',files.reduce((n,f)=>n+lines(f),0));console.log('BY_BUCKET');[...agg].sort().forEach(([k,[n,l]])=>console.log(k,n,l));
console.log('BY_EXTENSION');for(const e of ['.vue','.ts','.tsx']){const a=files.filter(f=>path.extname(f)===e);console.log(e,a.length,a.reduce((n,f)=>n+lines(f),0));}
console.log('LEGACY');for(const d of ['lib','queries','router','stores']){const a=files.filter(f=>path.relative(root,f).startsWith(d+'/'));console.log(d,a.length,a.reduce((n,f)=>n+lines(f),0));}
const text=f=>fs.readFileSync(f,'utf8');const occ=re=>files.reduce((n,f)=>n+(text(f).match(re)||[]).length,0);
console.log('REACTIVITY','reactive',occ(/\breactive\s*\(/g),'ref',occ(/\bref\s*(?:<[^>]*>)?\s*\(/g),'computed',occ(/\bcomputed\s*(?:<[^>]*>)?\s*\(/g),'watch',occ(/\bwatch(?:Effect|PostEffect|SyncEffect)?\s*\(/g),'useQuery',occ(/\buseQuery\s*(?:<[^>]*>)?\s*\(/g),'useMutation',occ(/\buseMutation\s*(?:<[^>]*>)?\s*\(/g));
const large=files.filter(f=>f.endsWith('.vue')).map(f=>[lines(f),f]).filter(([n])=>n>=500).sort((a,b)=>b[0]-a[0]);console.log('LARGE_SFC_GE_500',large.length);large.forEach(([n,f])=>console.log(n,f));
console.log('QUERY_KEY','queryKeys_refs',occ(/\bqueryKeys\b/g),'literal_queryKey',occ(/\bqueryKey\s*:/g));
NODE
```

<a id="web-004"></a><a id="web-007"></a>

## WEB-004 / WEB-007 — transport/key seam command

**cwd:** `/home/yyh/development/Anana/mvp-HA`

**exclusions:** tests/specs, `tasks/`, dependencies and generated output through explicit `apps/web/src` scope.
**exit:** 0

```bash
printf 'client.api: '; rg -o '\bclient\.api\b' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
printf 'adminClient.api: '; rg -o '\badminClient\.api\b' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
printf 'vue client.api: '; rg -o '\bclient\.api\b' apps/web/src -g '*.vue' -g '!**/*.{test,spec}.*' | wc -l
printf 'raw fetch: '; rg -n --glob '*.{ts,vue}' '(?<![\w.])fetch\s*\(' apps/web/src -g '!**/*.{test,spec}.*' -P | wc -l
rg -n --glob '*.{ts,vue}' 'queryKey:\s*\[' apps/web/src -g '!**/*.{test,spec}.*'
```

<a id="web-008"></a>

## WEB-008 — import graph command

**cwd:** `/home/yyh/development/Anana/mvp-HA`

**exclusions:** test/spec files, package imports, generated output, dependencies, caches and `tasks/`; resolver only accepts aliases and relative imports that resolve to in-scope `.ts`/`.tsx`/`.vue` files.
**exit:** 0

```bash
node - <<'NODE'
const fs=require('fs'),path=require('path');const root=path.resolve('apps/web/src'),exts=['.ts','.tsx','.vue'],isProd=p=>exts.includes(path.extname(p))&&!/\.(test|spec)\.[^.]+$/.test(p);
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])};const files=walk(root).filter(isProd),byAbs=new Set(files.map(f=>path.resolve(f)));
function owner(f){const a=path.relative(root,f).split(path.sep);return a[0]==='domains'?`domains/${a[1]}`:a[0]}function resolve(f,s){let b=s.startsWith('@/')?path.join(root,s.slice(2)):s.startsWith('.')?path.resolve(path.dirname(f),s):null;if(!b)return null;for(const p of [b,...exts.map(e=>b+e),...exts.map(e=>path.join(b,'index'+e))])if(byAbs.has(path.resolve(p)))return path.resolve(p);return null}
const out=new Map(files.map(f=>[path.resolve(f),new Set()]));for(const f of files){for(const m of fs.readFileSync(f,'utf8').matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){const t=resolve(f,m[1]);if(t)out.get(path.resolve(f)).add(t)}}
const edges=new Map;for(const [f,ts]of out)for(const t of ts){const a=owner(f),b=owner(t);if(a!==b){const k=`${a} -> ${b}`;edges.set(k,(edges.get(k)||0)+1)}}console.log('CROSS_OWNER_EDGES',[...edges.values()].reduce((a,b)=>a+b,0),'PAIRS',edges.size);[...edges].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30).forEach(([k,v])=>console.log(v,k));
let i=0;const idx=new Map,low=new Map,stack=[],on=new Set,scc=[];function go(v){idx.set(v,i);low.set(v,i++);stack.push(v);on.add(v);for(const w of out.get(v)){if(!idx.has(w)){go(w);low.set(v,Math.min(low.get(v),low.get(w)))}else if(on.has(w))low.set(v,Math.min(low.get(v),idx.get(w)))}if(low.get(v)===idx.get(v)){const a=[];let w;do{w=stack.pop();on.delete(w);a.push(w)}while(w!==v);if(a.length>1)scc.push(a)}}for(const f of out.keys())if(!idx.has(f))go(f);console.log('FILE_SCC_GT_1',scc.length);scc.sort((a,b)=>b.length-a.length).forEach(a=>console.log(a.length,a.map(f=>path.relative(root,f)).join(' | ')));
const inD=new Map(files.map(f=>[path.resolve(f),0]));for(const ts of out.values())for(const t of ts)inD.set(t,inD.get(t)+1);console.log('HUBS_IN');[...inD].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([f,n])=>console.log(n,path.relative(root,f)));console.log('HUBS_OUT');[...out].sort((a,b)=>b[1].size-a[1].size).slice(0,15).forEach(([f,ts])=>console.log(ts.size,path.relative(root,f)));
NODE
```

<a id="web-009"></a>

## WEB-009 — routes/testids command

**cwd:** `/home/yyh/development/Anana/mvp-HA`

**exclusions:** test/specs for testid scan; dependencies/generated output/caches/`tasks/` are outside `apps/web/src`.
**exit:** 0

```bash
printf 'route records: '; rg -n '^\s*path:' apps/web/src/app/router.ts | wc -l
printf 'data-testid attributes: '; rg -o 'data-testid' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
printf 'testid-bearing production files: '; rg -l 'data-testid' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
printf 'query-key factory methods: '; rg -n '^\s{2}[a-zA-Z][a-zA-Z0-9]*:' apps/web/src/shared/api/query-keys.ts | wc -l
```

<a id="web-010"></a>

## WEB-010 — test distribution command

**cwd:** `/home/yyh/development/Anana/mvp-HA`

**exclusions:** dependencies, generated output and caches; this command intentionally includes only test/spec/scenario-test files under `apps/web/src` and `tests/scenario`.
**exit:** 0

```bash
node - <<'NODE'
const fs=require('fs'),path=require('path'),roots=['apps/web/src','tests/scenario'];function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])};const files=roots.flatMap(walk).filter(f=>/\.(test|spec|scenario\.test)\.(ts|tsx|vue)$/.test(f));const key=f=>{const x=f.split(path.sep);if(x[0]==='apps')return x[3]==='domains'?`web/domains/${x[4]}`:`web/${x[3]}`;return `scenario/${x[2]||'root'}`};const m=new Map;for(const f of files)m.set(key(f),(m.get(key(f))||0)+1);console.log('TEST_FILES',files.length);[...m].sort().forEach(([k,n])=>console.log(k,n));
NODE
```
