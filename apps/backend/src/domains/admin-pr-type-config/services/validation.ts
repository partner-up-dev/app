import { throwHttpProblem } from "../../../lib/problem-details";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { AdminPRTypeConfigCreateInput } from "../contracts";

const poiRepository = new PoiRepository();
const feedbackQuestionnaireRepository = new FeedbackQuestionnaireRepository();

/** Location suggestions are names of currently published POIs, not free-form resources. */
export const assertPublishedLocationPool = async (
  locationPool: readonly string[],
): Promise<void> => {
  const names = Array.from(new Set(locationPool.map((name) => name.trim())));
  if (names.length === 0) return;
  const pois = await poiRepository.findByNames(names);
  const publishedNames = new Set(pois.map((poi) => poi.name));
  const missing = names.find((name) => !publishedNames.has(name));
  if (missing) {
    return throwHttpProblem({
      status: 422,
      detail: `Location pool entry is not a published POI: ${missing}`,
      code: "PR_TYPE_LOCATION_NOT_PUBLISHED",
    });
  }
};

export const assertExistingFeedbackQuestionnaireTemplate = async (
  templateId: number | null,
): Promise<void> => {
  if (templateId === null) return;
  const template = await feedbackQuestionnaireRepository.findTemplateById(templateId);
  if (!template) {
    return throwHttpProblem({
      status: 404,
      detail: "Feedback questionnaire template not found",
      code: "PR_TYPE_FEEDBACK_QUESTIONNAIRE_TEMPLATE_NOT_FOUND",
    });
  }
};

export const normalizeAdminPRTypeConfigInput = (
  input: AdminPRTypeConfigCreateInput,
): AdminPRTypeConfigCreateInput => ({
  ...input,
  type: input.type.trim(),
  authoring: {
    ...input.authoring,
    locationPool: Array.from(
      new Set(input.authoring.locationPool.map((location) => location.trim())),
    ),
  },
  discovery: {
    ...input.discovery,
    title: input.discovery.title.trim(),
    description: input.discovery.description?.trim() || null,
    coverImage: input.discovery.coverImage?.trim() || null,
  },
});
