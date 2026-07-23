import type {
  ActiveUserTelemetryEvent,
  ActiveUserTelemetryEventName,
} from "@partner-up-dev/backend/contracts";

export type TelemetryActionResult = "success" | "failure" | "blocked";

/** The Backend registry is the sole owner of active canonical event names. */
type ActiveFrontendTelemetryEvent = Extract<
  ActiveUserTelemetryEvent,
  { owner: `frontend.${string}` }
>;

export type TelemetryEventName = ActiveFrontendTelemetryEvent["eventName"];

export type TelemetryPayload<TEvent extends TelemetryEventName> = Extract<
  ActiveFrontendTelemetryEvent,
  { eventName: TEvent }
>["payload"];

/** Context events are intentionally narrower than behavior events. */
export type TelemetryContextEventName = Extract<
  ActiveUserTelemetryEventName,
  "auth.session.created"
>;

export type TelemetryContextPayload<TEvent extends TelemetryContextEventName> = Extract<
  ActiveUserTelemetryEvent,
  { eventName: TEvent }
>["payload"];
