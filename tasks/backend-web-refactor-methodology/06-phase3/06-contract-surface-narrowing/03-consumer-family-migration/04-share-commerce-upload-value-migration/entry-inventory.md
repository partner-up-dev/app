# 06C.4 entry inventory — Share/Commerce/Upload value migration

Rebased 2026-07-17. Freeze the following exact paths and symbols:

| Path | Safe target | Root-retained exception |
| --- | --- | --- |
| `apps/web/src/shared/upload/useCloudStorage.ts` | `ImageUploadPurpose` | — |
| `apps/web/src/shared/upload/useDesignWebImageUpload.ts` | `ImageUploadPurpose` | — |
| `apps/web/src/domains/share/queries/useGenerateWechatThumbHtml.ts` | — | `PRId` |
| `apps/web/src/domains/share/queries/useGenerateXhsPosterHtml.ts` | — | `PRId` |
| `apps/web/src/domains/share/queries/useGenerateXiaohongshuCaption.ts` | — | `PRId` |
| `apps/web/src/domains/share/model/types.ts` | — | `PRId` |
| `apps/web/src/domains/share/use-cases/wechat/useShareToWechatChat.ts` | — | `PRId` |
| `apps/web/src/domains/share/use-cases/xhs/useShareToXiaohongshu.ts` | — | `PRId` |
| `apps/web/src/domains/commerce/model/ordering-entry-storage.ts` | — | `OrderingOfferDetail` |

`PRId` in PR UI `PRShareSection.vue` is owned by 06C.2, not this packet. The two `AppType` transport imports and
all deep Backend implementation imports in System scenario tests are out of scope.

## Entry proof

Baseline is nine declarations: two safe `ImageUploadPurpose` edges, six Share `PRId` compatibility edges, and one
Commerce `OrderingOfferDetail` compatibility edge. Safe count must reach zero after the batch; exception counts must
remain unchanged.
