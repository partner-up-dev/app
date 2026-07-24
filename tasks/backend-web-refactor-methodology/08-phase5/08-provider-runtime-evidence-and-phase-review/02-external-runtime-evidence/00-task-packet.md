# 5-7a — External Runtime Evidence

## Status

**Public-readonly branch executed but inconclusive (2026-07-21T02:18:29Z).**
This packet separates safe public-edge observation from evidence that requires
an operator-authorized provider test. The current executor cannot establish a
TCP/TLS connection to these targets or to an independent public HTTPS target,
so it did not observe a remote HTTP response. That is an observer-path limit,
not a deployed-runtime finding. It does not authorize source, deployment,
provider-console, order, payment, or callback configuration mutation.

Procedure annotation (2026-07-24): Phase 7 intentionally removed the
structured edge/backend logging assumed by the original provider-proof
procedure. The current procedure below uses operator-controlled network/edge
capture correlated with the provider-signed request and captured Backend
receipt/acknowledgement. It does not restore console or structured-output
diagnostics.

## Objective

Establish only the deployed facts that cannot be proven locally:

1. which public backend origins are live and reachable over TLS;
2. whether the fixed CaoCao callback edge accepts the documented path and
   rejects a non-POST request without forwarding a body;
3. whether a named staging provider can later deliver one safe, signed callback
   to the intended backend; and
4. whether the staged WeChatPay notify origin is actually configured and can
   receive one safe, signed notification.

## Source-Derived Contract To Check

| Surface | Expected route / rule | Local anchor | What a public probe can establish |
| --- | --- | --- | --- |
| Backend liveness | `GET /health` | `apps/backend/src/index.ts` | a candidate public API origin is reachable and has a backend health route |
| Build identity | `GET /api/meta/build` | `apps/backend/src/controllers/meta.controller.ts` | deployed backend responds; it does not prove a specific Phase 5 revision unless metadata exposes it |
| CaoCao edge | `POST /api/v1/service_provider/caocao/callback/order`; non-POST should be `405` with `Allow: POST` | `apps/backend/src/infra/edge/caocao-callback-router.ts`, `apps/backend/deploy/nginx/caocao-callback-router.location.conf` | exact public path/method reaches a compatible edge without sending a callback body |
| CaoCao backend receipt | local route validates form signature and `callback_info` environment + provider binding | `apps/backend/src/controllers/ride-hailing-provider.controller.ts`, `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts` | only an authorized provider-signed staging callback plus operator-captured Backend receipt/acknowledgement can establish this |
| WeChatPay charge/refund notify | `/api/payment/wechat-pay/:providerInstanceId/notify/{charge,refund}`; `PAYMENT_NOTIFY_BASE_URL` builds the provider-visible origin | `apps/backend/src/controllers/payment-provider.controller.ts`, `apps/backend/src/domains/payment/services/payment-provider.ts` | public reachability can be observed; configured URL and signature verification require a provider/operator safe smoke |

## Scope And Safety Controls

- Candidate origins begin with the public origins supplied by Sir:
  `app.partner-up.cn`, `app-api.partner-up.cn`, `test.app.partner-up.cn`, and
  `test.app-api.partner-up.cn`. The repository additionally names
  `api-app.partner-up.cn` and `test.api-app.partner-up.cn` for the CaoCao edge;
  their relationship is an observation target, not an assumption.
- Safe probes are DNS/TLS resolution, `GET /health`, `GET /api/meta/build`, and
  `GET` of the documented CaoCao edge path with a unique correlation id. No
  request body, authorization, payment reference, provider identifier, or
  valid callback signature is sent.
- A `405 Allow: POST` on the documented edge path is evidence only of route
  admission. It does **not** prove body preservation, target selection, header
  isolation, backend receipt, or signature verification.
- No public `POST` is sent for a negative routing/signature case. The router's
  local contract already characterizes those cases; external negative proof
  must use the provider's safe staging facility or a named operator-approved
  harness so it cannot accidentally become a commercial side effect.
- Secrets, provider credentials, provider payloads, and customer/order IDs are
  never written into this packet. Evidence records redacted response metadata
  and a correlation id only.

## Required Operator-Proof Branch

The public probes cannot establish the following. Completion requires one
named staging provider instance for each applicable provider and an
operator-approved safe mechanism:

1. provider console/test facility sends a signed CaoCao callback containing a
   `pu.rhc.v1.stg.<provider-instance-id>` token for a non-commercial test
   identity;
2. an operator-controlled network/edge capture and the target staging Backend
   receipt/acknowledgement share a supplied correlation id (or another
   non-sensitive correlator), with the original body hash/size and proof that
   edge `Host` / `Forwarded` / `X-Forwarded-*` values were not forwarded;
3. an invalid routing token or signature is rejected without a durable order
   mutation; and
4. WeChatPay's test/sandbox notification mechanism reaches the exact notify
   URL, verifies the signature, and receives its protocol acknowledgement
   without creating a real charge or refund.

For a signed smoke, the operator retains the stop authority. The containment
posture is: staging only, no real passenger/payment, one disposable test
identity, correlation before dispatch, and forward-only runtime recovery via
the operator capture plus authoritative Backend/provider state if the test is
not acknowledged.

## Low-Cost Verification

1. Save a timestamped, redacted probe transcript and operator receipt
   reference in `evidence-log.md`.
2. Cross-check the observed route behavior against the source contract above.
3. Classify each fact as **observed**, **contradicted**, or **not established**;
   never upgrade a local assertion to a deployment claim.
4. Only promote a deployment-doc correction when an observed contradiction is
   reproducible and its concrete runtime owner is known.

## Current Handoff Condition

Repeat the same bodyless probe from an Internet-reachable, operator-approved
runner before interpreting host or route health. Then perform the required
provider-signed staging smoke. The current executor has exhausted the safe
read-only probe variants (normal and direct IPv4, with no configured proxy)
without a remote connection; the redacted record is in `evidence-log.md`.
