import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { partnerRequests } from "../../src/entities";
import type {
  PartnerRequestFields,
  PRId,
  PRStatus,
} from "../../src/entities/partner-request";
import { givenUser } from "../pr-core/_kit/builders/users";
import { givenAnchorEvent } from "./_kit/builders/anchor-events";

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};
type ProblemDetailsResponse = {
  code?: string;
};

const createStructuredPR = async (
  token: string,
  fields: PartnerRequestFields,
): Promise<CreatePRResponse> => {
  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token,
    body: {
      fields,
      createSource: "FORM",
    },
  });
  return await expectJsonResponse<CreatePRResponse>(response, 201);
};

const probePRNotes = async (prId: PRId): Promise<string | null> => {
  const rows = await getTestDb()
    .select({ notes: partnerRequests.notes })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  return rows[0]?.notes ?? null;
};

const countPRsByType = async (type: string): Promise<number> => {
  const rows = await getTestDb()
    .select({ id: partnerRequests.id })
    .from(partnerRequests)
    .where(eq(partnerRequests.type, type));
  return rows.length;
};

scenario(
  "anchor_event_default_pr_notes_materialize_only_when_create_notes_are_empty",
  async (ctx) => {
    const creator = await givenUser("default-pr-notes-creator");
    const explicitCreator = await givenUser("explicit-pr-notes-creator");
    const event = await givenAnchorEvent({
      label: "default-pr-notes",
      defaultPrNotes: "Arrive 10 minutes early and follow on-site warmup order.",
    });
    const baseFields: PartnerRequestFields = {
      title: "Scenario default notes PR",
      type: event.type,
      time: event.timeWindow,
      location: event.locationId,
      route: null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
    };

    const defaulted = await createStructuredPR(creator.token, baseFields);
    const explicit = await createStructuredPR(explicitCreator.token, {
      ...baseFields,
      title: "Scenario explicit notes PR",
      notes: "I will bring a spare racket and want doubles rotation practice.",
    });
    ctx.record("eventId", event.id);
    ctx.record("defaultedPrId", defaulted.id);
    ctx.record("explicitPrId", explicit.id);

    assert.equal(defaulted.status, "OPEN");
    assert.equal(explicit.status, "OPEN");
    assert.equal(
      await probePRNotes(defaulted.id),
      "Arrive 10 minutes early and follow on-site warmup order.",
    );
    assert.equal(
      await probePRNotes(explicit.id),
      "I will bring a spare racket and want doubles rotation practice.",
    );
  },
);

scenario(
  "anchor_event_admin_only_policy_blocks_public_structured_create",
  async (ctx) => {
    const creator = await givenUser("admin-only-public-create");
    const event = await givenAnchorEvent({
      label: "admin-only-public-create",
      prCreationPolicy: "ADMIN_ONLY",
    });
    const fields: PartnerRequestFields = {
      title: "Scenario admin-only blocked PR",
      type: event.type,
      time: event.timeWindow,
      location: event.locationId,
      route: null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
    };
    ctx.record("eventId", event.id);

    const response = await requestJson("/api/pr/new/form", {
      method: "POST",
      token: creator.token,
      body: {
        fields,
        createSource: "FORM",
      },
    });
    const body = await expectJsonResponse<ProblemDetailsResponse>(response, 403);

    assert.equal(body.code, "ANCHOR_EVENT_USER_PR_CREATION_DISABLED");
    assert.equal(await countPRsByType(event.type), 0);
  },
);
