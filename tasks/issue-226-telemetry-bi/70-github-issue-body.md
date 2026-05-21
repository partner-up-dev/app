为了验证 L1:re2 的效果（用户是否会自发组织活动，并形成长期、重复的行为），需要改进用户行为采集系统，并在 BI 中稳定报告相关指标。

本 issue 的重点不是“多加几个埋点”，而是建立一套技术上可维护的 user telemetry → enrichment → BI projection 机制。用户行为 raw event 应尽量极简、append-only、forward-only、可重放；BI 所需复杂上下文应通过上下文事件流、业务状态和后续 projection materialize，而不是要求每一条前端行为事件都携带大量冗余字段。

## Sub-Issues

- #240: Telemetry Substrate, Registry, Storage, Ingest, And Data Migration
  - Task packet: `tasks/issue-240-telemetry-substrate/`
- #241: User Event Migration, BI Projections, Dashboard, And Release Verification
  - Task packet: `tasks/issue-241-user-event-bi/`

## 需要支持的 BI 问题

- 3 / 5 / 7 天，或任意时间跨度的回访率（按 UV）。
- 人均 PR 数。
- PR 成局率、关闭率、过期率。
  - 这类生命周期指标优先基于业务事实数据，例如 PR 表当前 status 的 row 统计，而不是来自用户行为事件。
  - 生命周期 cohort 使用 PR `created_at` 与 PR 时间窗 `endAt` 作为业务日期维度。
- 用户从某些 Anchor Event（例如自习、慢跑）进入产品后，是否自然延伸到其它类型的 Anchor Event（例如羽毛球、通勤等）。
  - 这里应排除广告等外部投放入口导致的非自然路径。
- 各类“看看其它活动”的转化率。
- PR join / create 等核心路径的漏斗转化：看到 → 表达意图 → 请求提交 → 后端确认成功 / 失败。

## 核心设计原则

1. **user telemetry raw event 是账本，不是报表**
   - 原始用户行为事件 append-only / forward-only。
   - 不依赖修改历史事件来修正 BI。
   - BI 表是业务事实数据、user telemetry、程序行为信号的 projection / materialized view。

2. **用户行为采集只收用户行为链路**
   - 前端报告用户观察和意图，例如 `*.viewed`、`*.clicked`、`*.intent_submitted`。
   - 后端可以报告用户命令导致的确认结果，例如 PR create / join 请求被后端确认成功或失败。
   - 自动系统生命周期事实，例如自动 `pr.expired`，不进入用户行为采集系统；这类事实属于程序行为采集或业务事实数据 / 业务状态 projection。

3. **上下文通过事件流表达，而不是复制到每条行为事件上**
   - 行为事件本身保持极简。
   - route、auth session、consent、experiment、app version、commit hash、device 等上下文通过独立事件记录。
   - analytics / warehouse 层通过 `journey_id + occurred_at` 和事件流规则重建上下文，并生成宽表。

4. **身份不进入普通事件 metadata / attributes**
   - 不在每条行为事件上保存 anonymous id 或 authenticated user hash。
   - auth session 创建通过 `auth.session.created` 上下文事件表达。
   - 留存、UV、跨匿名/登录身份合并由 identity projection 负责。

5. **避免 snapshot**
   - 目标不是重放 UI 或复现完整客户端状态。
   - 不采集完整页面状态、组件树、store snapshot。
   - 每条事件只保存该事件自身必要的事实、元数据和业务 payload。

6. **事件语义必须可治理**
   - 每个事件应有 registry / contract。
   - 同名事件触发条件变化时必须升级 `event_version`。
   - 不允许前端任意新增无 owner、无 schema、无触发条件说明的事件。

## Journey 定义

本方案中的 `journey_id` 表示一次应用活动会话：

- 从用户打开应用 / 页面开始。
- 到用户关闭、离开，或超过约定 idle timeout 结束。
- 页面硬刷新、新 app version / commit hash、或重新初始化运行环境时，应开启新的 journey。
- 用户登录、登出、切换账号不一定开启新 journey；当前只要求在 auth session 创建时产生 `auth.session.created` context event。

