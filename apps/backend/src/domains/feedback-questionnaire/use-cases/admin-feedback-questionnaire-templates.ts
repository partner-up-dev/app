import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  FeedbackQuestionnaireTemplate,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities/feedback-questionnaire";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import type { FeedbackQuestionnaireDefinition } from "../contracts";

export type AdminFeedbackQuestionnaireTemplateInput = {
  key: string;
  version: string;
  title: string;
  definition: FeedbackQuestionnaireDefinition;
};

export type AdminFeedbackQuestionnaireTemplateView = {
  id: FeedbackQuestionnaireTemplateId;
  key: string;
  version: string;
  title: string;
  definition: FeedbackQuestionnaireDefinition;
  createdAt: Date;
  updatedAt: Date;
};

const repository = new FeedbackQuestionnaireRepository();

const toView = (
  template: FeedbackQuestionnaireTemplate,
): AdminFeedbackQuestionnaireTemplateView => ({
  id: template.id,
  key: template.key,
  version: template.version,
  title: template.title,
  definition: template.definition,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

const normalizeInput = (
  input: AdminFeedbackQuestionnaireTemplateInput,
): AdminFeedbackQuestionnaireTemplateInput => {
  const key = input.key.trim();
  const version = input.version.trim();
  const title = input.title.trim();
  return {
    key,
    version,
    title,
    definition: {
      ...input.definition,
      key,
      version,
      title,
    },
  };
};

const assertKeyVersionAvailable = async (input: {
  key: string;
  version: string;
  currentTemplateId?: FeedbackQuestionnaireTemplateId;
}) => {
  const existing = await repository.findTemplateByKeyVersion({
    key: input.key,
    version: input.version,
  });
  if (!existing || existing.id === input.currentTemplateId) return;
  return throwHttpProblem({
    status: 409,
    detail: "Feedback questionnaire template key/version already exists",
  });
};

export const listAdminFeedbackQuestionnaireTemplates = async (): Promise<
  AdminFeedbackQuestionnaireTemplateView[]
> => {
  const templates = await repository.listTemplates();
  return templates.map(toView);
};

export const createAdminFeedbackQuestionnaireTemplate = async (
  input: AdminFeedbackQuestionnaireTemplateInput,
): Promise<AdminFeedbackQuestionnaireTemplateView> => {
  const normalized = normalizeInput(input);
  await assertKeyVersionAvailable(normalized);
  const template = await repository.createTemplate(normalized);
  return toView(template);
};

export const updateAdminFeedbackQuestionnaireTemplate = async (
  templateId: FeedbackQuestionnaireTemplateId,
  input: AdminFeedbackQuestionnaireTemplateInput,
): Promise<AdminFeedbackQuestionnaireTemplateView> => {
  const existing = await repository.findTemplateById(templateId);
  if (!existing) {
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire template not found" });
  }

  const normalized = normalizeInput(input);
  await assertKeyVersionAvailable({
    ...normalized,
    currentTemplateId: templateId,
  });
  const template = await repository.updateTemplate(templateId, normalized);
  if (!template) {
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire template not found" });
  }
  return toView(template);
};
