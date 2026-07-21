import { sql } from "drizzle-orm";
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
import type {
  CreateOrderAttemptStatus,
  CreateOrderCommandResult,
  RideHailingCreateDispatchSeed,
} from "../domains/trade/model";
import { offers, type OfferId } from "./offer";
import { partnerRequests, type PRId } from "./partner-request";
import {
  rideHailingProviderInstances,
  type RideHailingProviderInstanceId,
} from "./ride-hailing-provider";
import { tradeOrders, type TradeOrderId } from "./trade-order";
import { users, type UserId } from "./user";

export type CreateOrderAttemptId = string & { readonly __brand: "CreateOrderAttemptId" };

export const createOrderAttempts = pgTable(
  "create_order_attempts",
  {
    id: uuid("id")
      .$type<CreateOrderAttemptId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorUserId: uuid("actor_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    commandFingerprint: text("command_fingerprint").notNull(),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "restrict" }),
    offerId: bigint("offer_id", { mode: "number" })
      .$type<OfferId>()
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .notNull()
      .references(() => tradeOrders.id, { onDelete: "restrict" }),
    providerInstanceId: uuid("provider_instance_id")
      .$type<RideHailingProviderInstanceId>()
      .notNull()
      .references(() => rideHailingProviderInstances.id, { onDelete: "restrict" }),
    externalOrderId: text("external_order_id").notNull(),
    providerOrderId: text("provider_order_id"),
    dispatchSeed: jsonb("dispatch_seed").$type<RideHailingCreateDispatchSeed>().notNull(),
    status: text("status").$type<CreateOrderAttemptStatus>().notNull().default("PREPARED"),
    resultSnapshot: jsonb("result_snapshot").$type<CreateOrderCommandResult | null>().default(null),
    responseStatus: integer("response_status"),
    providerRequestStartedAt: timestamp("provider_request_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    replayExpiresAt: timestamp("replay_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorKeyUnique: uniqueIndex("create_order_attempts_actor_key_unique").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    orderUnique: uniqueIndex("create_order_attempts_order_unique").on(table.orderId),
    providerExternalOrderUnique: uniqueIndex(
      "create_order_attempts_provider_external_order_unique",
    ).on(table.providerInstanceId, table.externalOrderId),
    providerOrderUnique: uniqueIndex("create_order_attempts_provider_order_unique")
      .on(table.providerInstanceId, table.providerOrderId)
      .where(sql`${table.providerOrderId} is not null`),
    prOfferStatusIdx: index("create_order_attempts_pr_offer_status_idx").on(
      table.prId,
      table.offerId,
      table.status,
    ),
  }),
);

export type CreateOrderAttempt = typeof createOrderAttempts.$inferSelect;
export type NewCreateOrderAttempt = typeof createOrderAttempts.$inferInsert;
