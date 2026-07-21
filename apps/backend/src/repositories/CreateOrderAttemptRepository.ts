import { and, eq, inArray } from "drizzle-orm";
import type { CreateOrderAttemptStatus, CreateOrderCommandResult } from "../domains/trade/model";
import {
  type CreateOrderAttempt,
  type CreateOrderAttemptId,
  createOrderAttempts,
  type NewCreateOrderAttempt,
} from "../entities/create-order-attempt";
import type { RideHailingProviderInstanceId } from "../entities/ride-hailing-provider";
import type { TradeOrderId } from "../entities/trade-order";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class CreateOrderAttemptRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewCreateOrderAttempt): Promise<CreateOrderAttempt> {
    const [created] = await this.executor.insert(createOrderAttempts).values(data).returning();
    return created!;
  }

  async findByActorAndKey(input: {
    actorUserId: UserId;
    idempotencyKey: string;
  }): Promise<CreateOrderAttempt | null> {
    const [attempt] = await this.executor
      .select()
      .from(createOrderAttempts)
      .where(
        and(
          eq(createOrderAttempts.actorUserId, input.actorUserId),
          eq(createOrderAttempts.idempotencyKey, input.idempotencyKey),
        ),
      );
    return attempt ?? null;
  }

  async findById(id: CreateOrderAttemptId): Promise<CreateOrderAttempt | null> {
    const [attempt] = await this.executor
      .select()
      .from(createOrderAttempts)
      .where(eq(createOrderAttempts.id, id));
    return attempt ?? null;
  }

  async findByIdForUpdate(id: CreateOrderAttemptId): Promise<CreateOrderAttempt | null> {
    const [attempt] = await this.executor
      .select()
      .from(createOrderAttempts)
      .where(eq(createOrderAttempts.id, id))
      .for("update");
    return attempt ?? null;
  }

  async findByOrderId(orderId: TradeOrderId): Promise<CreateOrderAttempt | null> {
    const [attempt] = await this.executor
      .select()
      .from(createOrderAttempts)
      .where(eq(createOrderAttempts.orderId, orderId));
    return attempt ?? null;
  }

  async findByProviderCorrelation(input: {
    orderId: TradeOrderId;
    providerInstanceId: RideHailingProviderInstanceId;
    externalOrderId: string;
  }): Promise<CreateOrderAttempt | null> {
    const [attempt] = await this.executor
      .select()
      .from(createOrderAttempts)
      .where(
        and(
          eq(createOrderAttempts.orderId, input.orderId),
          eq(createOrderAttempts.providerInstanceId, input.providerInstanceId),
          eq(createOrderAttempts.externalOrderId, input.externalOrderId),
        ),
      );
    return attempt ?? null;
  }

  async transitionStatus(input: {
    id: CreateOrderAttemptId;
    expectedStatus: CreateOrderAttemptStatus;
    status: CreateOrderAttemptStatus;
    providerRequestStartedAt?: Date;
  }): Promise<CreateOrderAttempt | null> {
    const [updated] = await this.executor
      .update(createOrderAttempts)
      .set({
        status: input.status,
        ...(input.providerRequestStartedAt
          ? { providerRequestStartedAt: input.providerRequestStartedAt }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(createOrderAttempts.id, input.id),
          eq(createOrderAttempts.status, input.expectedStatus),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async complete(input: {
    id: CreateOrderAttemptId;
    allowedStatuses: CreateOrderAttemptStatus[];
    status: "SUCCEEDED" | "FAILED";
    providerOrderId?: string | null;
    resultSnapshot: CreateOrderCommandResult;
    responseStatus: number;
    completedAt: Date;
    replayExpiresAt: Date;
  }): Promise<CreateOrderAttempt | null> {
    const [updated] = await this.executor
      .update(createOrderAttempts)
      .set({
        status: input.status,
        providerOrderId: input.providerOrderId ?? null,
        resultSnapshot: input.resultSnapshot,
        responseStatus: input.responseStatus,
        completedAt: input.completedAt,
        replayExpiresAt: input.replayExpiresAt,
        updatedAt: input.completedAt,
      })
      .where(
        and(
          eq(createOrderAttempts.id, input.id),
          inArray(createOrderAttempts.status, input.allowedStatuses),
        ),
      )
      .returning();
    return updated ?? null;
  }
}
