# 5-6A.3.1 Rehearsal

| Change | Expected invariant | Cheap failure signal |
| --- | --- | --- |
| Ride final settlement calls the renamed Bill command | one committed final input yields at most one Bill | callback scenario creates/reuses exactly one Bill |
| Bill Detail obtains Trade item name through a query | no Trade row/service leaks through Bill's public output | typecheck rejects an accidental entity export |
| payment-state projection moves behind Bill query surface | unpaid/paid/refunded statuses remain identical | Bill/Rental focused scenario assertion diff |
| retained Rental termination imports explicit Bill/Payment commands | runtime remains retired for new traffic | rental retirement scenario still returns 410/no writes |
| category migration touches transaction code | executor is passed through unchanged; no provider I/O becomes locked | focused scenario + code review of executor path |
