import type {
  TelemetryContextEventName,
  TelemetryContextPayload,
  TelemetryEventName,
  TelemetryPayload,
} from "@/shared/telemetry/events";
import { collectTelemetryContextEvent, collectTelemetryEvent } from "./collector";
import { createTelemetryTransport } from "./transport";

const transport = createTelemetryTransport();

declare global {
  interface Window {
    __PARTNER_UP_TELEMETRY_EVENTS__?: Array<{
      event: TelemetryEventName;
      eventName: TelemetryEventName;
      payload: Record<string, unknown>;
      at: string;
      path: string;
    }>;
  }
}

const pushDebugEvent = (
  record: NonNullable<ReturnType<typeof collectTelemetryEvent>["debugRecord"]>,
): void => {
  if (typeof window === "undefined") return;
  window.__PARTNER_UP_TELEMETRY_EVENTS__ ??= [];
  const events = window.__PARTNER_UP_TELEMETRY_EVENTS__;
  events.push(record);
  if (events.length > 1_000) events.splice(0, events.length - 1_000);
};

export const trackEvent = <TEvent extends TelemetryEventName>(
  event: TEvent,
  payload: TelemetryPayload<TEvent>,
): void => {
  const collected = collectTelemetryEvent(event, payload);
  if (collected.debugRecord) pushDebugEvent(collected.debugRecord);
  transport.enqueueMany(collected.envelopes);

  if (import.meta.env.DEV && collected.debugRecord) {
    console.debug("[telemetry]", collected.debugRecord);
  }
};

/**
 * Narrow context-only entry point. Behavior call sites must use trackEvent;
 * this function intentionally accepts only registered context contracts.
 */
export const trackContextEvent = <TEvent extends TelemetryContextEventName>(
  event: TEvent,
  payload: TelemetryContextPayload<TEvent>,
): void => {
  const collected = collectTelemetryContextEvent(event, payload);
  transport.enqueueMany(collected.envelopes);
};

export const flushTelemetry = (): Promise<void> => transport.flush();
