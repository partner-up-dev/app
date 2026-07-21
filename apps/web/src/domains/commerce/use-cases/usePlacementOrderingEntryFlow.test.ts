import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderingEntryPayload } from "@/domains/commerce/model/ordering-entry-storage";
import type {
  OrderingEntryResponse,
  PlacementInstanceProjection,
} from "@/domains/commerce/queries/useCommerce";
import { usePlacementOrderingEntryFlow } from "./usePlacementOrderingEntryFlow";

const testState = vi.hoisted(() => ({
  push: vi.fn<(location: { path: string }) => void>(),
  resolveAdmission:
    vi.fn<
      (input: {
        placementInstanceId: number;
        matchingContext: unknown;
      }) => Promise<OrderingEntryResponse>
    >(),
  setOrderingEntry: vi.fn<(entry: OrderingEntryPayload) => void>(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: testState.push }),
}));

vi.mock("@/domains/commerce/queries/useCommerce", () => ({
  resolvePlacementOrderingEntry: testState.resolveAdmission,
}));

vi.mock("@/domains/commerce/use-cases/useOrderingHandoffStore", () => ({
  useOrderingHandoffStore: () => ({ setOrderingEntry: testState.setOrderingEntry }),
}));

const placement: PlacementInstanceProjection = {
  id: 11,
  type: "BUTTON",
  offerId: 29,
  creative: { ctaLabel: "下单" },
  bindingRules: [],
};
const matchingContext = { kind: "PR", prId: 17 };
const orderingEntry: OrderingEntryPayload = {
  source: { offerId: placement.offerId },
  offerDetail: {
    offerId: placement.offerId,
    productType: "RIDE_HAILING",
    spuIds: [],
    skuIds: [],
    pricingPolicy: { rules: [] },
    termsVersion: 1,
    startsAt: null,
    endsAt: null,
    spus: [],
  },
  prId: matchingContext.prId,
  bindings: {},
  bindingLocks: {},
};

describe("Placement ordering entry flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens an existing order directly", async () => {
    testState.resolveAdmission.mockResolvedValue({
      outcome: "EXISTING_ORDER",
      orderId: "existing-order-id",
    });
    const flow = usePlacementOrderingEntryFlow();

    await expect(flow.openPlacementOrdering({ placement, matchingContext })).resolves.toBe(
      "EXISTING_ORDER",
    );

    expect(testState.push).toHaveBeenCalledWith({ path: "/orders/existing-order-id" });
    expect(testState.setOrderingEntry).not.toHaveBeenCalled();
  });

  it("stores the backend-authored creator entry before opening new order", async () => {
    testState.resolveAdmission.mockResolvedValue({
      outcome: "CREATOR_ELIGIBLE",
      orderingEntry,
    });
    const flow = usePlacementOrderingEntryFlow();

    await expect(flow.openPlacementOrdering({ placement, matchingContext })).resolves.toBe(
      "CREATOR_ELIGIBLE",
    );

    expect(testState.setOrderingEntry).toHaveBeenCalledWith({
      ...orderingEntry,
      placementContext: {
        placementInstanceId: placement.id,
        matchingContext,
      },
    });
    expect(testState.push).toHaveBeenCalledWith({ path: "/order/new" });
  });

  it.each(["NON_CREATOR", "INACTIVE"] as const)("does not navigate for %s", async (outcome) => {
    testState.resolveAdmission.mockResolvedValue({ outcome });
    const flow = usePlacementOrderingEntryFlow();

    await expect(flow.openPlacementOrdering({ placement, matchingContext })).resolves.toBe(outcome);

    expect(flow.admissionOutcome.value).toBe(outcome);
    expect(testState.push).not.toHaveBeenCalled();
    expect(testState.setOrderingEntry).not.toHaveBeenCalled();
  });

  it("discards an invalidated creator response without handoff or navigation", async () => {
    let resolveAdmission!: (response: OrderingEntryResponse) => void;
    const pendingAdmission = new Promise<OrderingEntryResponse>((resolve) => {
      resolveAdmission = resolve;
    });
    testState.resolveAdmission.mockReturnValueOnce(pendingAdmission);
    const flow = usePlacementOrderingEntryFlow();

    const opening = flow.openPlacementOrdering({ placement, matchingContext });
    expect(flow.pendingPlacementId.value).toBe(placement.id);

    flow.resetAdmissionOutcome();
    expect(flow.pendingPlacementId.value).toBeNull();

    resolveAdmission({
      outcome: "CREATOR_ELIGIBLE",
      orderingEntry,
    });

    await expect(opening).resolves.toBeNull();
    expect(flow.admissionOutcome.value).toBeNull();
    expect(testState.setOrderingEntry).not.toHaveBeenCalled();
    expect(testState.push).not.toHaveBeenCalled();
  });
});
