import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { partnerRequests, type PRId } from "./partner-request";
import { partners, type PartnerId } from "./partner";
import { users, type UserId } from "./user";
import type {
  StudySprintRoomStatus,
  StudySprintSessionEventPayload,
  StudySprintSessionEventType,
  StudySprintSessionStatus,
} from "../domains/study-sprint/model";

export type StudySprintRoomId = string & {
  readonly __brand: "StudySprintRoomId";
};
export type StudySprintSessionId = string & {
  readonly __brand: "StudySprintSessionId";
};
export type StudySprintSessionEventId = string & {
  readonly __brand: "StudySprintSessionEventId";
};

export const studySprintRooms = pgTable(
  "study_sprint_rooms",
  {
    id: uuid("id")
      .$type<StudySprintRoomId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    status: text("status").$type<StudySprintRoomStatus>().notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    prUnique: uniqueIndex("study_sprint_rooms_pr_unique").on(table.prId),
    statusUpdatedAtIdx: index("study_sprint_rooms_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
  }),
);

export const studySprintParticipantSessions = pgTable(
  "study_sprint_participant_sessions",
  {
    id: uuid("id")
      .$type<StudySprintSessionId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomId: uuid("room_id")
      .$type<StudySprintRoomId>()
      .notNull()
      .references(() => studySprintRooms.id, { onDelete: "cascade" }),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    partnerId: bigint("partner_id", { mode: "number" })
      .$type<PartnerId>()
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    status: text("status").$type<StudySprintSessionStatus>().notNull().default("FOCUSING"),
    targetDurationMinutes: integer("target_duration_minutes").notNull(),
    creditedFocusSeconds: integer("credited_focus_seconds").notNull().default(0),
    interruptionSeconds: integer("interruption_seconds").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    roomUserUnique: uniqueIndex("study_sprint_participant_sessions_room_user_unique").on(
      table.roomId,
      table.userId,
    ),
    roomStatusIdx: index("study_sprint_participant_sessions_room_status_idx").on(
      table.roomId,
      table.status,
    ),
    prUserIdx: index("study_sprint_participant_sessions_pr_user_idx").on(table.prId, table.userId),
  }),
);

export const studySprintSessionEvents = pgTable(
  "study_sprint_session_events",
  {
    id: uuid("id")
      .$type<StudySprintSessionEventId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .$type<StudySprintSessionId>()
      .notNull()
      .references(() => studySprintParticipantSessions.id, {
        onDelete: "cascade",
      }),
    eventType: text("event_type").$type<StudySprintSessionEventType>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    clientSeq: integer("client_seq").notNull(),
    payload: jsonb("payload")
      .$type<StudySprintSessionEventPayload>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionClientSeqUnique: uniqueIndex("study_sprint_session_events_session_client_seq_unique").on(
      table.sessionId,
      table.clientSeq,
    ),
    sessionOccurredAtIdx: index("study_sprint_session_events_session_occurred_at_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
  }),
);

export type StudySprintRoom = typeof studySprintRooms.$inferSelect;
export type NewStudySprintRoom = typeof studySprintRooms.$inferInsert;
export type StudySprintParticipantSession = typeof studySprintParticipantSessions.$inferSelect;
export type NewStudySprintParticipantSession = typeof studySprintParticipantSessions.$inferInsert;
export type StudySprintSessionEvent = typeof studySprintSessionEvents.$inferSelect;
export type NewStudySprintSessionEvent = typeof studySprintSessionEvents.$inferInsert;
