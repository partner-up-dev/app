import type { QueryClient } from "@tanstack/vue-query";
import { queryKeys } from "@/shared/api/query-keys";

export type CheckoutTerminalQueryIdentity = {
  billLineId: string;
  billId: string;
  orderId: string;
};

export const invalidateCheckoutTerminalQueries = async (
  queryClient: QueryClient,
  identity: CheckoutTerminalQueryIdentity,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.commerce.billLineCheckoutTarget(identity.billLineId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.commerce.billDetail(identity.billId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.commerce.orderDetail(identity.orderId),
      refetchType: "active",
    }),
  ]);
};
