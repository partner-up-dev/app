import { desc, eq } from "drizzle-orm";
import {
  anchorEventRouteApplications,
  type AnchorEventRouteApplication,
  type AnchorEventRouteApplicationId,
  type AnchorEventRouteApplicationStatus,
  type NewAnchorEventRouteApplication,
} from "../entities/anchor-event-route-application";
import type { PRRoute } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";

export class AnchorEventRouteApplicationRepository {
  async listAll(): Promise<AnchorEventRouteApplication[]> {
    return await db
      .select()
      .from(anchorEventRouteApplications)
      .orderBy(
        desc(anchorEventRouteApplications.createdAt),
        desc(anchorEventRouteApplications.id),
      );
  }

  async findById(
    id: AnchorEventRouteApplicationId,
  ): Promise<AnchorEventRouteApplication | null> {
    const result = await db
      .select()
      .from(anchorEventRouteApplications)
      .where(eq(anchorEventRouteApplications.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findBySubmitter(
    submittedByUserId: UserId,
  ): Promise<AnchorEventRouteApplication[]> {
    return await db
      .select()
      .from(anchorEventRouteApplications)
      .where(eq(anchorEventRouteApplications.submittedByUserId, submittedByUserId))
      .orderBy(
        desc(anchorEventRouteApplications.createdAt),
        desc(anchorEventRouteApplications.id),
      );
  }

  async create(
    data: Pick<NewAnchorEventRouteApplication, "anchorEventId" | "route"> & {
      submittedByUserId: UserId;
    },
  ): Promise<AnchorEventRouteApplication> {
    const result = await db
      .insert(anchorEventRouteApplications)
      .values({
        anchorEventId: data.anchorEventId,
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
    id: AnchorEventRouteApplicationId,
    data: {
      status: Extract<
        AnchorEventRouteApplicationStatus,
        "ACCEPTED" | "REJECTED"
      >;
      reviewedByUserId: UserId | null;
      rejectReason?: string | null;
      route?: PRRoute;
    },
  ): Promise<AnchorEventRouteApplication | null> {
    const reviewState = {
      status: data.status,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
      rejectReason:
        data.status === "REJECTED" ? data.rejectReason ?? null : null,
      updatedAt: new Date(),
    };
    const values =
      data.route === undefined
        ? reviewState
        : {
            ...reviewState,
            route: data.route,
          };

    const result = await db
      .update(anchorEventRouteApplications)
      .set(values)
      .where(eq(anchorEventRouteApplications.id, id))
      .returning();

    return result[0] ?? null;
  }
}
