# Caocao Provider

Date: 2026-05-31

## Purpose

Track Caocao-specific provider evidence and decisions for the Phase 5
RideHailing integration.

## Reference Implementation

- `F:\CODING\Project\Anana\main\ride_hailing\managers\service_provider\caocao.py`
- `F:\CODING\Project\Anana\main\ride_hailing\schemas\service_provider\caocao\request.py`
- `F:\CODING\Project\Anana\main\ride_hailing\schemas\service_provider\caocao\response.py`
- `F:\CODING\Project\Anana\main\ride_hailing\schemas\service_provider\caocao\callback.py`

## Official Docs

- Summary:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1summary.html
- Domain:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.2domain.html
- Signing:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.3sign.html
- Order status and event codes:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.5orderProperties.html
- Estimate:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.6estimateWithPrice.html
- Call car:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.7callCar.html
- Cancel:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.8cancel.html
- Query detail:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.9queryOrderDetail.html
- Fee confirm:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.12confirmFee.html
- Order status callback:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.13notifyOrderStatus.html
- Tracking:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.14queryOrderTrace.html
- Bill/payment info:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.15queryBill.html
- Cancel fee:
  https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.21queryCancelFee.html

## Provider Facts

- Formal base domain is `https://cop.caocaokeji.cn`.
- Sandbox base domain is `https://sandbox-cop.caocaokeji.cn`.
- Common request params include `client_id`, millisecond `timestamp`, and
  `sign`.
- POST requests commonly use `application/x-www-form-urlencoded`.
- Signature algorithm:
  - include `sign_key` in the local signing map;
  - sort all params by key ascending;
  - concatenate `key + value`;
  - SHA1 the result;
  - send `sign`, but never send `sign_key`.
- Callback signature uses the same algorithm, but callback params do not include
  `client_id`.
- Official callback retry schedule is 1, 2, 4, 8, 16, and 32 minutes with a
  3 second timeout.
- The reference implementation treats callbacks as triggers, then queries order
  detail to reduce stale or incomplete callback-state risk.

## API Surface For Phase 5

- Estimate: `estimatePriceWithDetail`.
- Call car: `orderCarV2`.
- Query detail: `queryOrderDetailV2` or documented equivalent detail endpoint.
- Cancel: cancel order API, plus cancel-fee query when fee may apply.
- Tracking: driver polyline / location query APIs.
- Fee confirm: `feeConfirm`.
- Callback: partner-provided provider-instance-specific POST endpoint.

## Config Storage

Confirmed:

- Use a dedicated `ride_hailing_provider_instances` table.
- Store Caocao credentials and endpoint settings in typed `config` JSON.
- Do not use environment variables for Caocao provider credentials.
- Do not expose Caocao provider config through public config APIs.

Expected fields:

- `providerType`: `CAOCAO`.
- `instanceKey`.
- `status`: `ACTIVE` or `DISABLED`.
- `displayName`.
- `config.adapterMode`: `CAOCAO_OPEN_API`.
- `config.caocaoClientId`.
- `config.signKey`.
- `config.endpointBaseUrl`.
- `config.callbackBaseUrl`.
- `config.requestTimeoutMs`.

## External Id

Confirmed:

- Caocao `ext_order_id` is provider-specific.
- Generate it inside `CaocaoProviderAdapter`, not generic RideHailingOrder code.
- Use `rh` + lowercase base36-compressed UUID encoding.
- The same adapter-owned convention is used for callback/recovery mapping.

## Callback Routing

Provider callbacks should be routed to the concrete provider instance, similar
to Payment callbacks.

Proposed route:

```text
POST /api/ride-hailing/caocao/:providerInstanceId/callback/order-status
```

Historical compatibility alias:

```text
POST /api/v1/service_provider/caocao/callback/order
```

Alias behavior:

- resolve the first active `CAOCAO` provider instance by `created_at asc, id asc`;
- reuse the same provider-instance callback verification path;
- do not let the alias become the primary topology for new provider callbacks.

Flow:

1. Load `ride_hailing_provider_instances` by `providerInstanceId`.
2. Construct `CaocaoProviderAdapter` from that instance.
3. Verify callback signature with that instance's `sign_key`.
4. Parse Caocao payload.
5. Resolve local order through provider order no or adapter-owned external id.
6. Hand normalized event to the RideHailing fulfillment/order application
   service.

## Adapter Boundary

`CaocaoProviderAdapter` owns:

- signing and callback verification;
- request serialization;
- response parsing;
- provider error mapping;
- Caocao status/event mapping;
- external id conversion;
- provider-specific endpoint paths.
