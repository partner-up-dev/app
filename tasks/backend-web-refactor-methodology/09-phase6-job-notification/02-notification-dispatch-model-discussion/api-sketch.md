# D6-N-01 Ratified Boundary Sketch

This is pseudocode for the ratified owner boundary, not a frozen TypeScript
implementation. Slice `6-2` must preserve the semantic ownership below while
choosing the smallest source shape that fits the existing module.

## Stable Business Template Vocabulary

```ts
type BusinessNotificationTemplate =
  | "pr.confirmation-reminder"
  | "pr.activity-start-reminder"
  | "pr.new-partner"
  | "pr.meeting-point-updated"
  | "pr.ready"
  | "pr.message-summary"
  | "pr.waitlist-promoted"
  | "pr.waitlist-alternative-available";

type NotificationPayloadByTemplate = {
  "pr.confirmation-reminder": {
    prId: number;
    slotId: number;
    reminder: "CONFIRM_START" | "CONFIRM_END_MINUS_30M";
  };
  "pr.activity-start-reminder": { prId: number };
  "pr.new-partner": { prId: number; partnerId: number };
  "pr.meeting-point-updated": { prId: number };
  "pr.ready": { prId: number };
  "pr.message-summary": { prId: number };
  "pr.waitlist-promoted": { prId: number; partnerId: number };
  "pr.waitlist-alternative-available": { prId: number; candidateId: number };
};

type NotificationChannel = "WECHAT_SUBSCRIPTION";
```

These IDs are product/business vocabulary. A WeChat provider template ID is a
private value in the template/channel binding.

## Notification Public Command Surface

```ts
type NotificationTaskMetadata = {
  aggregate: { type: string; id: string };
  causationId: string;
  correlationId?: string;
};

interface NotificationCommands {
  request<T extends BusinessNotificationTemplate>(input: {
    template: T;
    recipientUserId: string;
    channel: NotificationChannel;
    payload: NotificationPayloadByTemplate[T];
    metadata: NotificationTaskMetadata;
  }): Promise<{
    creation: "CREATED" | "COALESCED";
  }>;

  acknowledge(input: {
    template: "pr.message-summary";
    aggregate: { type: "partner_request"; id: string };
    recipientUserId: string;
    throughCursor: number;
  }): Promise<{ released: boolean }>;
}
```

For a channel-specific product act such as accepting a WeChat subscription,
the caller may select the channel. A later channel-neutral workflow may instead
ask a Notification policy to resolve one or more channels. Neither form exposes
provider IDs. The caller supplies semantic business facts, not `runAt`, a Job
type, a private dedupe key or a creation mode. Notification's template policy
derives timing, creation and dedupe behavior. `acknowledge` is a frequency-
control command, not a read receipt.

## Notification-Owned Task Policy

```ts
type NotificationSchedule = {
  runAt: Date;
  timingPolicy: NotificationTimingPolicy;
};

type NotificationTaskPolicy<T extends BusinessNotificationTemplate> = {
  schedule(input: NotificationPayloadByTemplate[T]): NotificationSchedule;
  creation(input: {
    recipientUserId: string;
    payload: NotificationPayloadByTemplate[T];
    metadata: NotificationTaskMetadata;
  }): NotificationCreation;
};

type NotificationCreation =
  | { mode: "ONCE"; dedupeKey: string }
  | {
      mode: "UNTIL_ACKNOWLEDGED";
      key: string;
      cursor: number;
    };
```

The exact timing input may require a curated owner query at scheduling time.
It must not push Job mechanics or provider vocabulary back into the caller.

## Job Representation

```ts
type NotificationJobPayload = {
  schemaVersion: 1;
  template: BusinessNotificationTemplate;
  recipientUserId: string;
  channel: NotificationChannel;
  payload: NotificationPayloadByTemplate[BusinessNotificationTemplate];
  aggregate: { type: string; id: string };
  causationId: string;
  correlationId?: string;
};

jobRunner.scheduleOnce({
  jobType: "notification.send.v1",
  payload: notificationJobPayload,
  runAt,
  timingPolicy,
  creation,
});
```

The target treats this Job as the durable Notification Task. There is no
`createNotificationIntent` operation. The exact TypeScript representation must
retain the payload/template correlation rather than widening it to an unsafe
union as the illustrative storage type above does.

