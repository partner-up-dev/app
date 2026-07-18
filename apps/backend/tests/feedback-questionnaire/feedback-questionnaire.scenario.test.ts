import assert from "node:assert/strict";
import type { PartnerRequest } from "../../src/entities";
import type {
  FeedbackQuestionnaireDefinition,
  FeedbackQuestionnaireTemplateId,
} from "../../src/entities/feedback-questionnaire";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { givenPublishedPartnerRequest } from "../pr/_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "../pr/_kit/builders/users";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../pr-discovery/_kit/builders/pr-type-config";
import { submitFeedbackQuestionnaire } from "./_kit/actions/feedback";
import {
  buildFoodTastingFeedbackDefinition,
  buildNeedsImprovementFeedbackAnswers,
  buildRecommendFeedbackAnswers,
  givenFeedbackQuestionnaireInstance,
  givenFeedbackQuestionnaireTemplate,
} from "./_kit/builders/questionnaires";
import {
  probeFeedbackQuestionnaireInstance,
  probeFeedbackResponsesByInstance,
  probeFeedbackResponsesByInstanceAndUser,
  probePartnerRequest,
} from "./_kit/probes/questionnaires";

type AdminFeedbackQuestionnaireOverrideResponse = Pick<
  PartnerRequest,
  "id" | "feedbackQuestionnaireInstanceId"
>;

type AdminFeedbackQuestionnaireTemplateResponse = {
  id: FeedbackQuestionnaireTemplateId;
  key: string;
  version: string;
  title: string;
  definition: FeedbackQuestionnaireDefinition;
};

type ProblemDetailsResponse = {
  detail: string;
  code?: string;
};

const findTemplateInList = (
  templates: AdminFeedbackQuestionnaireTemplateResponse[],
  templateId: FeedbackQuestionnaireTemplateId,
): AdminFeedbackQuestionnaireTemplateResponse => {
  const template = templates.find((item) => item.id === templateId);
  assert.ok(template, `Expected feedback questionnaire template ${templateId}`);
  return template;
};

scenario("admin_feedback_questionnaire_template_create_is_visible_in_list", async (ctx) => {
  const admin = await givenAdminUser("feedback-template-create-admin");
  const submittedDefinition = buildFoodTastingFeedbackDefinition("admin-create-submitted");
  const body = {
    key: `${submittedDefinition.key}_admin`,
    version: "2026-create",
    title: "Scenario admin created feedback template",
    definition: submittedDefinition,
  };

  const createResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "POST",
    token: admin.token,
    body,
  });
  const created = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse>(
    createResponse,
    201,
  );

  ctx.record("templateId", created.id);
  ctx.record("templateKey", created.key);

  assert.equal(created.key, body.key);
  assert.equal(created.version, body.version);
  assert.equal(created.title, body.title);
  assert.equal(created.definition.key, body.key);
  assert.equal(created.definition.version, body.version);
  assert.equal(created.definition.title, body.title);
  assert.deepEqual(created.definition.questions, body.definition.questions);

  const listResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "GET",
    token: admin.token,
  });
  const templates = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse[]>(
    listResponse,
    200,
  );
  const listed = findTemplateInList(templates, created.id);

  assert.equal(listed.key, body.key);
  assert.equal(listed.version, body.version);
  assert.equal(listed.title, body.title);
  assert.equal(listed.definition.key, body.key);
  assert.equal(listed.definition.version, body.version);
  assert.equal(listed.definition.title, body.title);
  assert.deepEqual(listed.definition.questions, body.definition.questions);
});

