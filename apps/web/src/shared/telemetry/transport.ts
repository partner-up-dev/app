import { client } from "@/lib/rpc";
import {
  createTelemetryQueue,
  TELEMETRY_BATCH_SIZE,
  type PendingUserTelemetryEvent,
  type TelemetryQueue,
} from "./queue";

export type TelemetryTransportOutcome = "accepted" | "terminal" | "retryable";

export const classifyTelemetryResponse = (status: number): TelemetryTransportOutcome => {
  if (status >= 200 && status < 300) return "accepted";
  if (status === 408 || status === 425 || status === 429 || status >= 500) return "retryable";
  if (status >= 400 && status < 500) return "terminal";
  return "terminal";
};

export const classifyTelemetryError = (error: unknown): TelemetryTransportOutcome => {
  // A thrown fetch error represents network uncertainty. The event remains
  // eligible for a bounded retry; no exception escapes the behavior caller.
  void error;
  return "retryable";
};

export type TelemetryTransport = {
  enqueue: (event: PendingUserTelemetryEvent) => void;
  enqueueMany: (events: readonly PendingUserTelemetryEvent[]) => void;
  flush: () => Promise<void>;
  dispose: () => void;
  readonly queue: TelemetryQueue;
};

type TelemetryTransportOptions = {
  queue?: TelemetryQueue;
  postBatch?: (events: readonly PendingUserTelemetryEvent[]) => Promise<Response>;
  flushIntervalMs?: number;
  retryIntervalMs?: number;
  batchSize?: number;
  maxQueueSize?: number;
};

const defaultPostBatch = async (events: readonly PendingUserTelemetryEvent[]): Promise<Response> =>
  await client.api.telemetry.user.events.$post({ json: { events: [...events] } });

export const createTelemetryTransport = (
  options: TelemetryTransportOptions = {},
): TelemetryTransport => {
  const queue = options.queue ?? createTelemetryQueue(options.maxQueueSize);
  const postBatch = options.postBatch ?? defaultPostBatch;
  const flushIntervalMs = options.flushIntervalMs ?? 2_000;
  const retryIntervalMs = options.retryIntervalMs ?? 5_000;
  const batchSize = options.batchSize ?? TELEMETRY_BATCH_SIZE;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let lifecycleInstalled = false;

  const schedule = (delayMs: number): void => {
    if (timer !== null || queue.isEmpty) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delayMs);
  };

  const flushOnce = async (): Promise<void> => {
    if (queue.isEmpty) return;
    const batch = queue.takeBatch(batchSize);
    if (batch.length === 0) return;

    let outcome: TelemetryTransportOutcome;
    try {
      const response = await postBatch(batch);
      outcome = classifyTelemetryResponse(response.status);
    } catch (error) {
      outcome = classifyTelemetryError(error);
    }

    if (outcome === "retryable") {
      queue.requeueFailed(batch);
      schedule(retryIntervalMs);
      return;
    }

    // Both accepted (including a 2xx response containing rejected records) and
    // deterministic terminal 4xx outcomes consume the batch permanently.
    if (!queue.isEmpty) schedule(0);
  };

  const flush = (): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = flushOnce().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const installLifecycle = (): void => {
    if (lifecycleInstalled || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    lifecycleInstalled = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
    window.addEventListener("beforeunload", () => {
      void flush();
    });
  };

  const enqueue = (event: PendingUserTelemetryEvent): void => {
    queue.enqueue(event);
    installLifecycle();
    if (queue.size >= batchSize) {
      void flush();
    } else {
      schedule(flushIntervalMs);
    }
  };

  const enqueueMany = (events: readonly PendingUserTelemetryEvent[]): void => {
    if (events.length === 0) return;
    queue.enqueueMany(events);
    installLifecycle();
    if (queue.size >= batchSize) {
      void flush();
    } else {
      schedule(flushIntervalMs);
    }
  };

  const dispose = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { enqueue, enqueueMany, flush, dispose, queue };
};
