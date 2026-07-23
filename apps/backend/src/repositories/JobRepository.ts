import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  jobs,
  type JobExecutionDisposition,
  type JobRow,
  type JobStatus,
  type NewJobRow,
} from "../entities/job";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export interface JobClaimTransition {
  jobId: number;
  runnerId: string;
  leaseToken: string;
  status: "SUCCEEDED" | "SKIPPED" | "RETRY" | "FAILED";
  disposition: JobExecutionDisposition;
  reason: string | null;
  retryAt?: Date;
}

export class JobRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async readRuntimeDiagnostics(input: { now?: Date } = {}) {
    const now = input.now ?? new Date();
    // Due work is a nominal runAt-based backlog signal, not the full
    // bucket/tolerance claim predicate; HELD reservations remain included and
    // are reported separately.
    const rows = await this.executor
      .select({
        activeCount: sql<number>`count(*) filter (where ${jobs.status} in ('PENDING', 'RETRY', 'RUNNING'))::int`,
        pendingCount: sql<number>`count(*) filter (where ${jobs.status} = 'PENDING')::int`,
        retryCount: sql<number>`count(*) filter (where ${jobs.status} = 'RETRY')::int`,
        runningCount: sql<number>`count(*) filter (where ${jobs.status} = 'RUNNING')::int`,
        dueCount: sql<number>`count(*) filter (where ${jobs.status} in ('PENDING', 'RETRY') and ${jobs.runAt} <= ${now.toISOString()}::timestamptz)::int`,
        expiredLeaseCount: sql<number>`count(*) filter (where ${jobs.status} = 'RUNNING' and ${jobs.leaseUntil} is not null and ${jobs.leaseUntil} < ${now.toISOString()}::timestamptz)::int`,
        failedCount: sql<number>`count(*) filter (where ${jobs.status} = 'FAILED')::int`,
        retryExhaustedCount: sql<number>`count(*) filter (where ${jobs.lastReason} = 'RETRY_EXHAUSTED')::int`,
        missedCount: sql<number>`count(*) filter (where ${jobs.status} = 'MISSED')::int`,
        heldReservationCount: sql<number>`count(*) filter (where ${jobs.reservationState} = 'HELD')::int`,
        oldestDueRunAt: sql<Date | null>`min(${jobs.runAt}) filter (where ${jobs.status} in ('PENDING', 'RETRY') and ${jobs.runAt} <= ${now.toISOString()}::timestamptz)`,
        oldestLeaseUntil: sql<Date | null>`min(${jobs.leaseUntil}) filter (where ${jobs.status} = 'RUNNING' and ${jobs.leaseUntil} is not null)`,
      })
      .from(jobs);
    const row = rows[0];
    const count = (value: number | string | null | undefined): number => Number(value ?? 0);
    const toIso = (value: Date | string | null | undefined): string | null => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };
    const oldestDueRunAtIso = toIso(row?.oldestDueRunAt);
    const oldestLeaseUntilIso = toIso(row?.oldestLeaseUntil);
    const ageMs = (iso: string | null): number | null =>
      iso === null ? null : Math.max(0, now.getTime() - new Date(iso).getTime());

    return {
      asOfIso: now.toISOString(),
      activeCount: count(row?.activeCount),
      pendingCount: count(row?.pendingCount),
      retryCount: count(row?.retryCount),
      runningCount: count(row?.runningCount),
      dueCount: count(row?.dueCount),
      expiredLeaseCount: count(row?.expiredLeaseCount),
      failedCount: count(row?.failedCount),
      retryExhaustedCount: count(row?.retryExhaustedCount),
      missedCount: count(row?.missedCount),
      heldReservationCount: count(row?.heldReservationCount),
      oldestDueRunAtIso,
      oldestDueLagMs: ageMs(oldestDueRunAtIso),
      oldestLeaseUntilIso,
    };
  }

  async create(data: NewJobRow): Promise<JobRow> {
    const rows = await this.executor.insert(jobs).values(data).returning();
    return rows[0]!;
  }

  async findActiveByDedupeKey(dedupeKey: string): Promise<Pick<JobRow, "id"> | null> {
    const rows = await this.executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(eq(jobs.dedupeKey, dedupeKey), inArray(jobs.status, ["PENDING", "RETRY", "RUNNING"])),
      )
      .orderBy(asc(jobs.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveByJobTypeAndDedupeKey(input: {
    jobType: string;
    dedupeKey: string;
  }): Promise<Pick<JobRow, "id"> | null> {
    const rows = await this.executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, input.jobType),
          eq(jobs.dedupeKey, input.dedupeKey),
          inArray(jobs.status, ["PENDING", "RETRY", "RUNNING"]),
        ),
      )
      .orderBy(asc(jobs.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findOncePerCauseForUpdate(input: {
    jobType: string;
    creationKey: string;
  }): Promise<JobRow | null> {
    const rows = await this.executor
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, input.jobType),
          eq(jobs.creationMode, "ONCE_PER_CAUSE"),
          eq(jobs.creationKey, input.creationKey),
        ),
      )
      .for("update");
    return rows[0] ?? null;
  }

  async findHeldReservationForUpdate(input: {
    jobType: string;
    creationKey: string;
  }): Promise<JobRow | null> {
    const rows = await this.executor
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, input.jobType),
          eq(jobs.creationMode, "UNTIL_ACKNOWLEDGED"),
          eq(jobs.creationKey, input.creationKey),
          eq(jobs.reservationState, "HELD"),
        ),
      )
      .for("update");
    return rows[0] ?? null;
  }

  /**
   * Returns the currently held creation keys in deterministic order. The
   * prefix is an enumeration aid only; callers must still lock each exact key
   * before rereading and mutating its reservation.
   */
  async listHeldReservationCreationKeysByPrefix(input: {
    jobType: string;
    creationKeyPrefix: string;
  }): Promise<string[]> {
    const rows = await this.executor
      .select({ id: jobs.id, creationKey: jobs.creationKey })
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, input.jobType),
          eq(jobs.creationMode, "UNTIL_ACKNOWLEDGED"),
          eq(jobs.reservationState, "HELD"),
          sql`left(${jobs.creationKey}, length(${input.creationKeyPrefix})) = ${input.creationKeyPrefix}`,
        ),
      )
      .orderBy(asc(jobs.creationKey), asc(jobs.id));
    return rows.flatMap((row) => (row.creationKey === null ? [] : [row.creationKey]));
  }

  async lockCreationKey(input: { jobType: string; creationKey: string }): Promise<void> {
    await this.executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.jobType}), hashtext(${input.creationKey}))`,
    );
  }

  async lockDedupeReplacement(input: { jobType: string; activeKeyPrefix: string }): Promise<void> {
    await this.executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.jobType}), hashtext(${input.activeKeyPrefix}))`,
    );
  }

  async raiseHeldHighWater(input: { jobId: number; highWaterCursor: number }): Promise<void> {
    await this.executor
      .update(jobs)
      .set({
        highWaterCursor: sql`greatest(${jobs.highWaterCursor}, ${input.highWaterCursor})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobs.id, input.jobId),
          eq(jobs.creationMode, "UNTIL_ACKNOWLEDGED"),
          eq(jobs.reservationState, "HELD"),
        ),
      );
  }

  async releaseReservation(jobId: number): Promise<boolean> {
    const rows = await this.executor
      .update(jobs)
      .set({
        reservationState: "RELEASED",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.creationMode, "UNTIL_ACKNOWLEDGED"),
          eq(jobs.reservationState, "HELD"),
        ),
      )
      .returning({ id: jobs.id });
    return rows.length > 0;
  }

  async cancelPendingById(jobId: number, reason: string): Promise<boolean> {
    const rows = await this.executor
      .update(jobs)
      .set({
        status: "CANCELED",
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
        lastDisposition: null,
        lastReason: reason,
      })
      .where(and(eq(jobs.id, jobId), inArray(jobs.status, ["PENDING", "RETRY"])))
      .returning({ id: jobs.id });
    return rows.length > 0;
  }

  async cancelPendingByDedupe(input: {
    jobType: string;
    dedupeKey?: string;
    dedupeKeyPrefix?: string;
    reason: string;
  }): Promise<number> {
    const dedupeKey = input.dedupeKey?.trim();
    const dedupeKeyPrefix = input.dedupeKeyPrefix?.trim();
    if (!dedupeKey && !dedupeKeyPrefix) {
      throw new Error("cancelPendingByDedupe requires key or key prefix");
    }

    const conditions = [
      eq(jobs.jobType, input.jobType),
      inArray(jobs.status, ["PENDING", "RETRY"]),
    ];
    if (dedupeKey) conditions.push(eq(jobs.dedupeKey, dedupeKey));
    if (dedupeKeyPrefix) {
      conditions.push(
        sql`left(${jobs.dedupeKey}, length(${dedupeKeyPrefix})) = ${dedupeKeyPrefix}`,
      );
    }

    const rows = await this.executor
      .update(jobs)
      .set({
        status: "CANCELED",
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
        lastDisposition: null,
        lastReason: input.reason,
      })
      .where(and(...conditions))
      .returning({ id: jobs.id });
    return rows.length;
  }

  async transitionClaim(input: JobClaimTransition): Promise<boolean> {
    const completed = input.status !== "RETRY";
    const rows = await this.executor
      .update(jobs)
      .set({
        status: input.status as JobStatus,
        ...(input.retryAt ? { runAt: input.retryAt } : {}),
        leaseUntil: null,
        leasedBy: null,
        leaseToken: null,
        completedAt: completed ? new Date() : null,
        updatedAt: new Date(),
        lastDisposition: input.disposition,
        lastReason: input.reason,
        lastError:
          input.disposition === "SUCCEEDED" || input.disposition === "SKIPPED"
            ? null
            : input.reason,
      })
      .where(
        and(
          eq(jobs.id, input.jobId),
          eq(jobs.status, "RUNNING"),
          eq(jobs.leasedBy, input.runnerId),
          eq(jobs.leaseToken, input.leaseToken),
        ),
      )
      .returning({ id: jobs.id });
    return rows.length > 0;
  }

  async isCreationReservationHeld(jobId: number): Promise<boolean> {
    const rows = await this.executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.creationMode, "UNTIL_ACKNOWLEDGED"),
          eq(jobs.reservationState, "HELD"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