scenario("admin_feedback_questionnaire_template_update_is_visible_in_list", async (ctx) => {
  const admin = await givenAdminUser("feedback-template-update-admin");
  const initialDefinition = buildFoodTastingFeedbackDefinition("admin-update-initial");
  const createResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "POST",
    token: admin.token,
    body: {
      key: `${initialDefinition.key}_admin`,
      version: "2026-update-initial",
      title: "Scenario admin initial feedback template",
      definition: initialDefinition,
    },
  });
  const created = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse>(
    createResponse,
    201,
  );

  const updatedDefinition = buildFoodTastingFeedbackDefinition("admin-update-next");
  updatedDefinition.questions = [
    {
      id: "overall_note",
      type: "textarea",
      label: "Overall note",
      required: true,
      maxLength: 800,
    },
  ];
  const updateBody = {
    key: `${updatedDefinition.key}_admin`,
    version: "2026-update-next",
    title: "Scenario admin updated feedback template",
    definition: updatedDefinition,
  };

  const updateResponse = await requestJson(
    `/api/admin/feedback-questionnaires/templates/${created.id}`,
    {
      method: "PATCH",
      token: admin.token,
      body: updateBody,
    },
  );
  const updated = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse>(
    updateResponse,
    200,
  );

  ctx.record("templateId", updated.id);
  ctx.record("updatedTemplateKey", updated.key);

  assert.equal(updated.id, created.id);
  assert.equal(updated.key, updateBody.key);
  assert.equal(updated.version, updateBody.version);
  assert.equal(updated.title, updateBody.title);
  assert.equal(updated.definition.key, updateBody.key);
  assert.equal(updated.definition.version, updateBody.version);
  assert.equal(updated.definition.title, updateBody.title);
  assert.deepEqual(updated.definition.questions, updateBody.definition.questions);

  const listResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "GET",
    token: admin.token,
  });
  const templates = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse[]>(
    listResponse,
    200,
  );
  const listed = findTemplateInList(templates, created.id);

  assert.equal(listed.key, updateBody.key);
  assert.equal(listed.version, updateBody.version);
  assert.equal(listed.title, updateBody.title);
  assert.equal(listed.definition.key, updateBody.key);
  assert.equal(listed.definition.version, updateBody.version);
  assert.equal(listed.definition.title, updateBody.title);
  assert.deepEqual(listed.definition.questions, updateBody.definition.questions);
});

scenario("admin_feedback_questionnaire_template_duplicate_key_version_conflicts", async (ctx) => {
  const admin = await givenAdminUser("feedback-template-conflict-admin");
  const firstDefinition = buildFoodTastingFeedbackDefinition("admin-conflict-first");
  const firstBody = {
    key: `${firstDefinition.key}_admin`,
    version: "2026-conflict",
    title: "Scenario admin first conflict template",
    definition: firstDefinition,
  };

  const firstCreateResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "POST",
    token: admin.token,
    body: firstBody,
  });
  const first = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse>(
    firstCreateResponse,
    201,
  );

  const duplicateCreateResponse = await requestJson(
    "/api/admin/feedback-questionnaires/templates",
    {
      method: "POST",
      token: admin.token,
      body: firstBody,
    },
  );
  const duplicateCreateBody = await expectJsonResponse<ProblemDetailsResponse>(
    duplicateCreateResponse,
    409,
  );

  const secondDefinition = buildFoodTastingFeedbackDefinition("admin-conflict-second");
  const secondCreateResponse = await requestJson("/api/admin/feedback-questionnaires/templates", {
    method: "POST",
    token: admin.token,
    body: {
      key: `${secondDefinition.key}_admin`,
      version: "2026-conflict-update-source",
      title: "Scenario admin second conflict template",
      definition: secondDefinition,
    },
  });
  const second = await expectJsonResponse<AdminFeedbackQuestionnaireTemplateResponse>(
    secondCreateResponse,
    201,
  );

  ctx.record("firstTemplateId", first.id);
  ctx.record("secondTemplateId", second.id);
  ctx.record("conflictingKey", first.key);
  ctx.record("conflictingVersion", first.version);

  assert.match(duplicateCreateBody.detail, /key\/version/i);

  const duplicateUpdateResponse = await requestJson(
    `/api/admin/feedback-questionnaires/templates/${second.id}`,
    {
      method: "PATCH",
      token: admin.token,
      body: {
        key: first.key,
        version: first.version,
        title: "Scenario admin duplicate update template",
        definition: second.definition,
      },
    },
  );
  const duplicateUpdateBody = await expectJsonResponse<ProblemDetailsResponse>(
    duplicateUpdateResponse,
    409,
  );

  assert.match(duplicateUpdateBody.detail, /key\/version/i);
});

scenario("pr_type_template_materializes_feedback_instance_on_public_pr_create", async (ctx) => {
  const creator = await givenUser("feedback-materialize-creator");
  const template = await givenFeedbackQuestionnaireTemplate({
    label: "materialize",
  });
  const prType = await givenPRTypeConfig({
    label: "feedback-materialize",
    feedbackQuestionnaireTemplateId: template.id,
  });

  const pr = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "Scenario feedback materialization PR",
  });

  ctx.record("templateId", template.id);
  ctx.record("type", prType.type);
  ctx.record("prId", pr.id);

  const createdPR = await probePartnerRequest(pr.id);
  assert.notEqual(createdPR.feedbackQuestionnaireInstanceId, null);

  const instance = await probeFeedbackQuestionnaireInstance(
    createdPR.feedbackQuestionnaireInstanceId,
  );
  assert.equal(instance.templateId, template.id);
  assert.equal(instance.title, template.title);
  assert.deepEqual(instance.definition, template.definition);
});

