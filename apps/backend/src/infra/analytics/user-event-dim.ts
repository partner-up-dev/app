import { getUserTelemetryEventRegistry } from "../telemetry/user-event-registry";

export type UserTelemetryDimEvent = {
  eventName: string;
  eventVersion: number;
  eventFamily: string;
  owner: string;
  biUsage: string[];
  deprecated: boolean;
};

export const getUserTelemetryDimEvents = (): UserTelemetryDimEvent[] =>
  getUserTelemetryEventRegistry().map((contract) => ({
    eventName: contract.eventName,
    eventVersion: contract.eventVersion,
    eventFamily: contract.eventFamily,
    owner: contract.owner,
    biUsage: [...contract.biUsage],
    deprecated: contract.deprecated !== undefined,
  }));
