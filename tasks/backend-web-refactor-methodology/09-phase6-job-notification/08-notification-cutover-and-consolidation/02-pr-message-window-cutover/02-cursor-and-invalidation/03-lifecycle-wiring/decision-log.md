# `6-3.2b-3` Decision Log — Lifecycle Wiring

## D6-3.2b-07 — Invalidate at the source-fact disappearance boundary

**Decision:** every participant removal invalidates that recipient's
PR-message window in the same PR-owned transaction that removes membership.
Terminal and root-delete paths may fan out only over the active roster that is
still present at their transition.

**Why:** the Notification identity is recipient-specific while PR owns the
membership fact. Once a slot is released or cascaded away, a later PR-wide
transition cannot correctly infer all prior recipients without inventing a
new cross-domain historical index.

**Consequence:** b3.1 is a prerequisite for terminal/root-delete correctness;
this is a state-transition dependency, not a code-file ordering preference.

## D6-3.2b-08 — Do not add an aggregate/payload Job scan for an interim generic population

**Decision:** the b2 generic window foundation and b3 lifecycle wiring ship as
one source cutover. Every post-cutover participant removal executes the
existing exact Notification transaction port while its PR membership fact
still exists. We do **not** add a Job API that queries a task payload by
`prId`, nor a PR-to-Job historical repair path.

**Evidence:** the only generic identity is Notification-private,
`recipient + prId`; the existing exact port already maps that identity while
Job sees only its opaque creation key. The generic b2 source files are not in
the current committed `HEAD`, so this repository's normal merge/deploy path
cannot have independently released b2 producer code before b3. Any contrary
runtime evidence is a deployment-reality input and requires a one-time
operator inventory before rollout, rather than an architectural exception.

**Why:** an aggregate fan-out has the current recipient set at the lifecycle
transition. A former recipient from a hypothetical split rollout is not a
reason to make generic Job understand PR JSON or make PR discover private
Notification work. That would create a permanent broad query surface to solve
a finite rollout mistake.

**Deployment invariant:** do not deploy `6-3.2b-2` producer/invalidation code
without `6-3.2b-3.1` removal wiring. If an environment is found to have an
earlier generic producer, pause that rollout and create a separately approved,
Notification-owned operational drain plan from concrete inventory evidence.

## D6-3.2b-09 — Lifecycle transactions use semantic Notification ports, never Job ports

**Decision:** PR lifecycle code may call a transaction-bound Notification
port with a PR/recipient semantic request. It must not import Job contracts,
creation keys, provider-specific cleanup, or a generic job repository.

**Factory consequence:** the curated PR-facing factory accepts the caller's
transaction executor and constructs Notification's Job writer internally. A
writer-injected adapter may remain Notification-private for focused tests, but
is not an alternate PR integration surface.

**Why:** lifecycle causes are PR business semantics; reservation release is
Notification policy mapped onto generic Job mechanics. This keeps all three
modules deep and independently evolvable.
