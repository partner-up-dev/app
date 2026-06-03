import { and, asc, eq } from "drizzle-orm";
import {
  rideHailingProviderInstances,
  type NewRideHailingProviderInstance,
  type RideHailingProviderInstance,
  type RideHailingProviderInstanceId,
} from "../entities/ride-hailing-provider";
import { db } from "../lib/db";
import type {
  RideHailingProviderInstanceConfig,
  RideHailingProviderInstanceStatus,
  RideHailingProviderType,
} from "../domains/ride-hailing/model";
import type { RepositoryExecutor } from "./_executor";

export class RideHailingProviderInstanceRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(
    data: NewRideHailingProviderInstance,
  ): Promise<RideHailingProviderInstance> {
    const result = await this.executor
      .insert(rideHailingProviderInstances)
      .values(data)
      .returning();
    return result[0]!;
  }

  async listAll(): Promise<RideHailingProviderInstance[]> {
    return this.executor
      .select()
      .from(rideHailingProviderInstances)
      .orderBy(
        asc(rideHailingProviderInstances.providerType),
        asc(rideHailingProviderInstances.instanceKey),
        asc(rideHailingProviderInstances.createdAt),
      );
  }

  async findById(
    id: RideHailingProviderInstanceId,
  ): Promise<RideHailingProviderInstance | null> {
    const result = await this.executor
      .select()
      .from(rideHailingProviderInstances)
      .where(eq(rideHailingProviderInstances.id, id));
    return result[0] ?? null;
  }

  async findByProviderTypeAndInstanceKey(input: {
    providerType: RideHailingProviderType;
    instanceKey: string;
  }): Promise<RideHailingProviderInstance | null> {
    const result = await this.executor
      .select()
      .from(rideHailingProviderInstances)
      .where(
        and(
          eq(rideHailingProviderInstances.providerType, input.providerType),
          eq(rideHailingProviderInstances.instanceKey, input.instanceKey),
        ),
      )
      .orderBy(asc(rideHailingProviderInstances.createdAt));
    return result[0] ?? null;
  }

  async findFirstActiveByProviderType(input: {
    providerType: RideHailingProviderType;
  }): Promise<RideHailingProviderInstance | null> {
    const result = await this.executor
      .select()
      .from(rideHailingProviderInstances)
      .where(
        and(
          eq(rideHailingProviderInstances.providerType, input.providerType),
          eq(rideHailingProviderInstances.status, "ACTIVE"),
        ),
      )
      .orderBy(
        asc(rideHailingProviderInstances.createdAt),
        asc(rideHailingProviderInstances.id),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async updateRegistration(input: {
    id: RideHailingProviderInstanceId;
    displayName: string;
    config: RideHailingProviderInstanceConfig;
  }): Promise<RideHailingProviderInstance | null> {
    const result = await this.executor
      .update(rideHailingProviderInstances)
      .set({
        displayName: input.displayName,
        config: input.config,
        updatedAt: new Date(),
      })
      .where(eq(rideHailingProviderInstances.id, input.id))
      .returning();
    return result[0] ?? null;
  }

  async updateAdminConfiguration(input: {
    id: RideHailingProviderInstanceId;
    providerType: RideHailingProviderType;
    instanceKey: string;
    status: RideHailingProviderInstanceStatus;
    displayName: string;
    config: RideHailingProviderInstanceConfig;
  }): Promise<RideHailingProviderInstance | null> {
    const result = await this.executor
      .update(rideHailingProviderInstances)
      .set({
        providerType: input.providerType,
        instanceKey: input.instanceKey,
        status: input.status,
        displayName: input.displayName,
        config: input.config,
        updatedAt: new Date(),
      })
      .where(eq(rideHailingProviderInstances.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
