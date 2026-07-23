import { describe, expect, it, vi } from "vitest";
import { createTelemetryQueue } from "./queue";
import type { PendingUserTelemetryEvent } from "./queue";
import { createTelemetryTransport } from "./transport";

const event = (id: number): PendingUserTelemetryEvent => ({
  event_id: `00000000-0000-4000-8000-${id.toString().padStart(12, "0")}`,
  event_name: `test.event.${id}`,
  event_version: 1,
  journey_id: "00000000-0000-4000-8000-000000000001",
  occurred_at: "2026-01-01T00:00:00.000Z",
  attributes: {},
  payload: {},
});

const response = (status: number): Response => new Response(null, { status });
type PostBatch = (events: readonly PendingUserTelemetryEvent[]) => Promise<Response>;

describe("telemetry transport", () => {
  it.each([200, 201, 204])("consumes %s responses, including rejected records", async (status) => {
    const queue = createTelemetryQueue();
    const postBatch = vi.fn<PostBatch>(async () => response(status));
    const transport = createTelemetryTransport({ queue, postBatch });
    transport.enqueue(event(1));

    await transport.flush();

    expect(postBatch).toHaveBeenCalledOnce();
    expect(queue.isEmpty).toBe(true);
    transport.dispose();
  });

  it("consumes deterministic 4xx responses", async () => {
    const queue = createTelemetryQueue();
    const transport = createTelemetryTransport({
      queue,
      postBatch: vi.fn<PostBatch>(async () => response(422)),
    });
    transport.enqueue(event(1));

    await transport.flush();

    expect(queue.isEmpty).toBe(true);
    transport.dispose();
  });

  it.each([undefined, 408, 425, 429, 500, 503])(
    "requeues network/retryable outcome %s",
    async (status) => {
      const queue = createTelemetryQueue();
      const postBatch = vi.fn<PostBatch>(async () => {
        if (status === undefined) throw new TypeError("offline");
        return response(status);
      });
      const transport = createTelemetryTransport({ queue, postBatch, retryIntervalMs: 60_000 });
      transport.enqueue(event(1));

      await transport.flush();

      expect(queue.size).toBe(1);
      transport.dispose();
    },
  );

  it("uses a single in-flight flush", async () => {
    const queue = createTelemetryQueue();
    let release: (() => void) | undefined;
    const postBatch = vi.fn<PostBatch>(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(response(204));
        }),
    );
    const transport = createTelemetryTransport({ queue, postBatch });
    transport.enqueue(event(1));

    const first = transport.flush();
    const second = transport.flush();
    expect(first).toBe(second);
    release?.();
    await first;
    expect(postBatch).toHaveBeenCalledOnce();
    expect(queue.isEmpty).toBe(true);
    transport.dispose();
  });
});
