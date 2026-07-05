# Changelog

## [3.2.0](https://github.com/partner-up-dev/mvp-HA/compare/backend-v3.1.0...backend-v3.2.0) (2026-07-01)


### Features

* **backend:** add caocao callback router ([0eb8738](https://github.com/partner-up-dev/mvp-HA/commit/0eb873812a67713d074d8513231f620e3872c3f3))
* **commerce:** add my bills recovery flow ([ed45d81](https://github.com/partner-up-dev/mvp-HA/commit/ed45d81c1813ba79847872a8c2c133b711b73d74))
* **commerce:** add quote-bound offer listing ([499291e](https://github.com/partner-up-dev/mvp-HA/commit/499291ea62b80f64708682f0f58f1a4f942a68a3))
* **commerce:** refine ride-hailing ordering route map ([62decae](https://github.com/partner-up-dev/mvp-HA/commit/62decaed6c4d01a0c3da279f9d16682d19d1f2da))
* **db:** support environment-scoped data migrations ([3d4a37a](https://github.com/partner-up-dev/mvp-HA/commit/3d4a37aa672dc78c5d9d8ac4e02a2646244d9b18))
* **payment:** rebuild checkout workstream ([4d4f9cd](https://github.com/partner-up-dev/mvp-HA/commit/4d4f9cd055c66d9daaabacff0dc5a939b1678b4b))
* **ride-hailing-admin:** add ride-hailing order admin cancel flow ([b4a7399](https://github.com/partner-up-dev/mvp-HA/commit/b4a73992326440cc153d57ba979f7aa500b929b0))
* **ride-hailing:** expose provider live geometry ([3c1eccb](https://github.com/partner-up-dev/mvp-HA/commit/3c1eccb0bf3b981019b2c2a0a8b83c937a485670))
* **ride-hailing:** improve live order detail mocks ([d9ee5eb](https://github.com/partner-up-dev/mvp-HA/commit/d9ee5eb3e0ecf00cfd57447033f2d8f714e71ca8))
* **ride-hailing:** lock final pricing substrate ([b71a505](https://github.com/partner-up-dev/mvp-HA/commit/b71a505e6c0d77913fca0aa56c1b608b6db69b38))
* **ride-hailing:** reconcile provider detail callbacks ([b164c44](https://github.com/partner-up-dev/mvp-HA/commit/b164c44009cbbc8fd045480b8cee90d95a5167f9))
* **ride-hailing:** render order detail panel content ([8f3d5fd](https://github.com/partner-up-dev/mvp-HA/commit/8f3d5fdb11b9fd5bf7a00839b6c6166ff0825e11))
* **ride-hailing:** route caocao callbacks by token ([ab991b9](https://github.com/partner-up-dev/mvp-HA/commit/ab991b99017924c4061b75c76b4c1a3709601b37))
* **ride-hailing:** support choice-set ordering candidates ([42eb1a6](https://github.com/partner-up-dev/mvp-HA/commit/42eb1a615f2a0d86b2017a8ff34f27ba751a64ec))


### Bug Fixes

* **backend:** align caocao estimate params ([9a4fdca](https://github.com/partner-up-dev/mvp-HA/commit/9a4fdcad872e0ced6f337bd5bbf5dd3dbb764947))
* **backend:** correct caocao router upstream origins ([5e45733](https://github.com/partner-up-dev/mvp-HA/commit/5e45733565f18eb4e251f9be2dafc75310d0f8fe))
* **backend:** pass environment to runtime ([505eecb](https://github.com/partner-up-dev/mvp-HA/commit/505eecbfc9953a0c3e38698577a598d5def91cd9))
* **backend:** sanitize caocao router headers ([01b7a12](https://github.com/partner-up-dev/mvp-HA/commit/01b7a129f959a8ed8cd0a19b68af17ba49767409))
* **backend:** source ride-hailing final settlement from queryCalculateBill ([8d6d492](https://github.com/partner-up-dev/mvp-HA/commit/8d6d492d71e9989a20ba3e390e392743cdebcc73))
* **backend:** surface caocao errno responses ([7cadc08](https://github.com/partner-up-dev/mvp-HA/commit/7cadc08f31782b6b9a25a4edf8544a1ed1547300))
* **caocao:** align order detail contract ([c698eb9](https://github.com/partner-up-dev/mvp-HA/commit/c698eb9c0c2d4ce6055c50766c864612e7e475dd))
* **caocao:** map driver phone and avatar ([3d89f92](https://github.com/partner-up-dev/mvp-HA/commit/3d89f928f248b89cc3241d46c736e6466d06fae0))
* **caocao:** update callback scenario detail fields ([259de5f](https://github.com/partner-up-dev/mvp-HA/commit/259de5f1bc8a917b94a82fb6a8de01ae6f300baf))
* **commerce:** align unpaid payable bill semantics ([3aa46e3](https://github.com/partner-up-dev/mvp-HA/commit/3aa46e37d5075db37ca699626b1143fc47ffc99c))
* **commerce:** block order creation for unpaid participants ([4ba7e92](https://github.com/partner-up-dev/mvp-HA/commit/4ba7e92986ae8f45080fea7dac2a3e5213179d49))
* **commerce:** rebuild bill detail payment flow UI ([ea34350](https://github.com/partner-up-dev/mvp-HA/commit/ea343509d4c7a0710daa93082bff1683ab5f57be))
* **dev:** align WSL dev server ensure ([c7381b5](https://github.com/partner-up-dev/mvp-HA/commit/c7381b5a2505ff95bef61f85ff09bb8a24a02a43))
* **dev:** make portless scripts cross-platform ([14a635d](https://github.com/partner-up-dev/mvp-HA/commit/14a635d7993b6c773ae4ff22cef44e8290a02bce))
* **ordering:** stop terminal polling and add pr-ready recovery ([eafd9f1](https://github.com/partner-up-dev/mvp-HA/commit/eafd9f1d6a41e27aa52932d02d2ab9752e5692e1))
* **payment:** align admin provider multi-active scenario ([7f41509](https://github.com/partner-up-dev/mvp-HA/commit/7f415098a2cc1450afe893202e999a59447d0f65))
* **portless:** restore LAN dev routing ([181c406](https://github.com/partner-up-dev/mvp-HA/commit/181c40639887c22347bbb4f274fb29ce9b59dff1))
* **pr:** canonicalize time window instants ([7bae27c](https://github.com/partner-up-dev/mvp-HA/commit/7bae27c3a535a6579f53e9aa3553c9933d2554ad))
* **ride-hailing:** add CaoCao provider diagnostics for route failures ([0ba59f5](https://github.com/partner-up-dev/mvp-HA/commit/0ba59f5cd6cb0c6aae9e8a32862f39b52587a1be))
* **ride-hailing:** add route diagnostics across backend and frontend ([f21a91b](https://github.com/partner-up-dev/mvp-HA/commit/f21a91bca3ec98a11a35e012d4687ebba3e5c993))
* **ride-hailing:** align caocao settlement and detail truth ([edc94f4](https://github.com/partner-up-dev/mvp-HA/commit/edc94f4500972c5487854d41b63b12ebec3f67b5))
* **ride-hailing:** align Caocao status mapping ([7f7a944](https://github.com/partner-up-dev/mvp-HA/commit/7f7a9441848e41880a53fef1e1a14244be1278fa))
* **ride-hailing:** align fake caocao with official openapi ([7468546](https://github.com/partner-up-dev/mvp-HA/commit/7468546f468e236ff9c89c0bd73f7da5239ab6a0))
* **ride-hailing:** close provider-cancelled orders ([9cf578e](https://github.com/partner-up-dev/mvp-HA/commit/9cf578ef8a397586e90e64c0d5a51f0b117ca408))
* **ride-hailing:** enable dispatching cancellation and depart-now ordering ([83a5b95](https://github.com/partner-up-dev/mvp-HA/commit/83a5b95d7ab7720dc258e2fb24dc85ede283cb4b))
* **ride-hailing:** move evaluation to submit preflight ([bbb4741](https://github.com/partner-up-dev/mvp-HA/commit/bbb474134e3d8a7b79ce4082b8ae8394299efce0))
* **ride-hailing:** precheck cancellation fee before user cancel ([dfa522f](https://github.com/partner-up-dev/mvp-HA/commit/dfa522f2dcbe7380a639b8109deda4e38170d06e))
* **ride-hailing:** realign dispatch binding and caocao candidates ([da62035](https://github.com/partner-up-dev/mvp-HA/commit/da62035a1224b439dca16b3553fa07dcf8d3b0cc))
* **ride-hailing:** switch caocao route query to v1 polyline API ([3c1985d](https://github.com/partner-up-dev/mvp-HA/commit/3c1985d5642e8e96fdf30dc1d7d424b9f73862fb))
* **trade:** allow attaching orders on active PRs ([1c3e2fa](https://github.com/partner-up-dev/mvp-HA/commit/1c3e2fa5ab111e9cbe55572db54620396acec92a))

## [3.1.0](https://github.com/partner-up-dev/mvp-HA/compare/backend-v3.0.0...backend-v3.1.0) (2026-06-11)


### Features

* **event:** submit concrete anchor event routes ([be75a58](https://github.com/partner-up-dev/mvp-HA/commit/be75a58818450534489539cf0a3a80c7c7186923))
* **pr:** pr creator continuous claiming ([d08d6ba](https://github.com/partner-up-dev/mvp-HA/commit/d08d6baf42257b68d987a09435929e7f7aa28957))


### Bug Fixes

* **backend:** isolate backend vitest gate ([4a829aa](https://github.com/partner-up-dev/mvp-HA/commit/4a829aab336aac7359c6f392cd6bd41f9fe8919c))
* **event:** align form mode auto-created PR ownership ([095d492](https://github.com/partner-up-dev/mvp-HA/commit/095d4927704d5f22b5cea9098c2f7191b6e3b407))
* **event:** allow form mode fuzzy auto-create time ([4eebde8](https://github.com/partner-up-dev/mvp-HA/commit/4eebde8a3c22c06bf0423f034a85c10a8a47b6d4))

## [3.0.0](https://github.com/partner-up-dev/mvp-HA/compare/backend-v2.0.0...backend-v3.0.0) (2026-06-07)


### ⚠ BREAKING CHANGES

* **telemetry:** remove journey entity table
* **analytics:** replace user BI projections with fact views
* **telemetry:** user_telemetry_events no longer stores event_kind, and the user telemetry registry no longer exposes eventKind.
* **telemetry:** user behavior telemetry now uses registry-governed v2 user_telemetry_* tables and RawUserEvent ingestion.
* **pr:** Booking Support, Booking Contact join gates, booking execution/reimbursement data, and reimbursement staff contact entry are removed.

### Features

* **admin:** add commerce management views ([293ffde](https://github.com/partner-up-dev/mvp-HA/commit/293ffde282fa546cd0ebd57e62272c1914548f68))
* **admin:** add payment provider instance management ([23935d0](https://github.com/partner-up-dev/mvp-HA/commit/23935d0f03176cee144a6c9bd0b6efee24a3b0af))
* **admin:** add ride hailing provider admin ([d3752ec](https://github.com/partner-up-dev/mvp-HA/commit/d3752ecc5113bcccc269b342b9841b10b21f06d7))
* **admin:** allow editing route applications ([395e16d](https://github.com/partner-up-dev/mvp-HA/commit/395e16d91b12659fa19e32ca56a1962e3136bb56))
* **admin:** derive payment provider instance key ([2a94791](https://github.com/partner-up-dev/mvp-HA/commit/2a94791091c482be7052031dabbceb90d5be2294))
* **admin:** edit anchor event route pools ([de1b90b](https://github.com/partner-up-dev/mvp-HA/commit/de1b90b5d8494914f3e7f5c43e347db530c1edcc))
* **analytics:** add pr create funnel projection ([4816fa0](https://github.com/partner-up-dev/mvp-HA/commit/4816fa05dec2dd4a38b1818ee9792a7f4f36cba0))
* **analytics:** add query-level user event projection ([2dc680e](https://github.com/partner-up-dev/mvp-HA/commit/2dc680e70448b88a2ca14f4f0a5121138ded5282))
* **analytics:** complete bi overview migration ([fceb2ce](https://github.com/partner-up-dev/mvp-HA/commit/fceb2ce6a06fe037c4e4a3e62379827a57b38e6b))
* **analytics:** replace user BI projections with fact views ([38a53ab](https://github.com/partner-up-dev/mvp-HA/commit/38a53ab311b0347302cd4916db297b1dea09a053))
* **analytics:** show official account nudge clicks ([ec5a025](https://github.com/partner-up-dev/mvp-HA/commit/ec5a025526031ffdd07e7b728de37826bdf90e6c))
* **auth:** add WeChat OAuth latency tracing ([a60f1a3](https://github.com/partner-up-dev/mvp-HA/commit/a60f1a3f5e8b6201ddcf570bef585f40124bcec5))
* **backend:** add ride hailing provider foundation ([aeebd0e](https://github.com/partner-up-dev/mvp-HA/commit/aeebd0e01899da1d4b7195dba263e57f32ce1a01))
* **backend:** implement rental ecommerce foundation ([916bb4a](https://github.com/partner-up-dev/mvp-HA/commit/916bb4a1d094061d3b10397b58fa969880eb48e3))
* **backend:** realign order execution aggregates ([6f0f555](https://github.com/partner-up-dev/mvp-HA/commit/6f0f555c976d5ff3776af73e2f1664259b759aff))
* **commerce:** add bill-line payment flow ([47dcde1](https://github.com/partner-up-dev/mvp-HA/commit/47dcde14e3aa5f5810e7973c6e3cac2b9bcb6ec5))
* **commerce:** complete rental baseline flow ([bfae9ae](https://github.com/partner-up-dev/mvp-HA/commit/bfae9ae68bcb0d43ffd2b6aede64cc42cac16121))
* **commerce:** complete ride hailing system journey ([db305f6](https://github.com/partner-up-dev/mvp-HA/commit/db305f6e11c50e52080068061b07abc788ad4d38))
* **commerce:** realign placement ordering boundary ([74c7029](https://github.com/partner-up-dev/mvp-HA/commit/74c70291501925614cffcbf88726759dc1a15f4e))
* **commerce:** route ordering to reservation QR ([185ab72](https://github.com/partner-up-dev/mvp-HA/commit/185ab725a6ba817cd3726745dcf4d092659bc74a))
* **ecommerce:** realign ordering command flow ([62e2734](https://github.com/partner-up-dev/mvp-HA/commit/62e2734629cbf8c6d2db2790e58c5bc4c1478232))
* **event:** add anchor event dummy PR browse items ([d267d3c](https://github.com/partner-up-dev/mvp-HA/commit/d267d3c3548a5082be2f40000d5f70ec64501f0a))
* **event:** add backend-owned place selectors ([7bc91ee](https://github.com/partner-up-dev/mvp-HA/commit/7bc91eea96e7ac7276f2a1d6608078e833390128))
* **event:** add route application workflow ([e866cb8](https://github.com/partner-up-dev/mvp-HA/commit/e866cb8241abffd6fe4ce4d707e36585f21c409c))
* **event:** align form mode fuzzy time windows ([b164daf](https://github.com/partner-up-dev/mvp-HA/commit/b164dafc921fc6bff932926bd95df9336635fc9f))
* **event:** configure PR time editor default mode ([7974e8e](https://github.com/partner-up-dev/mvp-HA/commit/7974e8e6e924f4b76399680d49fe2755b066e6b4))
* **event:** expose backend-owned place selector ([51a4a1e](https://github.com/partner-up-dev/mvp-HA/commit/51a4a1ed5713395134d92cf705d492682674acaf))
* **event:** support fuzzy form mode time ([403817d](https://github.com/partner-up-dev/mvp-HA/commit/403817d7829b09f4ab9754f970e1fa4974873e4c))
* **event:** support route form recommendations ([3701be3](https://github.com/partner-up-dev/mvp-HA/commit/3701be3e60358ec36a7a9e310ebbf24664c12271))
* **event:** unify anchor event landing modes ([fb5b48c](https://github.com/partner-up-dev/mvp-HA/commit/fb5b48cf2d4594e167939b8528fb31a1d1c681d8))
* **pr:** add anchor event route pool policies ([4113317](https://github.com/partner-up-dev/mvp-HA/commit/41133172057be2b25818117914984a037188ee16))
* **pr:** add confirmation join follow-up ([30e8ee3](https://github.com/partner-up-dev/mvp-HA/commit/30e8ee352382f82cdd2aa2b957c7ff942d9988db))
* **pr:** add event community follow-up ([8e156af](https://github.com/partner-up-dev/mvp-HA/commit/8e156af64961689fed1f2f111468513ba294220f))
* **pr:** add route editor map workflow ([8e2a020](https://github.com/partner-up-dev/mvp-HA/commit/8e2a020921dcf0e23b67b5309d6aad66302f5514))
* **pr:** add route place mode foundation ([9a91879](https://github.com/partner-up-dev/mvp-HA/commit/9a91879e83c478399a15cba5a3099505ed1868c2))
* **pr:** add study sprint pomodoro room ([8013c0f](https://github.com/partner-up-dev/mvp-HA/commit/8013c0f8bdb090a12fccc0bd25f9f3664acdbd58))
* **pr:** align ready lifecycle ([c9e495a](https://github.com/partner-up-dev/mvp-HA/commit/c9e495ac19288fa4c06957904b5ef8a5a268afaa))
* **pr:** allow ready prs to edit fuzzy time windows ([b8f0faa](https://github.com/partner-up-dev/mvp-HA/commit/b8f0faaf55c58178e41178e41c71c37a57117e4a))
* **pr:** enforce canonical PR creation path ([e098ae7](https://github.com/partner-up-dev/mvp-HA/commit/e098ae729fbed6f2a72610f497fc7b358ff39e53))
* **pr:** prefer anchor event labels in PR titles ([64c2c67](https://github.com/partner-up-dev/mvp-HA/commit/64c2c67de41eac9c552b868aeb2b375cafc665b3))
* **pr:** remove booking support flow ([bfadb06](https://github.com/partner-up-dev/mvp-HA/commit/bfadb064fcdba668876d7f14076b67899517b8f9))
* **pr:** simplify PR status lifecycle ([0c4398f](https://github.com/partner-up-dev/mvp-HA/commit/0c4398ff001013c7bcc6f89c7092270d6ce99a76))
* **pr:** unify pr editor for ready time edits ([5d8bca7](https://github.com/partner-up-dev/mvp-HA/commit/5d8bca7f024200cc928d801e7dbfbc69af793bf9))
* **telemetry:** migrate user behavior events ([93fc613](https://github.com/partner-up-dev/mvp-HA/commit/93fc613e4de4a6ee15716c136331cb9cee0477a8))


### Bug Fixes

* **admin:** configure placement binding rules ([06437eb](https://github.com/partner-up-dev/mvp-HA/commit/06437ebbebf2ccf53e49755a3616f447a0ad5d93))
* **admin:** gate rental cancellation through fulfillment ([af797a6](https://github.com/partner-up-dev/mvp-HA/commit/af797a6b659d6a36c0e7fbd597855a171dae2c89))
* **analytics:** normalize enriched event timestamps ([43b6fd9](https://github.com/partner-up-dev/mvp-HA/commit/43b6fd9ab8e8255dd42822352c1cb45619a8a0c8))
* **backend:** align payment bill line ssot ([17a9bd6](https://github.com/partner-up-dev/mvp-HA/commit/17a9bd682fe5a35674e5edacd2b866e7d530d112))
* **backend:** align wechatpay provider topology ([955eab4](https://github.com/partner-up-dev/mvp-HA/commit/955eab4e9a48b7a78280e24adb88940aa1a9ef6b))
* **backend:** apply pricing application in ordering ([05870d5](https://github.com/partner-up-dev/mvp-HA/commit/05870d51672cc5a9e99609704e74087788c4c253))
* **backend:** block late payment fulfillment ([21b8ff6](https://github.com/partner-up-dev/mvp-HA/commit/21b8ff6ccc20e63e146d7a6f8fbd6cb39b97f5d2))
* **backend:** bound rental refunds by paid bill lines ([d07130d](https://github.com/partner-up-dev/mvp-HA/commit/d07130de91df2c1a3094e4d01b30421aac1ea880))
* **backend:** enforce placement matching rules ([7f73b54](https://github.com/partner-up-dev/mvp-HA/commit/7f73b5485af4e820f5309919c18a6cd7bc282b72))
* **backend:** validate wechatpay provider credentials ([6e0775d](https://github.com/partner-up-dev/mvp-HA/commit/6e0775d23ceb9d447b622df42a710ae53d52e8cd))
* **ci:** repair PR 244 gate regressions ([0fc84de](https://github.com/partner-up-dev/mvp-HA/commit/0fc84de2dd8ff77cf53bda0af31785e891bfb0d7))
* **commerce:** align payment provider topology ([c654676](https://github.com/partner-up-dev/mvp-HA/commit/c654676ee9e26c8296dc46afd3049eaf764fa548))
* **deploy:** pass payment notify base url to backend ([0292895](https://github.com/partner-up-dev/mvp-HA/commit/0292895d2f4f0008061c934b0a2236e32e2b34f0))
* **event:** exclude joined PRs from anchor recommendations ([dc2b7ec](https://github.com/partner-up-dev/mvp-HA/commit/dc2b7ec38742094757ceaf46b4d6ce823a997fac))
* **event:** hide draft PRs from public browsing ([cdeb169](https://github.com/partner-up-dev/mvp-HA/commit/cdeb169db1afb88a4f867d20a2a48b5f29a8e7ba))
* **event:** materialize dummy PRs as system-owned ([94c95e2](https://github.com/partner-up-dev/mvp-HA/commit/94c95e2e9a0368000117dc40d92cc1c5f599ca78))
* **event:** unify event-assisted PR creation ([8d1189b](https://github.com/partner-up-dev/mvp-HA/commit/8d1189b359c4163cbe1f72dab46bcfc449dc2968))
* **pr:** complete canonical PR create mapping ([a9c6585](https://github.com/partner-up-dev/mvp-HA/commit/a9c65855a76a59822a82a73178fd22d6ec32f030))
* **pr:** prefer existing types for NL create ([64821fd](https://github.com/partner-up-dev/mvp-HA/commit/64821fda4624d18d8d7cc5728e3bd8e63ed2a043))


### Performance Improvements

* **backend:** defer WeChat OAuth profile fetch ([74ad134](https://github.com/partner-up-dev/mvp-HA/commit/74ad1342f371c500a966c611d80520dd90cdfcd1))


### Code Refactoring

* **telemetry:** remove journey entity table ([e2a22e6](https://github.com/partner-up-dev/mvp-HA/commit/e2a22e640676ffa690ac3669c70a3196ad77654e))
* **telemetry:** remove user event kind ([4e767be](https://github.com/partner-up-dev/mvp-HA/commit/4e767be689a1ee7fc9900a99768be8ba186cdb65))

## [2.0.0](https://github.com/partner-up-dev/mvp-HA/compare/backend-v1.0.0...backend-v2.0.0) (2026-05-15)


### ⚠ BREAKING CHANGES

* **poi:** POI.id is now an integer identity; location matching uses POI.name.
* **admin:** users.role now stores role arrays and auth tokens require roles claims.

### Features

* **admin:** add analytics role entry ([3c1e88a](https://github.com/partner-up-dev/mvp-HA/commit/3c1e88a7516c9f409bc9d514a482184324158e6b))
* **backend:** add anchor event analytics funnel API ([3da5297](https://github.com/partner-up-dev/mvp-HA/commit/3da52974077b9b561775d46b322099619801d2c3))
* **event:** add full PR expansion policy ([4a40f29](https://github.com/partner-up-dev/mvp-HA/commit/4a40f296328eea4cc7015dfa0f7472722cd4c6ab))
* **event:** add participation frequency limit ([ca0c3e0](https://github.com/partner-up-dev/mvp-HA/commit/ca0c3e0b39d0acb842905680b6cc05da7bb88e4c))
* **poi:** upgrade POI identity and location matching ([bb6e3cf](https://github.com/partner-up-dev/mvp-HA/commit/bb6e3cfaeba83c871f6ac263cd17f17302e92f4a))
* **pr:** make confirmation optional ([ca4b83a](https://github.com/partner-up-dev/mvp-HA/commit/ca4b83ad522d9f0e2a43f344e8a7ef0d92fd7d98))
* **pr:** use user phone for booking contact ([2bfedfe](https://github.com/partner-up-dev/mvp-HA/commit/2bfedfe7a646a6eda1cfb7b7f1bb9622d5483362))
* **telemetry:** add user journey ingestion ([fc7b863](https://github.com/partner-up-dev/mvp-HA/commit/fc7b863380f7292aeb667b5fb521abe8e187cc15))


### Bug Fixes

* **auth:** unify authenticated-required handling ([a545644](https://github.com/partner-up-dev/mvp-HA/commit/a545644eccc5d755de4d1661cdc255c646d697c5))
* db migration order ([65fa804](https://github.com/partner-up-dev/mvp-HA/commit/65fa8045c4886dfd80e5dd54a2599e7b58e07781))
* **event:** count prior prs for frequency limit ([2b38a0b](https://github.com/partner-up-dev/mvp-HA/commit/2b38a0b050f9669d22efabbc3875c5f193b9aa41))
* **pr:** finalize prs by close-time participation ([ac705e1](https://github.com/partner-up-dev/mvp-HA/commit/ac705e19e612b351d7c81c3422e54d60e34ab04c))
* **pr:** hide confirm cta when confirmation is disabled ([ff43d2d](https://github.com/partner-up-dev/mvp-HA/commit/ff43d2d440e44403e7473620b6d5da1001b57117))
* **pr:** make PR type immutable for user edits ([9579520](https://github.com/partner-up-dev/mvp-HA/commit/95795205eb25b243504a237ed864344a1d2ab975))
* **pr:** require authenticated PR mutations ([5cc4843](https://github.com/partner-up-dev/mvp-HA/commit/5cc484385d7e06fbbdb600f16f5c485ceccf5902))

## [1.0.0](https://github.com/partner-up-dev/mvp-HA/compare/backend-v0.3.0...backend-v1.0.0) (2026-05-12)


### ⚠ BREAKING CHANGES

* **auth:** User-facing PIN login, local registration, PR mutation PIN payloads, and related frontend PIN UI are removed.

### Features

* add about page with frontend/backend commit metadata ([e3c734b](https://github.com/partner-up-dev/mvp-HA/commit/e3c734bc396a57db6b9a29c7f35815bc855cbebf))
* add admin booking execution console ([913433a](https://github.com/partner-up-dev/mvp-HA/commit/913433abce85bb25db05d79883f522c6713a5d5b))
* add anchor event participation defaults ([a454f0a](https://github.com/partner-up-dev/mvp-HA/commit/a454f0a3b46491fb142326e52e91dabb148e34e5))
* add anchor PR search flow ([62161b5](https://github.com/partner-up-dev/mvp-HA/commit/62161b588c97adbb583e3aff46c47c658cf24ce9))
* add canonical pr create surface ([24d4094](https://github.com/partner-up-dev/mvp-HA/commit/24d409433eb0f98afbc499072b714732b6a84b2c))
* add canonical pr read surface ([861b19f](https://github.com/partner-up-dev/mvp-HA/commit/861b19f3b670049474951ccf454ed99773da6f27))
* add fc-based database migration workflow ([43c536b](https://github.com/partner-up-dev/mvp-HA/commit/43c536ba31f7ea174d4d646bec2c4a30f48b1adb))
* add frontend wechat oauth callback page ([e9777bd](https://github.com/partner-up-dev/mvp-HA/commit/e9777bd6fdfd252a7d26542650e8739b1278c13f))
* add platform passthrough booking mode ([66545d1](https://github.com/partner-up-dev/mvp-HA/commit/66545d18d9ae43d2fe2c3504ce73004c6ed16a54))
* add PLATFORM_PASSTHROUGH booking mode ([21e6c34](https://github.com/partner-up-dev/mvp-HA/commit/21e6c34dc1836c1f60e42276b22253845efe7043))
* add pois ([1eb0846](https://github.com/partner-up-dev/mvp-HA/commit/1eb0846ade0881ac71181358ca71dfda26c321b3))
* **admin:** add feedback questionnaire admin ([7a1025f](https://github.com/partner-up-dev/mvp-HA/commit/7a1025f016c5e41dff50dce018fda9bfbacbd4d8))
* **admin:** add POI availability rules ([600106f](https://github.com/partner-up-dev/mvp-HA/commit/600106f851313c10eb6db4a1cbd240091d0eb502))
* **admin:** mount feedback questionnaires from templates ([bf404c5](https://github.com/partner-up-dev/mvp-HA/commit/bf404c5c0f273a696e9e200e60ad31eab0a53106))
* **admin:** normalize image uploads ([a313f6e](https://github.com/partner-up-dev/mvp-HA/commit/a313f6e0534637e1ba2bb4e1773df6b64135a6e0))
* **admin:** refine pr management workspace ([391d8a0](https://github.com/partner-up-dev/mvp-HA/commit/391d8a0f5f7507f7bbd8eefa0597e43b2ed2597c))
* **admin:** reorganize admin management workspace ([39cba04](https://github.com/partner-up-dev/mvp-HA/commit/39cba04b5671b864f5a2f0dbca05b783f08c8cb5))
* **admin:** split anchor-event and pr management ([1f68e55](https://github.com/partner-up-dev/mvp-HA/commit/1f68e55589f1a9354e7936c6787c1c4ed0df01d1))
* **admin:** support deleting PRs ([46c658d](https://github.com/partner-up-dev/mvp-HA/commit/46c658db38d01eadedbb315b80b3c3798c15d0df))
* **admin:** support managing POIs ([a3a087d](https://github.com/partner-up-dev/mvp-HA/commit/a3a087d77d0083ab45f8fdf0adbe6e0be7711f28))
* **anchor-event:** add batch description support ([#150](https://github.com/partner-up-dev/mvp-HA/issues/150)) ([1f35dde](https://github.com/partner-up-dev/mvp-HA/commit/1f35dde2810426427c5b6bd4a8998e1d65b1175f))
* **anchor-event:** add default PR notes for PR creation ([d232ea3](https://github.com/partner-up-dev/mvp-HA/commit/d232ea3f868d10bc798963b0e8e8fb24f58780f7))
* **anchor-event:** fallback APR create to CPR and add event partner defaults ([deafea6](https://github.com/partner-up-dev/mvp-HA/commit/deafea6d02d2618c2553458864b07275515d16e4))
* **anchor-event:** randomize events catalog order for balanced exposure ([dd8c0ef](https://github.com/partner-up-dev/mvp-HA/commit/dd8c0ef904c213f69b0491ccec4e4fc4c267bcd6))
* **anchor-event:** replace batch shell with time-pool config ([90386d3](https://github.com/partner-up-dev/mvp-HA/commit/90386d3d182d29bb89654035323f1c9749817f5c))
* **anchor-pr:** booking needs user phone; wechat ability mocking ([aa88651](https://github.com/partner-up-dev/mvp-HA/commit/aa88651e9f1bfc28ca9f7988272a225f0bbca25b))
* **anchor-pr:** joinLock must be earlier than confirm end ([eab6756](https://github.com/partner-up-dev/mvp-HA/commit/eab67560dd88f0786ccc62226b9229bbc4b46748))
* **anchor-pr:** switch check-in to attended-only with unknown fallback ([4f31471](https://github.com/partner-up-dev/mvp-HA/commit/4f31471c8ef710324b4a02340b30860872629588))
* **anchor-pr:** user-managed locations ([1c3c51c](https://github.com/partner-up-dev/mvp-HA/commit/1c3c51cffd3e2b1aeb3ba84681e9c601ded4679c))
* **auth:** retire user PIN login ([501f93e](https://github.com/partner-up-dev/mvp-HA/commit/501f93e38fc94f1f1236c7aa9fb5d2dd303b9d47))
* auto-register user on publishing PR and auto-login ([6d2d96f](https://github.com/partner-up-dev/mvp-HA/commit/6d2d96fa1344c99bcd5a55a1cce548149ea03ac2))
* **backend:** wxmp domain verification ([f877511](https://github.com/partner-up-dev/mvp-HA/commit/f8775114809af867bab9f9a7ba4b4af4d8fb12b0))
* **contact-support:** add beta group qr entry and modal ([ebdf600](https://github.com/partner-up-dev/mvp-HA/commit/ebdf6001b23296686906877b469a51a17886c51e))
* **contact-support:** replace ContactAuthor with WeCom support routing ([5d79693](https://github.com/partner-up-dev/mvp-HA/commit/5d7969393d7d6b09245686751f908caa13ac445d))
* dev mode bypassing wechat oauth ([9f0e83c](https://github.com/partner-up-dev/mvp-HA/commit/9f0e83cd6c8cdb777f485d3158e76985685943ab))
* **event:** add anchor event form mode recommendation flow ([b2ccc79](https://github.com/partner-up-dev/mvp-HA/commit/b2ccc794562c24884bef2b447f7c58fe2c3b063d))
* **event:** add anchor event landing foundation ([6964acf](https://github.com/partner-up-dev/mvp-HA/commit/6964acfe9663797b05a9d90392f01486a3b8916d))
* **event:** add anchor time window descriptions ([e7d126e](https://github.com/partner-up-dev/mvp-HA/commit/e7d126e800410eba6ceff99ef824138922e9dbf6))
* **event:** demand-card excludes not-joinable PR ([9779542](https://github.com/partner-up-dev/mvp-HA/commit/9779542c66f0aa781cda95952322b93061e4fe10))
* **event:** deterministic catalog order and continuous highlight auto-scroll ([eba33f2](https://github.com/partner-up-dev/mvp-HA/commit/eba33f2784868352025b75f7c48765fa8bfe678e))
* **event:** gate user PR creation by anchor event policy ([74f250f](https://github.com/partner-up-dev/mvp-HA/commit/74f250f3c0c89f42cccb88301cb2812545ae8b48))
* **event:** inline form mode recommendation flow ([09b6277](https://github.com/partner-up-dev/mvp-HA/commit/09b627703902d4e77aef4c2b36bbd719dcd4a714))
* **event:** preselect form mode defaults ([99ed65c](https://github.com/partner-up-dev/mvp-HA/commit/99ed65c768a93b399640e7f4b6e8ca16a8cae507))
* **event:** refine form mode handoff splash ([6770e35](https://github.com/partner-up-dev/mvp-HA/commit/6770e35a964fc1e74582b2b0fb1fffb866e7dfad))
* **event:** refine form mode recommendation flow ([904a6fa](https://github.com/partner-up-dev/mvp-HA/commit/904a6fabb34ad8abe608b2d6067e2445c3008102))
* **event:** support list landing rollout ([93cf428](https://github.com/partner-up-dev/mvp-HA/commit/93cf428832261ec6e0468e240bef6a8a7b657440))
* **event:** tinker card mode ([00d7b0e](https://github.com/partner-up-dev/mvp-HA/commit/00d7b0e954079bc3afaeeff4d50194a25b8157d9))
* **event:** unify anchor event location context ([fb47ad6](https://github.com/partner-up-dev/mvp-HA/commit/fb47ad656ae6efbf645c9b89e6913d370b59c163))
* expand single pr root schema ([7cc1a83](https://github.com/partner-up-dev/mvp-HA/commit/7cc1a83225a0f76e92478438c3320022d6cf2d15))
* **frontend:** the real radio card carsousel-like selector ([483d534](https://github.com/partner-up-dev/mvp-HA/commit/483d5342379ee0af25c14ba72d9f7c5843df46f0))
* **home:** save QR code to get back ([6c052b0](https://github.com/partner-up-dev/mvp-HA/commit/6c052b029db303e6526fd5405fdedd0c9ea19ff8))
* **marketing:** guide users to follow official account ([0888ad1](https://github.com/partner-up-dev/mvp-HA/commit/0888ad1d0920be427b277fd91379ba1f16ceac4f))
* move official account username to config with frontend fallback ([d07c0e3](https://github.com/partner-up-dev/mvp-HA/commit/d07c0e30480973253e79d39be1cf44c132a5f5db))
* **notify:** add bucket-based job timing semantics ([53acc52](https://github.com/partner-up-dev/mvp-HA/commit/53acc529cd99c977e0a4f1aef566574adb8af8a9))
* **noti:** PR start remind ([9341fc9](https://github.com/partner-up-dev/mvp-HA/commit/9341fc961cec014bfeaa02b9557b3f2e2919490a))
* **poi:** add location application review flow ([1c7a83c](https://github.com/partner-up-dev/mvp-HA/commit/1c7a83c1b94bb261fd764ed7034dcc61644a498a))
* **pr:** add anchor PR message thread ([ea48812](https://github.com/partner-up-dev/mvp-HA/commit/ea4881287452d13969fc200ee778275431983729))
* **pr:** add configurable join gates ([0c2c867](https://github.com/partner-up-dev/mvp-HA/commit/0c2c8672891ec60d7ffb9808ddaaae9d9f846de7))
* **pr:** add cross-pr waitlist reminders ([264242e](https://github.com/partner-up-dev/mvp-HA/commit/264242e2257738372b25be207a1abf48ce511ce1))
* **pr:** add meeting point configuration and notifications ([8843b57](https://github.com/partner-up-dev/mvp-HA/commit/8843b5728545084317d3be023701d802f8744776))
* **pr:** add mounted feedback questionnaires ([b91217d](https://github.com/partner-up-dev/mvp-HA/commit/b91217d26c40feefeaec670e7e83055aa66ec215))
* **pr:** add new-partner, booking notification subsrciption ([4b366be](https://github.com/partner-up-dev/mvp-HA/commit/4b366be86df6ed79e3946c98596c656f0faffd46))
* **pr:** add notes field to anchor event page demand-card ([7418b72](https://github.com/partner-up-dev/mvp-HA/commit/7418b7268bda38445c027530090a4cce27d16aa4))
* **pr:** add notes field to anchor event page demand-card ([f75c243](https://github.com/partner-up-dev/mvp-HA/commit/f75c243a3f1883b5fe4fc47d3196aaf4996b3c94))
* **pr:** add waitlist participation flow ([44f6064](https://github.com/partner-up-dev/mvp-HA/commit/44f606441cee7faf63dcd23c274a9385e9d1e1c6))
* **pr:** admin-sent pr messaging ([4158ef8](https://github.com/partner-up-dev/mvp-HA/commit/4158ef823a72c09b66206acde42cd68860ae48df))
* **pr:** allow single-partner minimum ([c200cac](https://github.com/partner-up-dev/mvp-HA/commit/c200cacadd428c21de83243600cef96f5fb8fcee))
* **pr:** allow waitlist cancellation ([f86a35c](https://github.com/partner-up-dev/mvp-HA/commit/f86a35c765de40fd9d29ff1c194b42703e17eaae))
* **pr:** converge single-pr runtime and event discovery ([08b1a5b](https://github.com/partner-up-dev/mvp-HA/commit/08b1a5bb410beabd1c74075d94eb474250a2481a))
* **pr:** hybird pr create page ([5f08b30](https://github.com/partner-up-dev/mvp-HA/commit/5f08b30e7970b579e62b34da11ac28d5aca7b20b))
* **pr:** make active meeting point private ([03e7732](https://github.com/partner-up-dev/mvp-HA/commit/03e7732c9de0ab2835d0f14c6ef6e9ecd2d55760))
* **pr:** refine PR page UX ([8002a95](https://github.com/partner-up-dev/mvp-HA/commit/8002a95c212d122db9491f05fff79ec000941a73))
* **pr:** use canonical detail data for PR previews ([94fe8de](https://github.com/partner-up-dev/mvp-HA/commit/94fe8de3112b32427cc3f5f267cee79fa611ba83))
* refactor PR partner section; add page ME; add SPM ([939aa70](https://github.com/partner-up-dev/mvp-HA/commit/939aa70e64dfc3db12a974d668e2f8947b9a02a3))
* refine homepage landing flow ([671f4cd](https://github.com/partner-up-dev/mvp-HA/commit/671f4cd779ed96851ceb41167235ff4578b1165e))
* refine homepage landing flow ([dcb1bd3](https://github.com/partner-up-dev/mvp-HA/commit/dcb1bd379a57746289e8f92bebf8da0d03beaf9b))
* **release:** implement automated changelog and GitHub Release management for backend and frontend ([c2ccef4](https://github.com/partner-up-dev/mvp-HA/commit/c2ccef44faebecc34681f033f39eac83d5a31fad))
* replace WeChat phone capability with manual phone input + admin manual release API ([eef34b2](https://github.com/partner-up-dev/mvp-HA/commit/eef34b2056c81cdfc4ce9d8efc26a5eb6152fc24))
* replace wechat phone flow with manual phone input and admin release api ([4e7982a](https://github.com/partner-up-dev/mvp-HA/commit/4e7982aba29a184debd62d39a3243462475c8c95))
* split anchor PR and community PR; user.id uses uuid; rm pr.pin ([650bb5f](https://github.com/partner-up-dev/mvp-HA/commit/650bb5ff16c857bec1dd762e1768bce91ffdb91e))
* support event-specific beta groups ([016e938](https://github.com/partner-up-dev/mvp-HA/commit/016e93849a3d20778c06c506f96856596c014437))
* **support:** add staff link ([d48215b](https://github.com/partner-up-dev/mvp-HA/commit/d48215b1c574f16bb69609b9ca38d2ca107a964c))
* **telemetry:** add cold-start analytics pipeline ([761778e](https://github.com/partner-up-dev/mvp-HA/commit/761778e6194c11991b15d32df590ee56bd23eca9))
* **wechat:** move notification subscriptions to credit quota ([98616bc](https://github.com/partner-up-dev/mvp-HA/commit/98616bce079db87f4c9ea3378acd9c9f7fe28c6c))
* **wechat:** switch notification subscriptions to credit quota ([5e841b4](https://github.com/partner-up-dev/mvp-HA/commit/5e841b4a7a7bbde0d7546bc8433f559c6adf6082))


### Bug Fixes

* align wechat notification toggle with open-subscribe result ([63c7fa5](https://github.com/partner-up-dev/mvp-HA/commit/63c7fa504169f729f3fd9084c09b982f4d8b731a))
* **anchor:** refresh PR status on all status-sensitive anchor reads ([f251f68](https://github.com/partner-up-dev/mvp-HA/commit/f251f68a19fec654e7fada9e11e754e6d6a69791))
* **apr:** decouple booking-contact visibility from creator ([2fbff8d](https://github.com/partner-up-dev/mvp-HA/commit/2fbff8d41719287376f5d32564f7f8800ef6b220))
* **auth:** complete wechat bind login flow and replay blocked anchor actions ([978d917](https://github.com/partner-up-dev/mvp-HA/commit/978d9170d4798f9e66aff4e19f1787df8d1b2895))
* avoid wechat oauth state collisions across concurrent logins ([9bd5752](https://github.com/partner-up-dev/mvp-HA/commit/9bd57525c5ead4ea65dfaa1513e78a5025770de2))
* **backend:** assign creator on first active anchor join ([b0cea27](https://github.com/partner-up-dev/mvp-HA/commit/b0cea27bebca43eddf4d98896b0d6568ca509add))
* **backend:** bound maintenance db failures ([6632c5d](https://github.com/partner-up-dev/mvp-HA/commit/6632c5d3c2f1beeabf2fbd08d1e94cf66ebbeafc))
* **backend:** expose commit hash in fc runtime metadata ([de4af3d](https://github.com/partner-up-dev/mvp-HA/commit/de4af3d046770e8ead2689b861434b78b521639b))
* **backend:** expose commit hash in fc runtime metadata ([c66cc3a](https://github.com/partner-up-dev/mvp-HA/commit/c66cc3abeae3faee1d8275f3737f7c4054e93c16))
* **backend:** harden maintenance tick path ([dfe81fc](https://github.com/partner-up-dev/mvp-HA/commit/dfe81fccaa8a153e919b73200254aa7df4a05dee))
* **backend:** localize XHS share prompt time ([2b72269](https://github.com/partner-up-dev/mvp-HA/commit/2b72269ac9bf12d0f1848fbeb198af3295859435))
* **backend:** prevent early confirm-start reminders ([1fe2cf3](https://github.com/partner-up-dev/mvp-HA/commit/1fe2cf39fd32ea701e9394dfb02653e84279ba22))
* **backend:** set creator for creatorless anchor on first join ([899d3b1](https://github.com/partner-up-dev/mvp-HA/commit/899d3b1e260aa0de9be31e8357297acadad5fb18))
* **backend:** use config-only wechat templates ([eeaf5e2](https://github.com/partner-up-dev/mvp-HA/commit/eeaf5e2d20590711c1226fe69539cdbac3c17602))
* **backend:** wxoa domain verification ([d55b092](https://github.com/partner-up-dev/mvp-HA/commit/d55b0927aedb202383cddef9094a94ff456b5488))
* **backend:** wxoa domain verification ([1066107](https://github.com/partner-up-dev/mvp-HA/commit/10661070f2a517312b71cb1081e4ccef971e61ab))
* booking-support visibility and join modal spacing regressions ([bf432ae](https://github.com/partner-up-dev/mvp-HA/commit/bf432ae82b6d3c598dc748e28994b4ee2feb75f1))
* **booking:** align execution gating and notification config ([7e32ed9](https://github.com/partner-up-dev/mvp-HA/commit/7e32ed9b325497ae326b22990b2b664a53fe767f))
* **ci:** remove WECHAT_OAUTH_CALLBACK_URL ([02a0b6a](https://github.com/partner-up-dev/mvp-HA/commit/02a0b6aceabd36d93ea0c655c21d46a5f4397d54))
* **ci:** renumber backend migration prefix to avoid duplicate 0009 ([1621c38](https://github.com/partner-up-dev/mvp-HA/commit/1621c3860003201bd0e24208cdef72f2b7f32135))
* **db:** ci failure for drizzle meta ([d25e5ab](https://github.com/partner-up-dev/mvp-HA/commit/d25e5ab3218ac63e06ccba92a1ef7a4b914e1f2f))
* **db:** renumber PR message migration ([afce313](https://github.com/partner-up-dev/mvp-HA/commit/afce313b506603cbd43c322e476a8e3c57139768))
* disable late tolerance for notification jobs ([4058d50](https://github.com/partner-up-dev/mvp-HA/commit/4058d50fa2344d208da532895dc04584a2feb9d5))
* enforce temporal refresh across anchor PR reads ([5184ecb](https://github.com/partner-up-dev/mvp-HA/commit/5184ecb625fa0304befb0cc48471d24ffad16919))
* **frontend:** build error ([aacd65c](https://github.com/partner-up-dev/mvp-HA/commit/aacd65c2e95f7035abc82af1fe5a0bc0eca009a2))
* **frontend:** build error introduced by [#119](https://github.com/partner-up-dev/mvp-HA/issues/119) ([3593835](https://github.com/partner-up-dev/mvp-HA/commit/3593835392af027f15380f400ec73d60b0b2968e))
* **frontend:** event, APR page loading slow ([a0d531d](https://github.com/partner-up-dev/mvp-HA/commit/a0d531d8d79f1786a0c57412b8e07d647d3deb99))
* **frontend:** gate booking-contact card to APR creator and adjust join modal spacing ([357f397](https://github.com/partner-up-dev/mvp-HA/commit/357f397ddc85d94087ea0074061e6e7b96a53994))
* hardcode repository URL to avoid credential leakage ([7f4d87e](https://github.com/partner-up-dev/mvp-HA/commit/7f4d87e139a62cece235d30e9795ca671145454a))
* **issue-51:** align exit semantics, roster view, and rejoin row reuse ([5491ddd](https://github.com/partner-up-dev/mvp-HA/commit/5491ddd59b484eee77af768574907e4f84d017bf))
* **migration:** wrong numbering ([72f49b9](https://github.com/partner-up-dev/mvp-HA/commit/72f49b9eb408db288f09247d7725e7513747ae7f))
* **notification:** align confirmation reminders with window policy ([a882dfc](https://github.com/partner-up-dev/mvp-HA/commit/a882dfc3e80cfacc745e0f81bc5f6b1e8f2058e2))
* **pr:** hide check-in action after attendance ([cfc2f67](https://github.com/partner-up-dev/mvp-HA/commit/cfc2f6705b70461b0325cf415ddbc502116f9f44))
* **pr:** min-partner &gt; 1 [#13](https://github.com/partner-up-dev/mvp-HA/issues/13) ([91f2bcc](https://github.com/partner-up-dev/mvp-HA/commit/91f2bcc3383ed4c455d93bad666c5a914964d2db))
* **pr:** partner section action visibility ([5095a50](https://github.com/partner-up-dev/mvp-HA/commit/5095a508d3e8e9625880f53e621304dfd6b50a72))
* **pr:** reset join gates after exit ([3111e7b](https://github.com/partner-up-dev/mvp-HA/commit/3111e7b4329452b4c3fea120b893cc4b7c172e1f))
* **pr:** retire legacy check-in feedback ([09c2035](https://github.com/partner-up-dev/mvp-HA/commit/09c2035358df36100adc5143d1dae8251eaf1ef2))
* **pr:** submit create form through native form ([882613a](https://github.com/partner-up-dev/mvp-HA/commit/882613a4eb62cd4237e6999a1a5f4cb72495ef05))
* **pr:** time conflict forbid joining ([0a76540](https://github.com/partner-up-dev/mvp-HA/commit/0a765408b12dfa143babf0c4e6a2046e179994eb))
* **pr:** time window confilict check also required at creation ([1d56173](https://github.com/partner-up-dev/mvp-HA/commit/1d56173707690b666b825fe9e6d29595b98610cb))
* schedule confirmation reminders by confirm window ([6f325c3](https://github.com/partner-up-dev/mvp-HA/commit/6f325c3e2acf519a4a36e9a0c3f94fae2795b766))
* use FRONTEND_URL host for wechat oauth callback redirect_uri ([b424da1](https://github.com/partner-up-dev/mvp-HA/commit/b424da182daa96d1df6f3801f3afb50fcf9493a5))
* **user:** wechat login may can be faster ([27c7680](https://github.com/partner-up-dev/mvp-HA/commit/27c76800d6c086353d0f4dc35e6f7444cafea0db))
* **user:** wechat-oauth dead loop ([b06da5e](https://github.com/partner-up-dev/mvp-HA/commit/b06da5e06ca7b1843980170a5e9c4eb464031fe9))
* **user:** wechat-oauth login domain verification error ([1573555](https://github.com/partner-up-dev/mvp-HA/commit/1573555519f23a8b51cebc95f01fc3a74db19a7a))
* wechat submsg user-facing string optmization ([dcba48f](https://github.com/partner-up-dev/mvp-HA/commit/dcba48fccf7c206dc39ec22782a51ba1aecb51d7))
* wechat-oauth mock ([6d8ba33](https://github.com/partner-up-dev/mvp-HA/commit/6d8ba338005db93dccae45eb144d2f63d9066616))
* **wechat:** align notification toggle state with open-subscribe result ([25f3cb3](https://github.com/partner-up-dev/mvp-HA/commit/25f3cb3a5385fff36712ba7559fbe63d48f87216))
* **wechat:** include page target in subscribe notification bizsend ([b028df2](https://github.com/partner-up-dev/mvp-HA/commit/b028df2f64fe9f9e329d63b3f72d6ca65d85c0d2))
* **wechat:** set subscribe message page target for notification jump ([a961431](https://github.com/partner-up-dev/mvp-HA/commit/a96143151cd5badf5d44cf51827c1fc55fb010d2))

## 0.3.0

Bootstrap baseline for automated backend release tracking. Earlier changes
predate Release Please ownership of this changelog.
