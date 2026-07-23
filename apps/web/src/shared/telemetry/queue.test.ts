import { describe, expect, it } from "vitest";
import { createTelemetryQueue } from "./queue";
import type { PendingUserTelemetryEvent } from "./queue";

const event = (id: number): PendingUserTelemetryEvent => ({
  event_id: `00000000-0000-4000-8000-${id.toString().padStart(12, "0")}`,
  event_name: `test.event.${id}`,
  event_version: 1,
  journey_id: "00000000-0000-4000-8000-000000000001",
  occurred_at: "2026-01-01T00:00:00.000Z",
  attributes: {},
  payload: {},
});

describe("telemetry queue", () => {
  it("is FIFO and evicts the oldest tail on normal enqueue", () => {
    const queue = createTelemetryQueue(3);
    queue.enqueueMany([event(1), event(2), event(3), event(4)]);

    expect(queue.takeBatch(3).map((item) => item.event_name)).toEqual([
      "test.event.2",
      "test.event.3",
      "test.event.4",
    ]);
  });

  it("requeues failed batches at the front and evicts newer tail entries", () => {
    const queue = createTelemetryQueue(3);
    queue.enqueueMany([event(1), event(2), event(3)]);
    const failed = queue.takeBatch(2);
    queue.enqueue(event(4));
    queue.requeueFailed(failed);

    expect(queue.takeBatch(3).map((item) => item.event_name)).toEqual([
      "test.event.1",
      "test.event.2",
      "test.event.3",
    ]);
  });
});
