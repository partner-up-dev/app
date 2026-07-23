export type TelemetryAttributeValue = string | number | boolean | null;

export type PendingUserTelemetryEvent = {
  event_id: string;
  event_name: string;
  event_version: number;
  journey_id: string;
  occurred_at: string;
  trace_id?: string;
  attributes: Record<string, TelemetryAttributeValue>;
  payload: Record<string, unknown>;
};

export const TELEMETRY_BATCH_SIZE = 50;
export const TELEMETRY_MAX_QUEUE_SIZE = 1_000;

/**
 * A small, deterministic FIFO used by the telemetry transport. It deliberately
 * has no timers or browser dependencies so queue behavior can be proved in
 * isolation.
 */
export type TelemetryQueue = {
  enqueue: (event: PendingUserTelemetryEvent) => void;
  enqueueMany: (events: readonly PendingUserTelemetryEvent[]) => void;
  takeBatch: (size?: number) => PendingUserTelemetryEvent[];
  requeueFailed: (events: readonly PendingUserTelemetryEvent[]) => void;
  clear: () => void;
  get size(): number;
  get isEmpty(): boolean;
};

export const createTelemetryQueue = (maxSize = TELEMETRY_MAX_QUEUE_SIZE): TelemetryQueue => {
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new RangeError("Telemetry queue max size must be a positive integer");
  }

  const pending: PendingUserTelemetryEvent[] = [];

  const trimTail = (): void => {
    if (pending.length > maxSize) pending.splice(maxSize);
  };

  const trimHead = (): void => {
    if (pending.length > maxSize) pending.splice(0, pending.length - maxSize);
  };

  return {
    enqueue(event) {
      pending.push(event);
      trimHead();
    },
    enqueueMany(events) {
      for (const event of events) pending.push(event);
      trimHead();
    },
    takeBatch(size = TELEMETRY_BATCH_SIZE) {
      if (!Number.isInteger(size) || size < 1) return [];
      return pending.splice(0, size);
    },
    requeueFailed(events) {
      if (events.length === 0) return;
      // Failed entries retain priority. If the cap is exceeded, evict the
      // newest tail rather than dropping the batch that must be retried.
      pending.unshift(...events);
      trimTail();
    },
    clear() {
      pending.length = 0;
    },
    get size() {
      return pending.length;
    },
    get isEmpty() {
      return pending.length === 0;
    },
  };
};
