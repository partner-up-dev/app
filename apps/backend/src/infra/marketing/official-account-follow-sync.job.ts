import { z } from "zod";
import { UserRepository } from "../../repositories/UserRepository";
import {
  WeChatOfficialAccountFollowerService,
  type WeChatOfficialAccountFollowerPage,
} from "../../services/WeChatOfficialAccountFollowerService";
import {
  NO_LATE_TOLERANCE_UNITS,
  jobRunner,
  type JobDefinition,
  type JobExecutionResult,
} from "../jobs";

const OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE = "wechat.official-account.follow-sync";
const OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_VERSION = 1;
const FOLLOW_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const BOOTSTRAP_DELAY_MS = 20_000;
const FOLLOW_SYNC_RESOLUTION_MS = 60_000;
const MAX_PAGES_PER_RUN = 200;
const DEDUPE_PREFIX = "wechat-official-account-follow-sync";

const payloadSchema = z.object({}).strict();

const followerService = new WeChatOfficialAccountFollowerService();
const userRepo = new UserRepository();

type OfficialAccountFollowSyncPayload = z.infer<typeof payloadSchema>;

type OfficialAccountFollowSyncJobDependencies = {
  isConfigured(): boolean;
  fetchFollowerOpenIdPage(nextOpenId: string | null): Promise<WeChatOfficialAccountFollowerPage>;
  markOfficialAccountFollowersByOpenIds(openIds: string[], followedAt: Date): Promise<number>;
  scheduleNextRun(): Promise<void>;
  now(): Date;
};

let definitionRegistered = false;

const buildDedupeKey = (runAt: Date): string =>
  `${DEDUPE_PREFIX}:${Math.floor(runAt.getTime() / FOLLOW_SYNC_INTERVAL_MS)}`;

export const scheduleOfficialAccountFollowSyncJob = async (runAt: Date): Promise<void> => {
  await jobRunner.scheduleOnce({
    jobType: OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE,
    jobVersion: OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_VERSION,
    runAt,
    resolutionMs: FOLLOW_SYNC_RESOLUTION_MS,
    earlyToleranceUnits: 0,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
    dedupeKey: buildDedupeKey(runAt),
    payload: {},
  });
};

const scheduleNextRun = async (): Promise<void> => {
  await scheduleOfficialAccountFollowSyncJob(new Date(Date.now() + FOLLOW_SYNC_INTERVAL_MS));
};

const defaultDependencies: OfficialAccountFollowSyncJobDependencies = {
  isConfigured: () => followerService.isConfigured(),
  fetchFollowerOpenIdPage: (nextOpenId) => followerService.fetchFollowerOpenIdPage(nextOpenId),
  markOfficialAccountFollowersByOpenIds: (openIds, followedAt) =>
    userRepo.markOfficialAccountFollowersByOpenIds(openIds, followedAt),
  scheduleNextRun,
  now: () => new Date(),
};

const retryableFailure = (reason: string): JobExecutionResult => ({
  disposition: "RETRYABLE_FAILURE",
  reason,
});

export const createOfficialAccountFollowSyncJobDefinition = (
  dependencies: OfficialAccountFollowSyncJobDependencies = defaultDependencies,
): JobDefinition<OfficialAccountFollowSyncPayload> => ({
  jobType: OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE,
  version: OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_VERSION,
  payloadSchema,
  async execute() {
    try {
      if (!dependencies.isConfigured()) {
        await dependencies.scheduleNextRun();
        return {
          disposition: "SUCCEEDED",
          reason: "FOLLOW_SYNC_NOT_CONFIGURED",
        };
      }

      let nextOpenId: string | null = null;
      let pages = 0;
      const seenNextOpenIds = new Set<string>();
      const followedAt = dependencies.now();

      while (pages < MAX_PAGES_PER_RUN) {
        const page = await dependencies.fetchFollowerOpenIdPage(nextOpenId);
        pages += 1;
        await dependencies.markOfficialAccountFollowersByOpenIds(page.openIds, followedAt);

        if (!page.nextOpenId || page.count === 0) {
          break;
        }
        if (seenNextOpenIds.has(page.nextOpenId)) {
          break;
        }

        seenNextOpenIds.add(page.nextOpenId);
        nextOpenId = page.nextOpenId;
      }

      if (pages >= MAX_PAGES_PER_RUN && nextOpenId !== null) {
        return retryableFailure("FOLLOW_SYNC_PAGE_LIMIT_EXCEEDED");
      }

      await dependencies.scheduleNextRun();
      return {
        disposition: "SUCCEEDED",
        reason: "FOLLOW_SYNC_COMPLETED",
      };
    } catch {
      return retryableFailure("FOLLOW_SYNC_DEPENDENCY_FAILURE");
    }
  },
});

export function registerOfficialAccountFollowSyncJobs(): void {
  if (definitionRegistered) {
    return;
  }
  jobRunner.registerDefinition(createOfficialAccountFollowSyncJobDefinition());
  definitionRegistered = true;
}

export async function bootstrapOfficialAccountFollowSyncJob(): Promise<void> {
  await scheduleOfficialAccountFollowSyncJob(new Date(Date.now() + BOOTSTRAP_DELAY_MS));
}
