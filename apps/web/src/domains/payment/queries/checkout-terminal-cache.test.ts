import { QueryClient, QueryObserver, type QueryKey } from "@tanstack/vue-query";
import { afterEach, describe, expect, test } from "vitest";
import { queryKeys } from "@/shared/api/query-keys";
import { invalidateCheckoutTerminalQueries } from "./checkout-terminal-cache";

const identity = {
  billLineId: "bill-line-1",
  billId: "bill-1",
  orderId: "order-1",
};

type ProjectionName = "target" | "bill" | "order";

const buildHarness = async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
  const requestCount: Record<ProjectionName, number> = {
    target: 0,
    bill: 0,
    order: 0,
  };
  const options = [
    buildQueryOptions("target", queryKeys.commerce.billLineCheckoutTarget(identity.billLineId)),
    buildQueryOptions("bill", queryKeys.commerce.billDetail(identity.billId)),
    buildQueryOptions("order", queryKeys.commerce.orderDetail(identity.orderId)),
  ] as const;

  function buildQueryOptions(name: ProjectionName, queryKey: QueryKey) {
    return {
      queryKey,
      queryFn: async () => {
        requestCount[name] += 1;
        return { name, version: requestCount[name] };
      },
      staleTime: Infinity,
    };
  }

  await Promise.all(options.map((option) => queryClient.fetchQuery(option)));

  return { queryClient, requestCount, options };
};

const clients: QueryClient[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) {
    client.clear();
  }
});

describe("Checkout terminal cache reconciliation", () => {
  test("refetches every active projection exactly once through invalidation", async () => {
    const harness = await buildHarness();
    clients.push(harness.queryClient);
    const observers = harness.options.map(
      (option) => new QueryObserver(harness.queryClient, option),
    );
    const unsubscribers = observers.map((observer) => observer.subscribe(() => undefined));

    try {
      await invalidateCheckoutTerminalQueries(harness.queryClient, identity);

      expect(harness.requestCount).toEqual({
        target: 2,
        bill: 2,
        order: 2,
      });
    } finally {
      for (const unsubscribe of unsubscribers) unsubscribe();
    }
  });

  test("marks inactive projections stale without eagerly requesting them", async () => {
    const harness = await buildHarness();
    clients.push(harness.queryClient);

    await invalidateCheckoutTerminalQueries(harness.queryClient, identity);

    expect(harness.requestCount).toEqual({
      target: 1,
      bill: 1,
      order: 1,
    });
    expect(
      harness.queryClient.getQueryState(
        queryKeys.commerce.billLineCheckoutTarget(identity.billLineId),
      )?.isInvalidated,
    ).toBe(true);
    expect(
      harness.queryClient.getQueryState(queryKeys.commerce.billDetail(identity.billId))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      harness.queryClient.getQueryState(queryKeys.commerce.orderDetail(identity.orderId))
        ?.isInvalidated,
    ).toBe(true);
  });
});
