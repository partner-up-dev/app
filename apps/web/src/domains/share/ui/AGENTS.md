# Share UI Local Rules

This folder owns share-domain method UI and share composition surfaces.

## Component Contracts

- `composites/PRShareCarousel.vue`: share-method carousel host.
- `methods/as-link/ShareAsLink.vue`: link-sharing method UI.
- `methods/xhs/ShareToXiaohongshu.vue`: Xiaohongshu sharing method UI.
- `methods/wechat/ShareToWechatChat.vue`: WeChat sharing method UI.

## Boundaries

- Share UI owns active share method presentation and handoff.
- PR detail, PR Discovery, and route surfaces provide share context; they should not duplicate method-specific share UI.