For `UNTIL_ACKNOWLEDGED`, Job stores window-start and high-water cursors. A
coalesced schedule atomically raises high-water; an acknowledgment releases the
reservation only when its cursor covers that high-water. This control metadata
does not enter the business-template payload.

When loss between a business transition and task creation is unacceptable, an
owner-local transaction-aware port must insert this Job inside the same
transaction or record a visible recovery handoff.

## Template Definition And Channel Binding

```ts
type TemplateDefinition<T extends BusinessNotificationTemplate> = {
  payloadSchema: Schema<NotificationPayloadByTemplate[T]>;
  bindings: Partial<{
    [C in NotificationChannel]: {
      providerTemplateRef: string;
      render(input: {
        payload: NotificationPayloadByTemplate[T];
        context: NotificationRenderContext;
      }): PreparedNotification<C>;
    };
  }>;
};

interface NotificationTemplateRegistry {
  get<T extends BusinessNotificationTemplate>(
    template: T,
  ): TemplateDefinition<T>;
}
```

`providerTemplateRef` may resolve from environment/config rather than being a
literal. The essential boundary is that business code never sees it.

## User Notification Option

```ts
type NotificationCredit =
  | { type: "UNLIMITED" }
  | { type: "LIMITED"; remaining: number };

type UserNotificationOption = {
  userId: string;
  template: BusinessNotificationTemplate;
  channel: NotificationChannel;
  preferred: boolean;
  credit: NotificationCredit;
};

const canSend =
  option.preferred &&
  (option.credit.type === "UNLIMITED" || option.credit.remaining > 0);
```

Storage may encode `UNLIMITED` as `credit = null`; the domain boundary must
decode that invariant explicitly.

## Generic Notification Job Handler

```ts
async function handleNotificationJob(
  job: JobContext<NotificationJobPayload>,
): Promise<JobExecutionDisposition> {
  const task = parseVersionedNotificationTask(job.payload);
  const option = await notificationOptions.get(
    task.recipientUserId,
    task.template,
    task.channel,
  );

  if (!isEligible(option, task)) {
    return { disposition: "SKIPPED", code: "NOT_ELIGIBLE" };
  }

  const definition = templateRegistry.get(task.template);
  const binding = requireChannelBinding(definition, task.channel);
  const prepared = binding.render({
    payload: task.payload,
    context: await loadRenderContext(task),
  });

  const result = await channels.get(task.channel).send(prepared);
  return applyNotificationResult({ job, task, option, result });
}
```

`applyNotificationResult` consumes or clears limited credit where provider
semantics require it, persists any Notification-owned semantic consequence,
then classifies the result as `SUCCEEDED`, `SKIPPED`, `RETRYABLE_FAILURE` or
`PERMANENT_FAILURE`. JobRunner owns durable control-state transition and emits
one correlated attempt signal around each handler invocation. The handler may
return bounded safe diagnostic metadata but does not independently emit a
second attempt event.

## Transport Port

```ts
interface NotificationChannelPort<C extends NotificationChannel> {
  send(input: PreparedNotification<C>): Promise<
    | { status: "SENT"; providerMessageId?: string | number | null }
    | {
        status: "FAILED";
        reason:
          | "RECIPIENT_PERMISSION_REVOKED"
          | "PERMANENT_PROVIDER_REFUSAL"
          | "TRANSPORT_ERROR"
          | "AMBIGUOUS_PROVIDER_OUTCOME";
        errorCode?: string | null;
        errorMessage?: string | null;
      }
  >;
}
```

The port knows provider protocol and credentials. It does not own product
preference, Job state, windowed-creation policy, or attempt telemetry.

`TRANSPORT_ERROR` is not automatically retryable. Unless the adapter proves the
effect was not applied and repetition is safe, it is classified with ambiguous
provider outcome as a non-retrying failure.

An ambiguous provider result is not a fifth Job disposition. Notification (or
the originating semantic owner) persists an uncertainty fact only when it is
independently valuable business/control state, then returns
`PERMANENT_FAILURE` unless a provider-specific idempotency/reconciliation
contract proves automatic retry safe. Pure Notification attempt uncertainty
remains O11y rather than creating an entity.
