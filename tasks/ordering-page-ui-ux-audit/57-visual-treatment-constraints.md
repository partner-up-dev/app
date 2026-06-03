# Visual Treatment Constraints

## Avoid Card-Heavy Rental UI

Rental Ordering Content should avoid `SurfaceCard` and card-heavy stacked composition wherever possible.

Reason:

- The current page already suffers from stacked-card fragmentation.
- Rental target is closer to a commerce place-order drawer, where sections are grouped by hierarchy, dividers, rows, controls, and bottom command state rather than many independent cards.
- The SPU summary may look like a product row or product header, but it should not start a pattern where every field group becomes a card.

Preferred Rental visual language:

```text
RentalOrderingContent
  product header row
    thumbnail
    title
    description
    chevron / detail affordance

  section: 商品配置
    SKU/config rows
    selected state inline

  section: 人数
    stepper/segmented/row control

  section: 联系方式
    compact input row

  section: 参与者身份信息
    repeated identity rows
```

Prefer:

- full-width content bands
- rows
- dividers
- section headings
- inline controls
- bottom drawer style grouping

Avoid:

- repeated `SurfaceCard` shells
- card inside card
- marketing-like decorative cards
- presenting every field group as a standalone rounded container

## RideHailing SKU Card Visual Reference

The RideHailing option rows should be treated as `RideHailing SKU Card`, not a generic "ride type price row".

Reference:

- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\rideTypeDisplay\rideTypeDisplay.vue`
- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\rideTypeDisplay\index.scss`

Reference visual structure:

```text
RideHailing SKU Card
+------------------------------------------------+
| left                                           |
|  info icon + service provider + car type        |
|  vehicle preview image                          |
|                                                |
| right                                          |
|  "预估" + price                                |
|  fare type tag, if non-common                   |
|  selected checkbox                              |
+------------------------------------------------+
```

Reference visual qualities:

- compact horizontal row
- surface-container background, not heavy card chrome
- small radius
- enough padding for touch
- vehicle/provider identity on the left
- price and selected state on the right
- pressed state can subtly scale down
- preview image gives the row concrete service identity

Current MVP translation:

- The data model is commerce SKU, so use `RideHailing SKU Card` naming in future target/design docs.
- Use current SKU fields plus provider/vehicle facts where available.
- Do not copy legacy type names blindly.
- If preview images are not available, use a stable provider/vehicle icon or placeholder image treatment until asset support is available.
