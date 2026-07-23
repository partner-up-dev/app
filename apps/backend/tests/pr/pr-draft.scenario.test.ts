import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { buildScenarioFields, givenDraftPR } from "./_kit/builders/partner-requests";
import { givenAnonymousUser, givenUser } from "./_kit/builders/users";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partnerRequests,
  partners,
  prJoinNoticeAcceptances,
  prMessages,
  type PRId,
  type PRStatus,
} from "../../src/entities";

type ScenarioFields = ReturnType<typeof buildScenarioFields>;

type AuthSessionResponse = {
  role: "anonymous" | "authenticated" | "service" | "analytics";
  roles: Array<"anonymous" | "authenticated" | "service" | "analytics">;
  userId: string | null;
  accessToken: string;
};

type ProblemDetailsResponse = {
  code?: string;
  detail?: string;
};

type PublishDraftPRResponse = {
  id: PRId;
  pr: {
    status: PRStatus;
    createdBy: string | null;
  };
};

type DraftContentUpdateResponse = {
  id: PRId;
  status: PRStatus;
  title?: string;
  createdBy: string | null;
};

const toUserEditableFields = ({ type: _type, ...fields }: ScenarioFields) => fields;

const assertOpaqueDraft404 = async (response: Response): Promise<void> => {
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") ?? "", /^application\/problem\+json/);
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 404);
  assert.equal(body.code, "PR_NOT_ACCESSIBLE");
  assert.doesNotMatch(body.detail ?? "", /DRAFT|creator|createdBy/i);
};

const assertDraftRoot = async (
  prId: PRId,
  expected: { createdBy: string | null; status: PRStatus; title: string | null },
): Promise<void> => {
  const db = getTestDb();
  const [stored] = await db
    .select({
      createdBy: partnerRequests.createdBy,
      status: partnerRequests.status,
      title: partnerRequests.title,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  assert.equal(stored?.createdBy, expected.createdBy);
  assert.equal(stored?.status, expected.status);
  assert.equal(stored?.title, expected.title);
};

const assertNoDraftChildren = async (prId: PRId): Promise<void> => {
  const db = getTestDb();
  const [activeSlots, acceptances, messages] = await Promise.all([
    db.select().from(partners).where(eq(partners.prId, prId)),
    db.select().from(prJoinNoticeAcceptances).where(eq(prJoinNoticeAcceptances.prId, prId)),
    db.select().from(prMessages).where(eq(prMessages.prId, prId)),
  ]);
  assert.equal(activeSlots.length, 0);
  assert.equal(acceptances.length, 0);
  assert.equal(messages.length, 0);
};

scenario("anonymous_uuid_restores_session", async (ctx) => {
  const anonymous = await givenAnonymousUser("session-restore");
  ctx.record("anonymousUserId", anonymous.user.id);

  const session = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      body: { userId: anonymous.user.id },
    }),
    200,
  );

  assert.equal(session.role, "anonymous");
  assert.deepEqual(session.roles, ["anonymous"]);
  assert.equal(session.userId, anonymous.user.id);
  assert.ok(session.accessToken.length > 0);
});

scenario("anonymous_publish_draft_requires_authenticated_user", async (ctx) => {
  const anonymous = await givenAnonymousUser("draft-publisher");
  const pr = await givenDraftPR({ creator: null, title: "Scenario draft publish auth required" });
  ctx.record("anonymousUserId", anonymous.user.id);
  ctx.record("prId", pr.id);

  const response = await requestJson(`/api/pr/${pr.id}/publish`, {
    method: "POST",
    token: anonymous.token,
  });
  assert.match(response.headers.get("content-type") ?? "", /^application\/problem\+json/);
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 401);
  assert.equal(body.code, "AUTHENTICATED_REQUIRED");
  await assertDraftRoot(pr.id, {
    createdBy: null,
    status: "DRAFT",
    title: "Scenario draft publish auth required",
  });
  await assertNoDraftChildren(pr.id);
});

scenario("creatorless_draft_is_opaque_to_authenticated_read_and_mutation", async (ctx) => {
  const editor = await givenUser("draft-content-editor");
  const publisher = await givenUser("draft-publisher");
  const pr = await givenDraftPR({ creator: null, title: "Scenario draft content initial" });
  const initialTitle = "Scenario draft content initial";
  const updatedFields = buildScenarioFields("Scenario draft content attempted update");
  ctx.record("editorUserId", editor.user.id);
  ctx.record("publisherUserId", publisher.user.id);
  ctx.record("prId", pr.id);

  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}`, { method: "GET", token: editor.token }),
  );
  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: editor.token,
      body: { fields: toUserEditableFields(updatedFields) },
    }),
  );
  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/publish`, { method: "POST", token: publisher.token }),
  );

  await assertDraftRoot(pr.id, { createdBy: null, status: "DRAFT", title: initialTitle });
  await assertNoDraftChildren(pr.id);
});

