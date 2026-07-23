import { z } from "zod";
import type { JobDefinition, JobHandler, JobPayload } from "./contracts";

const legacyPayloadSchema = z.record(z.unknown());

/**
 * Retains the current return/throw behavior while callers migrate to typed
 * definitions. A legacy normal return remains generic success; its handler is
 * still responsible for deciding whether it should throw.
 */
export function createLegacyJobDefinition(input: {
  jobType: string;
  handler: JobHandler;
  version?: number;
}): JobDefinition<JobPayload> {
  return {
    jobType: input.jobType,
    version: input.version ?? 1,
    payloadSchema: legacyPayloadSchema,
    async execute(payload, context) {
      await input.handler(payload, context);
      return { disposition: "SUCCEEDED" };
    },
  };
}
