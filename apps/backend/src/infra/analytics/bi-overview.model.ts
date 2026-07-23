import type { PRStatus } from "../../entities/partner-request";
import { addDaysUtc8, formatDateKeyUtc8 } from "./time-window";
import { resolveAnalyticsRange } from "./analytics-range";

export type BIOverviewQueryInput = {
  startAt?: Date;
  endAt?: Date;
};

export type BIOverviewFilters = {
  startAt: string;
  endAt: string;
};

export type RetentionWindowDays = 3 | 5 | 7;

export type RetentionRow = {
  cohortDate: string;
  activeUsers: number;
  retainedWithin3Days: number;
  retainedWithin5Days: number;
  retainedWithin7Days: number;
  retentionRate3Days: number;
  retentionRate5Days: number;
  retentionRate7Days: number;
};

export type UserPRCountInputRow = {
  userKey: string;
  createdCount: number;
  joinedCount: number;
};

export type UserPRCountSummary = {
  usersWithAnyPR: number;
  creatorUsers: number;
  participantUsers: number;
  createdPRs: number;
  joinedPRs: number;
  averageCreatedPerCreator: number;
  averageJoinedPerParticipant: number;
  maxCreatedByOneUser: number;
  maxJoinedByOneUser: number;
};

export type PRLifecycleStatusInputRow = {
  status: PRStatus;
  count: number;
};

export type PRLifecycleStatusRow = {
  status: PRStatus;
  count: number;
  share: number;
};

export type PRLifecycleCohortSummary = {
  createdPRs: number;
  formedPRs: number;
  closedPRs: number;
  expiredPRs: number;
  activeOrOpenPRs: number;
  statusRows: PRLifecycleStatusRow[];
};

export type PRLifecycleSummary = PRLifecycleCohortSummary & {
  createdAtCohort: PRLifecycleCohortSummary;
  timeWindowEndAtCohort: PRLifecycleCohortSummary;
};

export type BIOverviewResponse = {
  filters: BIOverviewFilters;
  retention: {
    rows: RetentionRow[];
  };
  userPRCounts: UserPRCountSummary;
  prLifecycle: PRLifecycleSummary;
};

export type RetentionActivityFactRow = {
  eventId: string;
  eventName: string;
  journeyId: string;
  occurredAt: Date;
  identityKey: string | null;
};

const FORMED_STATUSES = new Set<PRStatus>(["READY", "ACTIVE", "CLOSED"]);

const ACTIVE_OR_OPEN_STATUSES = new Set<PRStatus>(["OPEN", "READY", "ACTIVE"]);

export const resolveBIOverviewFilters = (input: BIOverviewQueryInput): BIOverviewFilters => {
  return resolveAnalyticsRange(input);
};

const buildRate = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0;

const isOccurredInWindow = (occurredAt: Date, filters: BIOverviewFilters): boolean => {
  const timestamp = occurredAt.getTime();
  return (
    timestamp >= new Date(filters.startAt).getTime() &&
    timestamp < new Date(filters.endAt).getTime()
  );
};

const buildRetentionRows = (
  filters: BIOverviewFilters,
  retentionEvents: RetentionActivityFactRow[],
): RetentionRow[] => {
  const activeDatesByUser = new Map<string, Set<string>>();
  for (const event of retentionEvents) {
    if (!event.identityKey) continue;

    const dateKey = formatDateKeyUtc8(event.occurredAt);
    const activeDates = activeDatesByUser.get(event.identityKey) ?? new Set<string>();
    activeDates.add(dateKey);
    activeDatesByUser.set(event.identityKey, activeDates);
  }

  const usersByDate = new Map<string, Set<string>>();
  for (const event of retentionEvents) {
    if (!isOccurredInWindow(event.occurredAt, filters)) continue;
    if (!event.identityKey) continue;

    const dateKey = formatDateKeyUtc8(event.occurredAt);
    const users = usersByDate.get(dateKey) ?? new Set<string>();
    users.add(event.identityKey);
    usersByDate.set(dateKey, users);
  }

  const hasReturnWithinDays = (
    activeDates: Set<string>,
    cohortDate: string,
    days: RetentionWindowDays,
  ): boolean => {
    const endDate = addDaysUtc8(cohortDate, days);
    for (const dateKey of activeDates) {
      if (dateKey > cohortDate && dateKey <= endDate) {
        return true;
      }
    }
    return false;
  };

  return Array.from(usersByDate.entries())
    .map(([cohortDate, users]) => {
      let retainedWithin3Days = 0;
      let retainedWithin5Days = 0;
      let retainedWithin7Days = 0;

      for (const userKey of users) {
        const activeDates = activeDatesByUser.get(userKey) ?? new Set<string>();
        if (hasReturnWithinDays(activeDates, cohortDate, 3)) {
          retainedWithin3Days += 1;
        }
        if (hasReturnWithinDays(activeDates, cohortDate, 5)) {
          retainedWithin5Days += 1;
        }
        if (hasReturnWithinDays(activeDates, cohortDate, 7)) {
          retainedWithin7Days += 1;
        }
      }

      const activeUsers = users.size;
      return {
        cohortDate,
        activeUsers,
        retainedWithin3Days,
        retainedWithin5Days,
        retainedWithin7Days,
        retentionRate3Days: buildRate(retainedWithin3Days, activeUsers),
        retentionRate5Days: buildRate(retainedWithin5Days, activeUsers),
        retentionRate7Days: buildRate(retainedWithin7Days, activeUsers),
      };
    })
    .sort((left, right) => left.cohortDate.localeCompare(right.cohortDate));
};

