# Phase Rehearsal

| Proposed change | Must remain true | Stop-and-reslice signal |
| --- | --- | --- |
| `5-2` admission surface | Web asks for an outcome; Trade remains final authority; quote is still the only client-supplied freshness/authorization fact | a page reconstructs policy from partial PR/Offer facts or a copied quote fact enters create input |
| `5-2` idempotency/provider processing | same command replays safely; a timed-out accepted provider create is processing, never blindly retried | a retry sends a second provider request or an unknown request is incorrectly marked terminal |
| `5-4` Rental cut-off | direct HTTP cannot create Rental Order/Bill/payment/booking; no Trade→Fulfillment production path remains | preserving an old UI/type requires retaining a public Rental write |
| `5-5` observation convergence | callback and poll use one authoritative provider-detail path; older observations cannot regress state | callback payload itself becomes execution truth or a correction silently overwrites settled Bill history |
| `5-6A` closure | every retired import/export has a named replacement and zero consumer evidence | a wildcard barrel or test-only fake API is proposed as a shortcut |
| `5-7` evidence | deployed facts are observed, not inferred from fake providers | a local scenario is used as proof of a provider-console or edge-routing setting |

If a slice needs a new product rule, customer workflow, refund policy, or global reliability mechanism to finish, stop
the slice and create a separately owned decision packet. That is the intended protection against Phase 5 turning back
into feature-patch accumulation.
