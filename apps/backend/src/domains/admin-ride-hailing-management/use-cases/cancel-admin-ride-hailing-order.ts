import { cancelRideHailingOrderFromAdmin } from "../../trade/commands";

export async function cancelAdminRideHailingOrder(input: { orderId: string; actorUserId: string }) {
  return cancelRideHailingOrderFromAdmin(input);
}