const buildUserPRCountSummary = (rows: readonly UserPRCountInputRow[]): UserPRCountSummary => {
  let creatorUsers = 0;
  let participantUsers = 0;
  let createdPRs = 0;
  let joinedPRs = 0;
  let maxCreatedByOneUser = 0;
  let maxJoinedByOneUser = 0;

  for (const row of rows) {
    if (row.createdCount > 0) creatorUsers += 1;
    if (row.joinedCount > 0) participantUsers += 1;
    createdPRs += row.createdCount;
    joinedPRs += row.joinedCount;
    maxCreatedByOneUser = Math.max(maxCreatedByOneUser, row.createdCount);
    maxJoinedByOneUser = Math.max(maxJoinedByOneUser, row.joinedCount);
  }

  return {
    usersWithAnyPR: rows.length,
    creatorUsers,
    participantUsers,
    createdPRs,
    joinedPRs,
    averageCreatedPerCreator: buildRate(createdPRs, creatorUsers),
    averageJoinedPerParticipant: buildRate(joinedPRs, participantUsers),
    maxCreatedByOneUser,
    maxJoinedByOneUser,
  };
};

const buildPRLifecycleCohortSummary = (
  rows: readonly PRLifecycleStatusInputRow[],
): PRLifecycleCohortSummary => {
  const createdPRs = rows.reduce((total, row) => total + row.count, 0);
  let formedPRs = 0;
  let closedPRs = 0;
  let expiredPRs = 0;
  let activeOrOpenPRs = 0;

  for (const row of rows) {
    if (FORMED_STATUSES.has(row.status)) {
      formedPRs += row.count;
    }
    if (ACTIVE_OR_OPEN_STATUSES.has(row.status)) {
      activeOrOpenPRs += row.count;
    }
    if (row.status === "CLOSED") {
      closedPRs += row.count;
    }
    if (row.status === "EXPIRED") {
      expiredPRs += row.count;
    }
  }

  return {
    createdPRs,
    formedPRs,
    closedPRs,
    expiredPRs,
    activeOrOpenPRs,
    statusRows: rows
      .map((row) => ({
        status: row.status,
        count: row.count,
        share: buildRate(row.count, createdPRs),
      }))
      .sort((left, right) => left.status.localeCompare(right.status)),
  };
};

export const buildBIOverviewResponse = (input: {
  filters: BIOverviewFilters;
  retentionEvents: RetentionActivityFactRow[];
  userPRCountRows: UserPRCountInputRow[];
  prLifecycleCreatedAtStatusRows: PRLifecycleStatusInputRow[];
  prLifecycleTimeWindowEndAtStatusRows: PRLifecycleStatusInputRow[];
}): BIOverviewResponse => {
  const createdAtCohort = buildPRLifecycleCohortSummary(input.prLifecycleCreatedAtStatusRows);
  const timeWindowEndAtCohort = buildPRLifecycleCohortSummary(
    input.prLifecycleTimeWindowEndAtStatusRows,
  );

  return {
    filters: input.filters,
    retention: {
      rows: buildRetentionRows(input.filters, input.retentionEvents),
    },
    userPRCounts: buildUserPRCountSummary(input.userPRCountRows),
    prLifecycle: {
      ...createdAtCohort,
      createdAtCohort,
      timeWindowEndAtCohort,
    },
  };
};
