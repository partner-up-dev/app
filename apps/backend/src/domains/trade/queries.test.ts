import { afterEach, describe, expect, test, vi } from "vitest";
import type { OfferId } from "../../entities/offer";
import type { TradeOrder, TradeOrderId } from "../../entities/trade-order";
import { TradeOrderRepository } from "../../repositories/TradeOrderRepository";
import { listAttachedTradeOrderSummaries } from "./queries";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";
});

const order = (input: { id: string; offerId: number; status: TradeOrder["status"] }): TradeOrder =>
  ({
    id: input.id as TradeOrderId,
    offerId: input.offerId as OfferId,
    status: input.status,
  }) as TradeOrder;

describe("listAttachedTradeOrderSummaries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("delegates exact filtering and preserves repository order while projecting fields", async () => {
    const newest = order({
      id: "11111111-1111-4111-8111-111111111111",
      offerId: 7,
      status: "OPEN",
    });
    const older = order({
      id: "22222222-2222-4222-8222-222222222222",
      offerId: 7,
      status: "COMPLETED",
    });
    const list = vi
      .spyOn(TradeOrderRepository.prototype, "listByIdsOfferAndStatuses")
      .mockResolvedValue([newest, older]);

    await expect(
      listAttachedTradeOrderSummaries({
        orderIds: [older.id, newest.id],
        offerId: 7,
        statuses: ["OPEN", "COMPLETED"],
      }),
    ).resolves.toEqual([
      { id: newest.id, offerId: 7, status: "OPEN" },
      { id: older.id, offerId: 7, status: "COMPLETED" },
    ]);
    expect(list).toHaveBeenCalledWith({
      ids: [older.id, newest.id],
      offerId: 7,
      statuses: ["OPEN", "COMPLETED"],
    });
  });
});