scenario("owner_bound_draft_allows_owner_only_edit_and_publish", async (ctx) => {
  const owner = await givenUser("owner-bound-draft");
  const other = await givenUser("owner-bound-other");
  const pr = await givenDraftPR({ creator: owner, title: "Scenario owner draft initial" });
  const updatedFields = buildScenarioFields("Scenario owner draft updated");
  ctx.record("ownerUserId", owner.user.id);
  ctx.record("otherUserId", other.user.id);
  ctx.record("prId", pr.id);

  const detail = await requestJson(`/api/pr/${pr.id}`, { method: "GET", token: owner.token });
  await expectJsonResponse(detail, 200);

  const updated = await expectJsonResponse<DraftContentUpdateResponse>(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: owner.token,
      body: { fields: toUserEditableFields(updatedFields) },
    }),
    200,
  );
  assert.equal(updated.status, "DRAFT");
  assert.equal(updated.title, updatedFields.title);
  assert.equal(updated.createdBy, owner.user.id);

  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}`, { method: "GET", token: other.token }),
  );
  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: other.token,
      body: {
        fields: toUserEditableFields(buildScenarioFields("Scenario other attempted update")),
      },
    }),
  );
  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/publish`, { method: "POST", token: other.token }),
  );
  await assertDraftRoot(pr.id, {
    createdBy: owner.user.id,
    status: "DRAFT",
    title: updatedFields.title,
  });

  const statusResponse = await requestJson(`/api/pr/${pr.id}/status`, {
    method: "PATCH",
    token: owner.token,
    body: { status: "OPEN" },
  });
  const statusBody = await expectJsonResponse<ProblemDetailsResponse>(statusResponse, 400);
  assert.match(statusBody.detail ?? "", /Use publish endpoint/);

  const published = await expectJsonResponse<PublishDraftPRResponse>(
    await requestJson(`/api/pr/${pr.id}/publish`, { method: "POST", token: owner.token }),
    200,
  );
  assert.equal(published.id, pr.id);
  assert.equal(published.pr.status, "OPEN");
  assert.equal(published.pr.createdBy, owner.user.id);

  const [stored] = await getTestDb()
    .select({ createdBy: partnerRequests.createdBy, status: partnerRequests.status })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));
  assert.equal(stored?.createdBy, owner.user.id);
  assert.equal(stored?.status, "OPEN");
  const activeSlots = await getTestDb().select().from(partners).where(eq(partners.prId, pr.id));
  assert.equal(activeSlots.length, 1);
  assert.equal(activeSlots[0]?.userId, owner.user.id);
});

scenario("owner_bound_publish_preserves_existing_start_time_error", async (ctx) => {
  const owner = await givenUser("past-draft-owner");
  const pr = await givenDraftPR({ creator: owner, title: "Scenario past draft publish" });
  const pastTimeWindow: [string, string] = [
    new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ];
  await getTestDb()
    .update(partnerRequests)
    .set({ time: pastTimeWindow })
    .where(eq(partnerRequests.id, pr.id));
  ctx.record("prId", pr.id);

  const response = await requestJson(`/api/pr/${pr.id}/publish`, {
    method: "POST",
    token: owner.token,
  });
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 400);
  assert.equal(body.code, "PR_START_TIME_PASSED");
  await assertDraftRoot(pr.id, {
    createdBy: owner.user.id,
    status: "DRAFT",
    title: "Scenario past draft publish",
  });
  await assertNoDraftChildren(pr.id);
});

scenario("creatorless_draft_participant_and_child_reads_are_opaque", async (ctx) => {
  const anonymous = await givenAnonymousUser("draft-surface-anonymous");
  const other = await givenUser("draft-surface-other");
  const pr = await givenDraftPR({ creator: null, title: "Scenario draft surface matrix" });
  await getTestDb()
    .update(partnerRequests)
    .set({
      joinGateConfig: [
        {
          kind: "JOIN_NOTICE",
          key: "draft-surface-gate",
          version: "1",
          title: "Draft surface gate",
          source: "PR",
          body: "Must stay private",
        },
      ],
    })
    .where(eq(partnerRequests.id, pr.id));
  ctx.record("prId", pr.id);

  for (const token of [anonymous.token, other.token]) {
    await assertOpaqueDraft404(await requestJson(`/api/pr/${pr.id}`, { method: "GET", token }));
    await assertOpaqueDraft404(
      await requestJson(`/api/pr/${pr.id}/join-gates`, { method: "GET", token }),
    );
    await assertOpaqueDraft404(
      await requestJson(`/api/pr/${pr.id}/partners/999999/profile`, { method: "GET", token }),
    );
    await assertOpaqueDraft404(
      await requestJson(`/api/pr/${pr.id}/orders?offerId=1&statusIn=OPEN`, {
        method: "GET",
        token,
      }),
    );
    await assertOpaqueDraft404(
      await requestJson(`/api/pr/${pr.id}/messages`, { method: "GET", token }),
    );
  }

  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/join-gates/draft-surface-gate/resolve`, {
      method: "POST",
      token: other.token,
      body: { kind: "JOIN_NOTICE", version: "1", accepted: true },
    }),
  );
  await assertOpaqueDraft404(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: other.token,
      body: { body: "must not persist" },
    }),
  );
  await assertDraftRoot(pr.id, {
    createdBy: null,
    status: "DRAFT",
    title: "Scenario draft surface matrix",
  });
  await assertNoDraftChildren(pr.id);
});

scenario("owner_content_validation_remains_after_draft_policy", async (ctx) => {
  const owner = await givenUser("type-field-owner");
  const pr = await givenDraftPR({ creator: owner, title: "Scenario type field initial" });
  ctx.record("prId", pr.id);

  const response = await requestJson(`/api/pr/${pr.id}/content`, {
    method: "PATCH",
    token: owner.token,
    body: {
      fields: {
        ...buildScenarioFields("Scenario type field updated"),
        type: "changed-type",
      },
    },
  });
  await expectJsonResponse<ProblemDetailsResponse>(response, 400);

  const [stored] = await getTestDb()
    .select({ type: partnerRequests.type, createdBy: partnerRequests.createdBy })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));
  assert.equal(stored?.type, "badminton");
  assert.equal(stored?.createdBy, owner.user.id);
});
