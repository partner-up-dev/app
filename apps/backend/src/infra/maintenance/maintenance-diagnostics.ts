import { jobRunner } from "../jobs";
import { JobRepository } from "../../repositories/JobRepository";

const MAX_REGISTERED_JOB_TYPES = 64;
const jobRepository = new JobRepository();

export const readMaintenanceDiagnostics = async () => {
  const runner = jobRunner.status();
  const registeredJobTypes = runner.registeredJobTypes.slice(0, MAX_REGISTERED_JOB_TYPES);
  const database = await jobRepository.readRuntimeDiagnostics();

  return {
    asOfIso: database.asOfIso,
    runner: {
      instanceId: runner.instanceId,
      running: runner.running,
      registeredJobTypes,
      registeredJobTypesTruncated: runner.registeredJobTypes.length > registeredJobTypes.length,
      lastRunAtIso: runner.lastRunAt?.toISOString() ?? null,
      lastSummary: runner.lastSummary,
    },
    database,
  };
};
