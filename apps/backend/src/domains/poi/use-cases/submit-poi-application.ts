import { throwHttpProblem } from "../../../lib/problem-details";
import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
import {
  normalizePoiApplicationImageUrl,
  normalizePoiApplicationTitle,
  toPoiApplicationView,
} from "../services/poi-application";

const poiRepo = new PoiRepository();

export async function submitPoiApplication(input: {
  title: string;
  imageUrl: string;
  submittedByUserId: UserId;
}) {
  const title = normalizePoiApplicationTitle(input.title);
  const imageUrl = normalizePoiApplicationImageUrl(input.imageUrl);

  const existing = await poiRepo.findByNames([title], {
    includeUnpublished: true,
  });
  if (existing.length > 0) {
    return throwHttpProblem({ status: 409, detail: "POI already exists" });
  }

  const created = await poiRepo.createApplication({
    name: title,
    imageUrl,
    submittedByUserId: input.submittedByUserId,
  });
  if (!created) {
    return throwHttpProblem({ status: 409, detail: "POI already exists" });
  }

  return toPoiApplicationView(created);
}
