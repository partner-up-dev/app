import { afterEach, describe, expect, test, vi } from "vitest";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { TradeOrderId } from "../../../entities/trade-order";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { listPRMessages } from "../message/list-pr-messages";
import { assertPRConfirmationOrCheckInVisible } from "./assert-pr-confirmation-or-check-in-visible";
import { getPRAttachedOrderContext } from "./get-pr-attached-order-context";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";
});

const request = (
  input: {
    status?: PartnerRequest["status"];
    createdBy?: string | null;
    orders?: TradeOrderId[];
  } = {},
): PartnerRequest =>
  ({
    id: 41 as PRId,
    status: input.status ?? "OPEN",
    createdBy: input.createdBy ?? null,
    orders: input.orders ?? [],
  }) as PartnerRequest;

const anonymousActor = {
  userId: null,
  roles: ["anonymous"] as const,
};

describe("PR controller access seams", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns only actor-checked attached order ids", async () => {
    const orderIds = [
      "11111111-1111-4111-8111-111111111111" as TradeOrderId,
      "22222222-2222-4222-8222-222222222222" as TradeOrderId,
    ];
    vi.spyOn(PartnerRequestRepository.prototype, "findById").mockResolvedValue(
      request({ orders: orderIds }),
    );

    await expect(
      getPRAttachedOrderContext({ prId: 41 as PRId, actor: anonymousActor }),
    ).resolves.toEqual({
      prId: 41,
      orderIds,
    });
  });

  test("keeps draft opacity before attachment or WeChat participant work", async () => {
    vi.spyOn(PartnerRequestRepository.prototype, "findById").mockResolvedValue(
      request({ status: "DRAFT" }),
    );

    await expect(
      getPRAttachedOrderContext({ prId: 41 as PRId, actor: anonymousActor }),
    ).rejects.toMatchObject({ status: 404, code: "PR_NOT_ACCESSIBLE" });
    await expect(
      assertPRConfirmationOrCheckInVisible({
        prId: 41 as PRId,
        actor: anonymousActor,
      }),
    ).rejects.toMatchObject({ status: 404, code: "PR_NOT_ACCESSIBLE" });
  });

  test("checks missing/draft PR before the nullable message viewer 401", async () => {
    const find = vi.spyOn(PartnerRequestRepository.prototype, "findById");

    find.mockResolvedValueOnce(null);
    await expect(listPRMessages(41 as PRId, null, anonymousActor)).rejects.toMatchObject({
      status: 404,
      message: "Partner request not found",
    });

    find.mockResolvedValueOnce(request({ status: "DRAFT" }));
    await expect(listPRMessages(41 as PRId, null, anonymousActor)).rejects.toMatchObject({
      status: 404,
      code: "PR_NOT_ACCESSIBLE",
    });

    find.mockResolvedValueOnce(request());
    await expect(listPRMessages(41 as PRId, null, anonymousActor)).rejects.toMatchObject({
      status: 401,
      message: "Authentication required",
    });
  });
});
