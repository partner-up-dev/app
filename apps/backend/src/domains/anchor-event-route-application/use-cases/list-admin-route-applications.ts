import { AnchorEventRouteApplicationRepository } from "../../../repositories/AnchorEventRouteApplicationRepository";
import { toAnchorEventRouteApplicationView } from "../services/route-application";

const routeApplicationRepo = new AnchorEventRouteApplicationRepository();

export async function listAdminAnchorEventRouteApplications() {
  const applications = await routeApplicationRepo.listAll();
  return applications.map(toAnchorEventRouteApplicationView);
}
