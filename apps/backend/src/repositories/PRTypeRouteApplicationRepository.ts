import { desc, eq } from "drizzle-orm";
import type { PRRoute } from "../entities/partner-request";
import {
  type NewPRTypeRouteApplication,
  type PRTypeRouteApplication,
  type PRTypeRouteApplicationId,
  type PRTypeRouteApplicationStatus,
  prTypeRouteApplications,
} from "../entities/pr-type-route-application";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";

export class PRTypeRouteApplicationRepository {
  async listAll(): Promise<PRTypeRouteApplication[]> {
    return await db
      .select()
      .from(prTypeRouteApplications)
      .orderBy(desc(prTypeRouteApplications.createdAt), desc(prTypeRouteApplications.id));
  }

  async findById(id: PRTypeRouteApplicationId): Promise<PRTypeRouteApplication | null> {
    const result = await db
      .select()
      .from(prTypeRouteApplications)
      .where(eq(prTypeRouteApplications.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findBySubmitter(submittedByUserId: UserId): Promise<PRTypeRouteApplication[]> {
    return await db
      .select()
      .from(prTypeRouteApplications)
      .where(eq(prTypeRouteApplications.submittedByUserId, submittedByUserId))
      .orderBy(desc(prTypeRouteApplications.createdAt), desc(prTypeRouteApplications.id));
  }

  async create(
    data: Pick<NewPRTypeRouteApplication, "type" | "route"> & {
      submittedByUserId: UserId;
    },
  ): Promise<PRTypeRouteApplication> {
    const result = await db
      .insert(prTypeRouteApplications)
      .values({
        type: data.type,
        route: data.route,
        submittedByUserId: data.submittedByUserId,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectReason: null,
      })
      .returning();
    return result[0];
  }

  async updateReviewState(
    id: PRTypeRouteApplicationId,
    data: {
      status: Extract<PRTypeRouteApplicationStatus, "ACCEPTED" | "REJECTED">;
      reviewedByUserId: UserId | null;
      rejectReason?: string | null;
      route?: PRRoute;
    },
  ): Promise<PRTypeRouteApplication | null> {
    const reviewState = {
      status: data.status,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
      rejectReason: data.status === "REJECTED" ? (data.rejectReason ?? null) : null,
      updatedAt: new Date(),
    };
    const result = await db
      .update(prTypeRouteApplications)
      .set(data.route === undefined ? reviewState : { ...reviewState, route: data.route })
      .where(eq(prTypeRouteApplications.id, id))
      .returning();
    return result[0] ?? null;
  }
}
