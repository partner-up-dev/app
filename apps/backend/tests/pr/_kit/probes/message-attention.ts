import { eq } from "drizzle-orm";
import { type JobRow, jobs } from "../../../../src/entities/job";
import {
  notificationTaskPayloadSchema,
  type PRMessageSummaryNotificationTask,
} from "../../../../src/domains/notification/owner/task";
import { db } from "../../../../src/lib/db";

export type PRMessageAttentionWindow = {
  job: JobRow;
  task: PRMessageSummaryNotificationTask;
};

/** Test-only persisted side-effect probe for a PR's generic message windows. */
export const probePRMessageAttentionWindows = async (
  prId: number,
): Promise<PRMessageAttentionWindow[]> => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (!parsed.success || parsed.data.template !== "pr.message-summary") return [];
    return parsed.data.payload.prId === prId ? [{ job, task: parsed.data }] : [];
  });
};
