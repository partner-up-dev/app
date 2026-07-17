import type { PRTypeConfigCreateInput } from "../contracts";
import { throwHttpProblem } from "../../../lib/problem-details";

/** Location suggestions are names of currently published POIs, not free-form resources. */
export const assertPublishedPRTypeConfigLocationPool = async (
  locationPool: readonly string[],
): Promise<void> => {
  const names = Array.from(new Set(locationPool.map((name) => name.trim())));
  if (names.length === 0) return;
  const { findPoisByNames } = await import("../../poi/queries");
  const pois = await findPoisByNames(names);
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

export const assertExistingPRTypeConfigFeedbackQuestionnaireTemplate = async (
  templateId: number | null,
): Promise<void> => {
  if (templateId === null) return;
  const { findFeedbackQuestionnaireTemplate } =
    await import("../../feedback-questionnaire/queries");
  const template = await findFeedbackQuestionnaireTemplate(templateId);
  if (!template) {
    return throwHttpProblem({
      status: 404,
      detail: "Feedback questionnaire template not found",
      code: "PR_TYPE_FEEDBACK_QUESTIONNAIRE_TEMPLATE_NOT_FOUND",
    });
  }
};

export const normalizePRTypeConfigCreateInput = (
  input: PRTypeConfigCreateInput,
): PRTypeConfigCreateInput => ({
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