暂不引入 `visit_id` 和 `interaction_id`：

- 页面进入 / 离开通过 `route.entered`、`route.left` 等上下文事件表达。
- 用户命令请求通过 `x-journey-id` 传递当前 journey，上游 controller / backend request context 可据此记录后端确认型用户结果。
- 用户命令的技术链路关系不应要求每条用户行为事件携带 `correlation_id`。
- 不使用 journey-local `seq`。`occurred_at` 是事件发生时间；投影层可以定义稳定 tie-break 规则，但该规则不是业务顺序事实。

## Raw User Event 最小模型

```ts
type RawUserEvent = {
  event_id: string
  event_name: string
  event_version: number

  journey_id: string
  occurred_at: string
  trace_id?: string

  event_family?: string
  attributes?: Record<string, string | number | boolean | null>
  payload?: Record<string, unknown>
}
```

字段说明：

- `event_id`：全局唯一，用于去重。
- `event_name`：具体事件名，描述稳定的产品 / UI / 用户行为事实。
- `event_version`：事件语义版本。触发条件或 payload schema 变化时升级。
- `journey_id`：一次应用活动会话。accepted user telemetry event 必须携带；非用户行为系统事实不应强行塞进 user telemetry。
- `occurred_at`：客户端或事件源产生时间。
- `trace_id`：可选，用于把用户行为采集与程序行为采集 / 软件可观测性串联。
- `event_family`：稳定的 BI 聚合语义，用于聚合多个具体事件名。
- `attributes`：低基数、稳定、常用于 filter / group by 的分析维度。
- `payload`：当前事件自己的业务数据，可包含高基数字段，不默认作为 BI 维度。

`received_at`、ingest schema validation result 等由 ingest 层补充，不要求前端事件主动携带。

不在 raw user event 中加入：

- `seq`
- `correlation_id`
- `cause_event_id`
- `source`
- `authority`
- anonymous id
- authenticated user hash

## event_name / event_family 规则

具体入口、位置、形态不同的用户行为可以有不同 `event_name`，再通过 `event_family` 聚合。

示例：

```txt
event_name   = "pr_page.header.join_clicked"
event_family = "pr.join_intent"

event_name   = "pr_card.list.join_clicked"
event_family = "pr.join_intent"
```

约束：

- `event_name` 应描述稳定的产品 affordance / 用户行为事实。
- surface、section、关键组件角色、用户动作可以进入 `event_name`。
- 颜色、圆角、CSS class、临时文案、A/B variant 不应进入 `event_name`，应放入 `attributes`。
- 如果只是实验变量或样式差异，不应制造新的事件语义。

## attributes / payload 边界

- `attributes`：低基数元数据，适合 BI 聚合与过滤。
  - 例如：`surface`、`section`、`entrypoint`、`action`、`variant`、`entry_type`。
- `payload`：事件自身业务数据。
  - 例如：`pr_id`、`anchor_event_type`、`target_anchor_event_type`、`failure_reason`。
- 不应把用于 BI group by 的稳定维度藏在任意 payload 字段里。
- 不应把高基数字段提升为 attributes，除非有明确分析价值和索引需求。

## 上下文事件

建议至少支持以下上下文事件：

```txt
journey.started
journey.ended

route.entered
route.left

auth.session.created
consent.changed
experiment.assigned

visibility.changed
network.changed
```

`journey.started` 应承载本 journey 内稳定的运行环境：

- app version
- frontend commit hash
- device / browser / OS
- locale
- viewport class
- initial referrer / entry attribution

如果这些运行环境发生实质变化，应开启新的 journey，而不是在同一 journey 内改变环境语义。

## 事件契约 registry

每个事件应登记以下信息：

- `event_name`
- `event_family`
- `event_version`
- 触发条件
- 不得触发的条件
- owner
- attributes schema
- payload schema
- PII / consent 分类
- deprecated / replacement 策略
- 映射到哪些 BI 指标或漏斗

特别需要区分：

```txt
observation: 用户看到了什么 / 点击了什么
intent: 用户表达了什么意图
command result: 用户命令被后端确认成功 / 失败
system fact: 程序或业务状态自动产生的事实，不属于用户行为采集
```

