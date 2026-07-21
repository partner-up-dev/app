// @vitest-environment happy-dom

import { QueryClient, QueryObserver, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref, type App } from "vue";
import { queryKeys } from "@/shared/api/query-keys";
import {
  useRideHailingOrderReconciliation,
  useRideHailingProviderObservation,
} from "./ride-hailing-reconciliation";

const mocks = vi.hoisted(() => ({
  reconcile: vi.fn<(input: unknown, options?: unknown) => Promise<Response>>(),
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      commerce: {
        orders: {
          ":orderId": {
            "ride-hailing": {
              reconcile: {
                $post: mocks.reconcile,
              },
            },
          },
        },
      },
    },
  },
}));

const mountedApps: App<Element>[] = [];

beforeEach(() => {
  mocks.reconcile.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.innerHTML = "";
});

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("RideHailing controlled reconciliation", () => {
  test("writes one transient observation and refetches an active Detail projection exactly once", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });
    const orderId = "00000000-0000-4000-8000-000000000001";
    const observation = {
      phase: "ACCEPTED",
      statusLabel: "司机接单",
      providerVehicleTypeCode: "comfort",
      providerVehicleTypeName: "舒适型",
      driver: null,
      vehicle: null,
      vehicleLocation: {
        capturedAt: "2026-07-20T00:00:00.000Z",
        headingDegrees: 90,
        latitude: 30.28,
        longitude: 120.18,
        speedKph: null,
      },
      navigationRoute: null,
    };
    mocks.reconcile.mockResolvedValue(
      jsonResponse({
        outcome: "RECONCILED",
        mutated: true,
        providerObservation: observation,
        correctionRequired: null,
      }),
    );

    const detailRequests = { count: 0 };
    const detailObserver = new QueryObserver(queryClient, {
      queryKey: queryKeys.commerce.orderDetail(orderId),
      queryFn: async () => {
        detailRequests.count += 1;
        return { version: detailRequests.count };
      },
      staleTime: Infinity,
    });
    const unsubscribe = detailObserver.subscribe(() => undefined);
    await detailObserver.refetch();

    const routeOrderId = ref<string | null>(orderId);
    let reconcileMutation: ReturnType<typeof useRideHailingOrderReconciliation> | undefined;
    let observationQuery: ReturnType<typeof useRideHailingProviderObservation> | undefined;
    const app = createApp(
      defineComponent({
        setup() {
          reconcileMutation = useRideHailingOrderReconciliation();
          observationQuery = useRideHailingProviderObservation(routeOrderId);
          return () => null;
        },
      }),
    );
    app.use(VueQueryPlugin, { queryClient });
    app.mount(document.createElement("div"));
    mountedApps.push(app);

    try {
      await expect(
        reconcileMutation?.mutateAsync({ orderId, trigger: "polling-interval" }),
      ).resolves.toMatchObject({
        outcome: "RECONCILED",
        providerObservation: observation,
      });
      await nextTick();

      expect(mocks.reconcile).toHaveBeenCalledTimes(1);
      expect(detailRequests.count).toBe(2);
      expect(queryClient.getQueryData(queryKeys.commerce.rideHailingObservation(orderId))).toEqual(
        observation,
      );
      expect(observationQuery?.data.value).toEqual(observation);
    } finally {
      unsubscribe();
      queryClient.clear();
    }
  });
});
