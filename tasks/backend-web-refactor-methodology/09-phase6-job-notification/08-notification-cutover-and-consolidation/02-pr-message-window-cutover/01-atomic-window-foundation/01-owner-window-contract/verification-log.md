# `6-3.2a-1` Verification Log

| Check | Result | Why it is sufficient for this child |
| --- | --- | --- |
| `pnpm check:type:backend` | passed | Claim context, typed message rendering, runtime option mapping and the narrow transaction port compile together. |
| `pnpm check:lint:backend` | passed | Backend structure and lint rules accept the new owner/adapter boundaries. |
| focused units | 4 files / 37 tests passed | Verifies five-minute/private-key policy, missing/expired reservation skip, channel mapping, Job cursor propagation and unavailable-channel no-write behavior. |
| `pnpm test:unit:backend` | 107 files / 487 tests passed | Guards the shared Job and Notification surfaces against regressions. |
| `git diff --check` | passed | No whitespace/error-marker defect. |

Not attempted here: PR message insertion, producer replacement, Job-window
coalescing against real Postgres, or legacy message-row drain. Those have not
been moved and belong to `6-3.2a-2` / `6-3.2a-3`.