scenario(
  "admin_pr_feedback_questionnaire_template_mount_materializes_and_points_pr",
  async (ctx) => {
    const admin = await givenAdminUser("feedback-template-mount-admin");
    const creator = await givenUser("feedback-template-mount-creator");
    const template = await givenFeedbackQuestionnaireTemplate({
      label: "admin-template-mount",
    });
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      title: "Scenario feedback template mount legacy PR",
    });

    const beforePR = await probePartnerRequest(pr.id);
    assert.equal(beforePR.feedbackQuestionnaireInstanceId, null);

    ctx.record("prId", pr.id);
    ctx.record("templateId", template.id);

    const response = await requestJson(
      `/api/admin/prs/${pr.id}/feedback-questionnaire-instance/from-template`,
      {
        method: "POST",
        token: admin.token,
        body: {
          feedbackQuestionnaireTemplateId: template.id,
        },
      },
    );
    const body = await expectJsonResponse<AdminFeedbackQuestionnaireOverrideResponse>(
      response,
      200,
    );

    assert.equal(body.id, pr.id);
    assert.notEqual(body.feedbackQuestionnaireInstanceId, null);

    const afterPR = await probePartnerRequest(pr.id);
    assert.equal(afterPR.feedbackQuestionnaireInstanceId, body.feedbackQuestionnaireInstanceId);

    const instance = await probeFeedbackQuestionnaireInstance(body.feedbackQuestionnaireInstanceId);
    assert.equal(instance.templateId, template.id);
    assert.equal(instance.title, template.title);
    assert.deepEqual(instance.definition, template.definition);
  },
);

scenario(
  "admin_pr_feedback_questionnaire_template_mount_returns_404_for_missing_template",
  async (ctx) => {
    const admin = await givenAdminUser("feedback-template-missing-admin");
    const creator = await givenUser("feedback-template-missing-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      title: "Scenario feedback missing template PR",
    });
    const missingTemplateId = 2147483647;

    ctx.record("prId", pr.id);
    ctx.record("missingTemplateId", missingTemplateId);

    const response = await requestJson(
      `/api/admin/prs/${pr.id}/feedback-questionnaire-instance/from-template`,
      {
        method: "POST",
        token: admin.token,
        body: {
          feedbackQuestionnaireTemplateId: missingTemplateId,
        },
      },
    );
    const body = await expectJsonResponse<ProblemDetailsResponse>(response, 404);

    assert.match(body.detail, /template not found/i);

    const afterPR = await probePartnerRequest(pr.id);
    assert.equal(afterPR.feedbackQuestionnaireInstanceId, null);
  },
);

scenario(
  "admin_pr_feedback_questionnaire_template_mount_returns_404_for_missing_pr",
  async (ctx) => {
    const admin = await givenAdminUser("feedback-pr-missing-admin");
    const template = await givenFeedbackQuestionnaireTemplate({
      label: "admin-missing-pr",
    });
    const missingPRId = 2147483647;

    ctx.record("templateId", template.id);
    ctx.record("missingPRId", missingPRId);

    const response = await requestJson(
      `/api/admin/prs/${missingPRId}/feedback-questionnaire-instance/from-template`,
      {
        method: "POST",
        token: admin.token,
        body: {
          feedbackQuestionnaireTemplateId: template.id,
        },
      },
    );
    const body = await expectJsonResponse<ProblemDetailsResponse>(response, 404);

    assert.match(body.detail, /pr not found/i);
  },
);

scenario("feedback_post_persists_response_and_upserts_same_user", async (ctx) => {
  const respondent = await givenUser("feedback-respondent");
  const template = await givenFeedbackQuestionnaireTemplate({
    label: "response-upsert",
  });
  const instance = await givenFeedbackQuestionnaireInstance({ template });

  ctx.record("respondentUserId", respondent.user.id);
  ctx.record("instanceId", instance.id);

  const firstAnswers = buildRecommendFeedbackAnswers();
  const firstSubmit = await submitFeedbackQuestionnaire({
    instanceId: instance.id,
    respondent,
    answers: firstAnswers,
  });

  assert.equal(firstSubmit.instanceId, instance.id);

  const firstRows = await probeFeedbackResponsesByInstanceAndUser({
    instanceId: instance.id,
    respondentUserId: respondent.user.id,
  });
  assert.equal(firstRows.length, 1);
  assert.equal(firstRows[0]?.id, firstSubmit.responseId);
  assert.deepEqual(firstRows[0]?.answers, firstAnswers);

  const secondAnswers = buildNeedsImprovementFeedbackAnswers();
  const secondSubmit = await submitFeedbackQuestionnaire({
    instanceId: instance.id,
    respondent,
    answers: secondAnswers,
  });

  assert.equal(secondSubmit.responseId, firstSubmit.responseId);

  const secondRows = await probeFeedbackResponsesByInstanceAndUser({
    instanceId: instance.id,
    respondentUserId: respondent.user.id,
  });
  assert.equal(secondRows.length, 1);
  assert.equal(secondRows[0]?.id, firstSubmit.responseId);
  assert.deepEqual(secondRows[0]?.answers, secondAnswers);
});