例如 PR join 路径：

```txt
pr_page.header.join_clicked       observation / intent
pr.join_request_submitted         command submission
pr.joined                         backend-confirmed user result
pr.join_failed                    backend-confirmed user result
```

自动过期示例：

```txt
pr.expired                        system fact，不进入 user telemetry
```

## 数据管道目标形态

```txt
user_telemetry_journeys
  journey lifecycle index

user_telemetry_events
  append-only 用户行为 raw event 账本

user_telemetry_rejected_events
  ingest 校验失败 / 未注册事件隔离区

↓ enrichment by journey_id + occurred_at + context event stream

event_enriched
  已补全 route、identity、experiment、consent、env 等上下文的宽事件表

↓ projection

fact_pr_join_funnel
fact_pr_create_funnel
fact_anchor_event_transition
fact_retention
fact_pr_lifecycle
  基于业务事实数据，例如 PR 表当前 status 的 row 统计；不要求来自 user telemetry

dim_event
  事件字典、family、owner、schema、BI 用途

dim_identity
  auth session timeline / user mapping
```

BI 查询应主要使用 enriched event 或 fact table，不应每次从 raw events 临时重建完整上下文。

## 实现注意事项

- `event_id` 用于幂等去重。
- accepted user telemetry event 必须有 `journey_id`。
- 支持离线重试和乱序上报；ingest / warehouse 按 `occurred_at` 和 context event stream 重建上下文。
- 上下文缺失时不要猜测，应标记为 `context_unknown` / `context_incomplete`。
- 事件 schema 校验失败时应进入隔离区或错误表，而不是静默污染 BI。
- 身份上下文当前通过 `auth.session.created` 表达，并在 warehouse 层 enrichment；不预设 `identity.changed`。
- consent 变化必须进入上下文流；受限 consent 下不应采集或使用不允许的字段。
- 现有 `user_telemetry_*` 仍处早期阶段，本 issue 允许破坏性迁移，避免保留长期兼容债务。

## Acceptance Criteria

- [ ] 定义 RawUserEvent schema。
- [ ] RawUserEvent 保留可选 `trace_id`，用于连接程序行为采集 / observability。
- [ ] 定义 journey 生命周期与 idle timeout：前端 UUID、tab-scoped `sessionStorage`、30 分钟 inactivity timeout、新 tab 新 journey。
- [ ] 用户行为事件强制携带 `journey_id`。
- [ ] 用户命令请求通过 `x-journey-id` 将当前 journey 传递到后端 request context。
- [ ] 定义 event registry 格式和首批事件契约。
- [ ] 维护唯一 Event Registry，避免代码与 BI 侧出现两个手工维护的事件字典。
- [ ] 定义 event_name / event_family 命名规则。
- [ ] 定义前端 observation / intent 与后端确认结果、程序系统事实之间的边界。
- [ ] 破坏性迁移现有 `user_telemetry_*` 表族：保留表族边界，删除旧 envelope 债务。
- [ ] 编写 data migration，将既有用户 telemetry 数据迁移到新事件形态。
- [ ] 普通行为事件不再携带 anonymous id / authenticated user hash；身份通过上下文事件表达。
- [ ] 实现前端基础事件上报：`journey.started`、`route.entered`、核心 click / intent 事件；`journey.ended` 和 `route.left` 先注册，等明确 BI 需求再硬求。
- [ ] 实现后端确认型用户结果事件：PR create / join / close 等由用户命令导致的成功 / 失败结果；成功事件使用 `pr.created`、`pr.joined` 等直接过去式。
- [ ] 自动 PR expired 等系统事实不进入用户行为采集系统；PR 生命周期指标由业务事实数据 / 业务状态 projection 支撑 BI。
- [ ] ingest 层补充 `received_at`、校验 schema、处理幂等去重。
- [ ] warehouse / analytics 层生成 `event_enriched`。
- [ ] 至少支持本 issue 中列出的 BI 指标查询。
- [ ] 文档化事件 registry，并能追踪每个事件的 owner、version、schema 和 BI 用途。
