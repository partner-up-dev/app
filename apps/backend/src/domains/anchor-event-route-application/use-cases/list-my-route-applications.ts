import type { UserId } from "../../../entities/user";
import { AnchorEventRouteApplicationRepository } from "../../../repositories/AnchorEventRouteApplicationRepository";
import { toAnchorEventRouteApplicationView } from "../services/route-application";

const routeApplicationRepo = new AnchorEventRouteApplicationRepository();

export async function listMyAnchorEventRouteApplications(userId: UserId) {
  const applications = await routeApplicationRepo.findBySubmitter(userId);
  return applications.map(toAnchorEventRouteApplicationView);
}