scenario("feedback_post_rejects_missing_instance_and_invalid_answers", async (ctx) => {
  const respondent = await givenUser("feedback-invalid-respondent");
  const template = await givenFeedbackQuestionnaireTemplate({ label: "invalid-response" });
  const instance = await givenFeedbackQuestionnaireInstance({ template });
  const missingInstanceId = 2147483647;

  ctx.record("respondentUserId", respondent.user.id);
  ctx.record("instanceId", instance.id);
  ctx.record("missingInstanceId", missingInstanceId);

  const missingResponse = await requestJson(`/api/feedback/${missingInstanceId}`, {
    method: "POST",
    token: respondent.token,
    body: { answers: buildNeedsImprovementFeedbackAnswers() },
  });
  const missingBody = await expectJsonResponse<ProblemDetailsResponse>(missingResponse, 404);
  assert.match(missingBody.detail, /instance not found/i);

  const invalidResponse = await requestJson(`/api/feedback/${instance.id}`, {
    method: "POST",
    token: respondent.token,
    body: { answers: {} },
  });
  const invalidBody = await expectJsonResponse<ProblemDetailsResponse>(invalidResponse, 400);
  assert.match(invalidBody.detail, /required/i);

  const rows = await probeFeedbackResponsesByInstanceAndUser({
    instanceId: instance.id,
    respondentUserId: respondent.user.id,
  });
  assert.equal(rows.length, 0);
});

scenario("feedback_post_requires_authenticated_user_without_persisting", async (ctx) => {
  const template = await givenFeedbackQuestionnaireTemplate({ label: "anonymous-response" });
  const instance = await givenFeedbackQuestionnaireInstance({ template });

  ctx.record("instanceId", instance.id);

  const response = await requestJson(`/api/feedback/${instance.id}`, {
    method: "POST",
    body: { answers: buildNeedsImprovementFeedbackAnswers() },
  });
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 401);
  assert.equal(body.code, "AUTHENTICATED_REQUIRED");

  const rows = await probeFeedbackResponsesByInstance(instance.id);
  assert.equal(rows.length, 0);
});

scenario(
  "admin_pr_feedback_questionnaire_override_updates_only_pr_instance_pointer",
  async (ctx) => {
    const admin = await givenAdminUser("feedback-pointer-admin");
    const creator = await givenUser("feedback-pointer-creator");
    const defaultTemplate = await givenFeedbackQuestionnaireTemplate({
      label: "pointer-default",
    });
    const overrideTemplate = await givenFeedbackQuestionnaireTemplate({
      label: "pointer-override",
    });
    const overrideInstance = await givenFeedbackQuestionnaireInstance({
      template: overrideTemplate,
    });
    const prType = await givenPRTypeConfig({
      label: "feedback-pointer",
      feedbackQuestionnaireTemplateId: defaultTemplate.id,
    });
    const pr = await givenPRTypeVisiblePR({
      creator,
      prType,
      title: "Scenario feedback pointer PR",
    });

    const beforePR = await probePartnerRequest(pr.id);
    assert.notEqual(beforePR.feedbackQuestionnaireInstanceId, null);

    ctx.record("prId", pr.id);
    ctx.record("type", prType.type);
    ctx.record("beforeInstanceId", beforePR.feedbackQuestionnaireInstanceId ?? null);
    ctx.record("overrideInstanceId", overrideInstance.id);

    const response = await requestJson(`/api/admin/prs/${pr.id}/feedback-questionnaire-instance`, {
      method: "PATCH",
      token: admin.token,
      body: {
        feedbackQuestionnaireInstanceId: overrideInstance.id,
      },
    });
    const body = await expectJsonResponse<AdminFeedbackQuestionnaireOverrideResponse>(
      response,
      200,
    );

    assert.equal(body.id, pr.id);
    assert.equal(body.feedbackQuestionnaireInstanceId, overrideInstance.id);

    const afterPR = await probePartnerRequest(pr.id);

    const {
      feedbackQuestionnaireInstanceId: beforeFeedbackQuestionnaireInstanceId,
      ...beforePRRest
    } = beforePR;
    const {
      feedbackQuestionnaireInstanceId: afterFeedbackQuestionnaireInstanceId,
      ...afterPRRest
    } = afterPR;

    assert.notEqual(beforeFeedbackQuestionnaireInstanceId, overrideInstance.id);
    assert.equal(afterFeedbackQuestionnaireInstanceId, overrideInstance.id);
    assert.deepEqual(afterPRRest, beforePRRest);
  },
);
