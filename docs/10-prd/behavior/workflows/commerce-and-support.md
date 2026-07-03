# Commerce And Support Workflows

## 1. Order A PR-Attached Commerce Offer

1. A current active participant views a PR detail page that has a matching commerce Button Placement.
2. The user opens the placement. If a non-terminal order already exists for the same PR and offer, the system opens that Order Detail instead of starting a new order.
3. If no such order exists, the placement resolves an Ordering entry, carries PR-derived context and bindings into the generic Ordering handoff, and opens `/order/new`.
4. `/order/new` renders product-specific Ordering Content from the Offer-backed ordering projection. The Ordering page remains the pre-order assembly surface; Order Detail remains the long-lived post-create surface.
5. Ordering Content requests a priced Offer Listing. Listed items include quote identity, display price, and product-specific listing facts.
6. For Rental, the user confirms one fixed quoted SKU and submits the order.
7. For RideHailing, the user chooses one or more acceptable vehicle candidates. The displayed price is the selected candidate range. Unavailable provider vehicle types are omitted from the list rather than shown as disabled choices.
8. RideHailing Ordering currently short-circuits departure-time editing and always behaves as `现在出发`, even when the PR itself carries a concrete start time.
9. Create order submits quote identity, not copied route, participant, SKU, or price facts. If the quote expired, the page refreshes listing, preserves matching selected vehicles when possible, and requires the user to click order again.
10. Before create succeeds, the system must reject the request when any intended order participant still has another unpaid payable order obligation. Positive unsettled charge lines whose payment window has already expired, and zero-amount charge lines, do not block a new order. The Ordering Page stays on `/order/new`, explains the block through a focused dialog, and provides a `我的账单` CTA into `/bills` for the current viewer.
11. If create succeeds, the user enters Order Detail. If provider dispatch creates then immediately cancels a RideHailing order, the user stays on `/order/new` and sees a failure dialog with the reason.

## 2. Support, Feedback, and Operator Support

1. The user enters `/contact-support` from home or footer-level support entrypoints.
2. The user is routed toward platform support, author feedback, or event-specific beta-group selection based on need. When `/contact-support` is opened inside a WeChat mini program webview, the platform-support entrypoint uses QR presentation instead of outbound links.
3. The user can also reach `/about` from that path, inspect product and repository metadata, choose which active Anchor Event beta group to join, and open the official-account QR modal.
4. Operator pages maintain event, POI, PR, feedback questionnaire, and related capabilities so the above workflows remain operable.
5. Operator pages review, publish, or reject user-submitted POI location applications.
6. PR Admin lets an operator hard-delete a selected PR after explicit confirmation. The delete removes the PR root plus the corresponding Partner rows.
7. Anchor Event Admin lets an operator select the feedback questionnaire template used for future PR materialization, and PR Admin lets an operator replace a specific PR's mounted questionnaire instance pointer.
