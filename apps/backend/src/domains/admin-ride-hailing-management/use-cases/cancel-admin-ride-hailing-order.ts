import { cancelRideHailingOrderFromAdmin } from "../../trade/use-cases/cancel-ride-hailing-order-from-order-detail";

export async function cancelAdminRideHailingOrder(input: {
  orderId: string;
  actorUserId: string;
}) {
  return cancelRideHailingOrderFromAdmin(input);
}
