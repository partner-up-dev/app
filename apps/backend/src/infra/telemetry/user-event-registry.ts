import {
  userTelemetryEventRegistry,
  type ActiveUserTelemetryEventContract,
  type UserTelemetryEventContract,
  type UserTelemetryRegistryValidationResult,
} from "./contracts";

const registryByKey = new Map<string, UserTelemetryEventContract>();
const activeRegistryByName = new Map<string, ActiveUserTelemetryEventContract>();

for (const contract of userTelemetryEventRegistry) {
  const key = buildRegistryKey(contract.eventName, contract.eventVersion);
  const existing = registryByKey.get(key);
  if (existing) {
    throw new Error(
      `Duplicate user telemetry event contract ${contract.eventName}@${contract.eventVersion}`,
    );
  }
  registryByKey.set(key, contract);

  if (contract.deprecated === undefined) {
    if (activeRegistryByName.has(contract.eventName)) {
      throw new Error(`Duplicate active user telemetry event ${contract.eventName}`);
    }
    activeRegistryByName.set(contract.eventName, contract as ActiveUserTelemetryEventContract);
  }
}

export const getUserTelemetryEventRegistry = (): typeof userTelemetryEventRegistry =>
  userTelemetryEventRegistry;

export const getUserTelemetryEventContract = (
  eventName: string,
  eventVersion: number,
): UserTelemetryEventContract | null =>
  registryByKey.get(buildRegistryKey(eventName, eventVersion)) ?? null;

/** Resolve the active version for a new backend emission. */
export const resolveActiveUserTelemetryEventContract = (
  eventName: string,
): ActiveUserTelemetryEventContract | null => {
  return activeRegistryByName.get(eventName) ?? null;
};

export const validateRegisteredUserTelemetryEvent = (input: {
  eventName: string;
  eventVersion: number;
  eventFamily?: string | null;
  attributes?: unknown;
  payload?: unknown;
}): UserTelemetryRegistryValidationResult => {
  const contract = getUserTelemetryEventContract(input.eventName, input.eventVersion);
  if (!contract) {
    return {
      ok: false,
      failureCode: "UNREGISTERED_EVENT",
      failureMessage: `User telemetry event ${input.eventName}@${input.eventVersion} is not registered`,
    };
  }

  if (input.eventFamily && input.eventFamily !== contract.eventFamily) {
    return {
      ok: false,
      failureCode: "EVENT_FAMILY_MISMATCH",
      failureMessage: `Event family ${input.eventFamily} does not match registry family ${contract.eventFamily}`,
    };
  }

  const attributes = contract.attributesSchema.safeParse(input.attributes ?? {});
  if (!attributes.success) {
    return {
      ok: false,
      failureCode: "INVALID_ATTRIBUTES",
      failureMessage: attributes.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const payload = contract.payloadSchema.safeParse(input.payload ?? {});
  if (!payload.success) {
    return {
      ok: false,
      failureCode: "INVALID_PAYLOAD",
      failureMessage: payload.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  return {
    ok: true,
    contract,
    attributes: attributes.data,
    payload: payload.data,
  };
};

function buildRegistryKey(eventName: string, eventVersion: number): string {
  return `${eventName}@${eventVersion}`;
}

export {
  defineUserTelemetryEventContract,
  userTelemetryAttributesSchema,
  userTelemetryAttributeValueSchema,
  userTelemetryPayloadSchema,
} from "./contracts";
export type {
  ActiveUserTelemetryEvent,
  ActiveUserTelemetryEventContract,
  ActiveUserTelemetryEventName,
  ActiveUserTelemetryEventVersion,
  UserTelemetryAttributes,
  UserTelemetryConsentClass,
  UserTelemetryEventContract,
  UserTelemetryPayload,
  UserTelemetryRegistryValidationResult,
} from "./contracts";
