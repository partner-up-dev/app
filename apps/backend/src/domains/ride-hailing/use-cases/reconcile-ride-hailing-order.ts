import type { CommerceOrderDetailDebugContext } from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import { assertTradeOrderViewerAccess } from "../../trade/queries";
import { RideHailingProviderSyncQueryError } from "../contracts";
import {
  syncRideHailingOrderWithProvider,
  type RideHailingProviderSyncResult,
} from "./sync-ride-hailing-order-with-provider";

export type RideHailingReconcileResult = Omit<RideHailingProviderSyncResult, "providerDetail">;

export async function reconcileRideHailingOrder(input: {
  orderId: string;
  viewerUserId: string;
  debug?: CommerceOrderDetailDebugContext;
}): Promise<RideHailingReconcileResult> {
  await assertTradeOrderViewerAccess({
    orderId: input.orderId,
    viewerUserId: input.viewerUserId,
  });

  try {
    const result = await syncRideHailingOrderWithProvider({
      orderId: input.orderId as Parameters<typeof syncRideHailingOrderWithProvider>[0]["orderId"],
      trigger: "BROWSER_RECONCILE",
      debug: input.debug,
    });
    const { providerDetail: _providerDetail, ...publicResult } = result;
    return publicResult;
  } catch (error) {
    if (error instanceof RideHailingProviderSyncQueryError) {
      return throwHttpProblem({
        status: 503,
        code: "RIDE_HAILING_PROVIDER_DETAIL_QUERY_FAILED",
        detail: "RideHailing provider detail query failed",
      });
    }
    throw error;
  }
}
