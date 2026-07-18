# 05C — Compatibility Window And Facade Evidence

## Objective

Keep `PartnerRequestService` and any unavoidable legacy export as a thin, observable delegate until its real
consumers and potential external callers have a named removal condition. Do not call a facade removable merely
because one repository search is empty.

## Status

Complete. The former facade's internal consumers were migrated and the private file was removed after package-root
export and source/test inventory checks found no remaining caller. CF-01's null-identity product decision remains
owned by `3-7` as recorded below.

## Required Record

- exact retained path and consumers;
- reason the canonical surface cannot yet replace it;
- owning removal slice or external review trigger;
- one signature/delegate or controller smoke proof;
- no duplicate PR business logic inside the facade.

## Known Constraint

WeCom natural-language creation is a CF-01 input, not a `3-5` compatibility decision. The facade may preserve the
existing call only until `3-7` makes it authenticated before persistence.

## Verification

- `rg` and AST import evidence distinguish runtime, test, package/export and possible external consumers.
- Controller/facade smoke plus relevant LLM/Share/WeCom focused check.
- No new canonical-to-compatibility import or new SCC.
