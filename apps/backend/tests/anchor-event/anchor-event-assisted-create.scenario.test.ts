import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partnerRequests,
  type PartnerRequestFields,
  type PRId,
  type PRStatus,
} from "../../src/entities";
import { givenUser } from "../pr-core/_kit/builders/users";
import { givenAnchorEvent } from "./_kit/builders/anchor-events";

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

const buildFields = (
  input: {
    type: string;
    timeWindow: [string, string];
    location: string | null;
  },
): PartnerRequestFields => ({
  title: "Event-assisted frontend-created PR",
  type: input.type,
  time: input.timeWindow,
  location: input.location,
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
});

const probePR = async (prId: PRId) => {
  const rows = await getTestDb()
    .select({
      type: partnerRequests.type,
      time: partnerRequests.time,
      location: partnerRequests.location,
      status: partnerRequests.status,
      createdBy: partnerRequests.createdBy,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  return rows[0] ?? null;
};

scenario(
  "event_assisted_create_uses_unified_pr_create_for_off_pool_time_and_location",
  async (ctx) => {
    const creator = await givenUser("event-assisted-frontend-assistance");
    const event = await givenAnchorEvent({
      label: "frontend-assistance",
      locationIds: ["Event Pool Court"],
      timeWindows: [[
        "2038-01-01T10:00:00.000Z",
        "2038-01-01T11:00:00.000Z",
      ]],
    });
    const offPoolTimeWindow: [string, string] = [
      "2038-01-02T12:35:00.000Z",
      "2038-01-02T13:35:00.000Z",
    ];
    const offPoolLocation = "User Selected Court Outside Event Pool";

    const created = await expectJsonResponse<CreatePRResponse>(
      await requestJson("/api/pr/new/form", {
        method: "POST",
        token: creator.token,
        body: {
          fields: buildFields({
            type: event.type,
            timeWindow: offPoolTimeWindow,
            location: offPoolLocation,
          }),
          createSource: "EVENT_ASSISTED",
        },
      }),
      201,
    );

    ctx.record("eventId", event.id);
    ctx.record("prId", created.id);
    assert.equal(created.status, "OPEN");

    const stored = await probePR(created.id);
    assert.equal(stored?.type, event.type);
    assert.deepEqual(stored?.time, offPoolTimeWindow);
    assert.equal(stored?.location, offPoolLocation);
    assert.equal(stored?.status, "OPEN");
    assert.equal(stored?.createdBy, creator.user.id);
  },
);
