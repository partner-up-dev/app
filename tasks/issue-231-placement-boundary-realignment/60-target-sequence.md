# Target Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant PR as PR Page
    participant BP as ButtonPlacement
    participant PA as Placement API
    participant PRA as PR API
    participant SS as sessionStorage / router state
    participant ON as /order/new
    participant OC as Order Content
    participant Bar as BottomActionBar
    participant TA as Trade API

    U->>PR: Open PR Page
    PR->>PR: Load PR Detail
    PR->>PR: Decide whether current user is active participant

    alt current user is not active participant
        PR-->>U: Do not mount ButtonPlacement
    else current user is active participant
        PR->>PR: matchingContext = PR Detail
        PR->>BP: Mount ButtonPlacement(type=BUTTON, matchingContext)

        BP->>PA: POST /api/placements?type=BUTTON<br/>{ matchingContext }
        PA->>PA: matchPlacementInstance(type, matchingContext)
        PA-->>BP: PlacementInstance<br/>{ id, offerId, creative, bindingRules }

        alt no matched placement
            BP-->>PR: Hide placement slot
        else matched placement
            BP-->>PR: Render button<br/>ctaLabel + description?
            U->>BP: Click placement

            PR->>PRA: GET /api/pr/:prId/orders<br/>?offerId=:offerId<br/>&statusIn=INITIATING&statusIn=OPEN
            PRA-->>PR: Order list

            alt existing requested-status order
                PR->>U: Navigate /orders/:orderId
            else no requested-status order
                BP->>PA: POST /api/placements/:instanceId/bindings<br/>{ matchingContext }
                PA->>PA: Resolve bindingRules against matchingContext
                PA-->>BP: bindings

                PR->>SS: Store OrderingEntryPayload<br/>{ offerId, prId?, bindings }
                PR->>ON: Navigate /order/new

                ON->>SS: Read OrderingEntryPayload
                ON->>TA: GET /api/offers/:offerId
                TA-->>ON: Offer with SPU productType
                ON->>OC: Load content by productType<br/>pass offerId + bindings

                OC->>OC: Prefill and lock fields from bindings
                OC-->>ON: Expose items + productTypedExtraProperties
                ON->>Bar: Provide command state<br/>{ offerId, prId?, items, productTypedExtraProperties }

                U->>Bar: Click create order
                Bar->>TA: POST /api/orders/evaluate<br/>{ offerId, prId?, items, productTypedExtraProperties }
                TA-->>Bar: price / availability

                Bar->>TA: POST /api/orders<br/>{ offerId, prId?, items, productTypedExtraProperties }
                TA->>TA: Validate offer, items, productTypedExtraProperties
                TA->>TA: Create trade_order with offerId
                alt prId present
                    TA->>TA: Append orderId to PR.orders
                    TA->>TA: PR authority checks at append time
                    alt append rejected
                        TA->>TA: Roll back entire transaction
                        TA-->>Bar: error
                    else append accepted
                        TA-->>Bar: { orderId }
                    end
                else no prId
                    TA-->>Bar: { orderId }
                end
                Bar->>U: Navigate /orders/:orderId
            end
        end
    end
```

## Notes

- `statusIn` is an explicit order-status enum array. Do not introduce a
  `nonTerminal` alias.
- `ButtonPlacement` does not know `prId`.
- PR Page decides whether to mount `ButtonPlacement` by checking whether the
  current user is an active participant.
- PR Page supplies `matchingContext = PR Detail`; PartnerRoster is not included.
- Placement matching does not receive `userId`.
- `prId` is not passed to Order Content.
- Order Content exposes `items` and `productTypedExtraProperties`; it does not
  submit the command.
- The page-level BottomActionBar owns create-order submission.
