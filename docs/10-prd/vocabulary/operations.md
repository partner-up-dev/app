# Operations Vocabulary

These terms are scoped to operator-maintained product surfaces. They should explain user-visible product configuration, not implementation ownership.

| Chinese Term | English Label | Context Boundary | Meaning |
| --- | --- | --- | --- |
| 搭子请求类型配置 | `PR Type Configuration` | Operator-maintained type behavior | Current product configuration selected directly by `PR.type` for discovery/authoring suggestions, time/place policy, preference catalog, support assets, and questionnaire selection. It has no lifecycle, version, revision, effective time, or PR-side reference. |
| 地点审核 | `POI Review` | Operator review of submitted POIs | The operator workflow that publishes or rejects pending POI location applications before they become visible in public location reads. |
| 搭子请求管理 | `PR Admin` | Operator maintenance surface | Operator tooling for inspecting, editing, or hard-deleting PR records when product operations require it. |
| 问卷模板管理 | `Questionnaire Template Management` | Operator feedback setup | Operator tooling for maintaining reusable feedback questionnaire templates and selecting which template future PRs mount. |
