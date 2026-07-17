# Web Read-only Baseline (Phase 2)

> 采样时间：2026-07-15；仅静态读取 `apps/web/src` 及测试文件，未运行 unit/system/build。每项数字的完整命令、cwd、排除项和退出码在 [evidence index](./evidence-index.md) 对应 `WEB-*`。

## Scope

- 生产统计定义为 `apps/web/src` 内 `.ts` / `.tsx` / `.vue`，排除 `*.test.*`、`*.spec.*`；不把 generated output、dependencies、`tasks/` 纳入。[`WEB-001`](./evidence-index.md#web-001)
- 结果为 **437 files / 85,932 LOC**；其中 **207 Vue / 55,889 LOC**，**230 TS / 30,043 LOC**，无 TSX。[`WEB-001`](./evidence-index.md#web-001)

## Bucket / domain size

| Bucket | Files | LOC | Evidence |
| --- | ---: | ---: | --- |
| `pages` | 40 | 16,627 | `WEB-001` |
| `domains/event` | 51 | 14,408 | `WEB-001` |
| `domains/admin` | 64 | 10,591 | `WEB-001` |
| `domains/pr` | 75 | 10,311 | `WEB-001` |
| `shared` | 62 | 8,899 | `WEB-001` |
| `domains/commerce` | 23 | 5,311 | `WEB-001` |
| `domains/admin-commerce` | 23 | 3,845 | `WEB-001` |
| `domains/share` | 24 | 3,416 | `WEB-001` |
| `processes` | 13 | 2,335 | `WEB-001` |
| `locales` | 2 | 2,087 | `WEB-001` |
| `domains/route` | 7 | 1,968 | `WEB-001` |
| remaining buckets/domains | 53 | 6,134 | `WEB-001` |

`remaining` 是 `app`、`lib`、`stores`、legacy router、app root/entry、types/styles 和其余小 domain 的总和；它仅避免将大量小 bucket 误写为不存在，不表示共同 owner。

## Legacy、transport 与 query-key seams

| Measure | Result | Reading |
| --- | ---: | --- |
| legacy `lib` | 7 files / 511 LOC | compatibility seam，且仍是 typed RPC/validation/clipboard 的 import hub |
| legacy `router` | 1 file / 1 LOC | compatibility seam |
| legacy `stores` | 1 file / 4 LOC | compatibility seam |
| retired top-level `queries` | 0 production files | 不应新增 fallback hook |
| `client.api` occurrences | 117 | 包含 query/command/process；不是 117 个违规 |
| `adminClient.api` occurrences | 81 | admin transport 仍独立 client seam |
| `client.api` in `.vue` | 1 | `WeChatOAuthCallbackPage.vue:84`，待定 compatibility seam |
| raw `fetch()` call sites | 5 | 两个 RPC wrapper、OAuth bind、admin ride-hailing page、XHS image download；需逐点判定而非全盘替换 |
| `queryKeys` references / literal `queryKey:` | 219 / 159 | 统一 key factory 已被广泛使用，但不是所有 Query options 都是 cache-key factory 违规 |
| literal `queryKey: [` | 2 | 均在 `domains/commerce/queries/useCommerce.ts`（253、607），是低成本复核候选 |

以上数字与命令见 `WEB-003` 至 `WEB-007`。

## Reactive / SFC hotspots（只作审查信号）

- syntactic calls：`reactive` **1**、`ref` **453**、`computed` **1,292**、`watch*` **169**、`useQuery` **50**、`useMutation` **78**。[`WEB-002`](./evidence-index.md#web-002)
- `.vue` ≥500 LOC 有 **37** 个；最大五个为 `AdminAnalyticsPage.vue` **1,746**、`AnchorEventFormModeSurface.vue` **1,438**、`AnchorEventLandingPage.vue` **1,343**、`AdminPRBasicView.vue` **1,141**、`AnchorEventCardModeSurface.vue` **1,085**。[`WEB-002`](./evidence-index.md#web-002)
- 解释约束：这些是复杂度候选，不是“必须拆分”的事实。Form Mode 已有明确 local state owner；Admin/Commerce 需要先做 flow/authority 取证再动。[`WEB-002`](./evidence-index.md#web-002)

## Static dependency topology

- alias/relative import resolver 的静态图发现 **707** 条跨 owner import edge、**94** 个 owner-pair；最大 pair 是 `pages → domains/admin` **84**、`domains/pr → shared` **58**、`pages → shared` **50**、`pages → domains/pr` **49**、`domains/event → shared` **38**。[`WEB-008`](./evidence-index.md#web-008)
- file graph 有 **1** 个多节点 SCC（**5** files）：`shared/telemetry/track.ts`、`processes/wechat/oauth-trace.ts`、`processes/wechat/oauth-login.ts`、`shared/api/auth-required-policy.ts`、`lib/rpc.ts`。[`WEB-008`](./evidence-index.md#web-008)
- top in-degree hubs：`lib/rpc.ts` **54**、`shared/api/query-keys.ts` **48**、`locales/i18n.ts` **40**、`domains/pr/model/types.ts` **34**、`shared/telemetry/track.ts` **27**。[`WEB-008`](./evidence-index.md#web-008)
- top out-degree files：`pages/PRPage.vue` **32**、`pages/AnchorEventLandingPage.vue` **26**、`pages/AdminAnchorEventPage.vue` **20**、`AnchorEventCardModeSurface.vue` **18**、`AnchorEventFormModeSurface.vue` **18**。[`WEB-008`](./evidence-index.md#web-008)

这张图是 import-level evidence：未解析 package import、动态 import（除 router page loader 外）或运行时 provider edges；因此 SCC 仅用于定位审查点，不能单独说明 runtime cycle。

## Routes、test visibility 与测试分布

- `app/router.ts` 有 **47** 个 `path:` route records；生产文件内有 **323** 个 `data-testid` attributes，分布在 **91** 个文件；`query-keys.ts` 有 **11** 个顶层 key-family methods。[`WEB-009`](./evidence-index.md#web-009)
- 检测到 **48** 个 test/scenario files：web domain tests 为 admin **1**、commerce **4**、event **8**、location **1**、payment **1**、pr **6**、route **3**、user **1**；web pages **2**、processes **2**、shared **9**；root scenario 为 admin **1**、anchor-event **3**、commerce **2**、pr-core **4**。[`WEB-010`](./evidence-index.md#web-010)

## Highest-risk facts and cheap rechecks

1. OAuth/RPC 既是 user-identity 边界又是唯一 SCC；任何拆分前先 recheck `WEB-008`，随后按 `WEB-011` 的 source lines 验证 nonce defer 顺序。
2. canonical PR preview 是跨 page/domain 的 read boundary；不要把 list item payload 重新升级为 entity truth。低成本重查 `WEB-012`。
3. 最大 SFC 与导入 hub 集中于 Form Mode、PR、Admin；大小数字只能确定 review prioritization，不能单独授权大重构。
