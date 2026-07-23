import { z } from "zod";
import { UserRepository } from "../../repositories/UserRepository";
import { WeChatOfficialAccountFollowerService } from "../../services/WeChatOfficialAccountFollowerService";
import { NO_LATE_TOLERANCE_UNITS, jobRunner, type JobHandlerContext } from "../jobs";

const OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE = "wechat.official-account.follow-sync";
const FOLLOW_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const BOOTSTRAP_DELAY_MS = 20_000;
const FOLLOW_SYNC_RESOLUTION_MS = 60_000;
const MAX_PAGES_PER_RUN = 200;
const DEDUPE_PREFIX = "wechat-official-account-follow-sync";

const payloadSchema = z.object({}).strict();

const followerService = new WeChatOfficialAccountFollowerService();
const userRepo = new UserRepository();

let handlerRegistered = false;

const buildDedupeKey = (runAt: Date): string =>
  `${DEDUPE_PREFIX}:${Math.floor(runAt.getTime() / FOLLOW_SYNC_INTERVAL_MS)}`;

export const scheduleOfficialAccountFollowSyncJob = async (runAt: Date): Promise<void> => {
  await jobRunner.scheduleOnce({
    jobType: OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE,
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

async function handleOfficialAccountFollowSyncJob(
  payloadRaw: Record<string, unknown>,
  _context: JobHandlerContext,
): Promise<void> {
  const parseResult = payloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid official-account follow sync job payload");
  }

  if (!followerService.isConfigured()) {
    await scheduleNextRun();
    return;
  }

  let nextOpenId: string | null = null;
  let pages = 0;
  const seenNextOpenIds = new Set<string>();
  const followedAt = new Date();

  while (pages < MAX_PAGES_PER_RUN) {
    const page = await followerService.fetchFollowerOpenIdPage(nextOpenId);
    pages += 1;
    await userRepo.markOfficialAccountFollowersByOpenIds(page.openIds, followedAt);

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
    throw new Error(`Official-account follow sync exceeded ${MAX_PAGES_PER_RUN} pages`);
  }

  await scheduleNextRun();
}

export function registerOfficialAccountFollowSyncJobs(): void {
  if (handlerRegistered) {
    return;
  }
  jobRunner.registerHandler(
    OFFICIAL_ACCOUNT_FOLLOW_SYNC_JOB_TYPE,
    handleOfficialAccountFollowSyncJob,
  );
  handlerRegistered = true;
}

export async function bootstrapOfficialAccountFollowSyncJob(): Promise<void> {
  await scheduleOfficialAccountFollowSyncJob(new Date(Date.now() + BOOTSTRAP_DELAY_MS));
}
