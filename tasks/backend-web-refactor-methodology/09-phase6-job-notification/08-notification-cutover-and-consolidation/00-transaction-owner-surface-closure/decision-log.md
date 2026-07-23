# `6-3.1h` Decision Log

## D6-3.1h-01 — Executor is the only source-to-Notification transaction capability

**Decision:** a source's curated Notification factory accepts its transaction
executor plus source semantic facts. It does not accept a Job writer.

**Why:** the executor is already the source transaction's bounded capability;
Notification can bind its own generic Job adapter to it. Passing a Job writer
adds a source-visible implementation seam without adding transactional power.

## D6-3.1h-02 — Writer injection is test-private, not a cross-domain contract

**Decision:** keep a writer-injected adapter only inside Notification for local
unit tests. It is not root-exported and source domains cannot depend on it.

**Why:** deterministic tests need a small fake; production source code needs a
small owner interface. Conflating those needs leaks test mechanics into the
architecture.

## D6-3.1h-03 — Repair every discovered source root in one bounded pass

**Decision:** the correction includes PR, POI, and admin PR-type coordination,
because all use the same Notification-owned scheduling policy. It does not
expand into Job/Notification product semantics.

**Why:** leaving one direct writer import would preserve the wrong precedent
and require an exception list. The source inventory is finite and mechanically
verifiable.
