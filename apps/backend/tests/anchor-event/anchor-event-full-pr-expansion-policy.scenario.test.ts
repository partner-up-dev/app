import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { joinPartnerRequest } from "../pr-core/_kit/actions/join";
import { givenUser } from "../pr-core/_kit/builders/users";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "./_kit/builders/anchor-events";

const prRepo = new PartnerRequestRepository();

const listEventTimeWindowPRs = async (input: {
  type: string;
  timeWindow: [string, string];
}) => await prRepo.findByTypeAndTime(input.type, input.timeWindow);

scenario(
  "anchor_event_full_pr_expansion_policy_disabled_keeps_full_pr_without_sibling",
  async (ctx) => {
    const creator = await givenUser("full-expansion-disabled-creator");
    const joiner = await givenUser("full-expansion-disabled-joiner");
    const event = await givenAnchorEvent({
      label: "full-expansion-disabled",
      locationIds: [
        "System Full Expansion Disabled Court A",
        "System Full Expansion Disabled Court B",
      ],
      fullPrExpansionPolicy: "DISABLED",
    });
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "System full expansion disabled source PR",
      minPartners: 1,
      maxPartners: 2,
      expectedStatus: "OPEN",
    });

    ctx.record("eventId", event.id);
    ctx.record("sourcePrId", pr.id);

    const joined = await joinPartnerRequest({ pr, user: joiner });
    assert.equal(joined.status, "OPEN");

    const prs = await listEventTimeWindowPRs({
      type: event.type,
      timeWindow: event.timeWindow,
    });
    assert.equal(prs.length, 1);
    assert.equal(prs[0]?.id, pr.id);
  },
);

scenario(
  "anchor_event_full_pr_expansion_policy_enabled_creates_sibling_after_full",
  async (ctx) => {
    const creator = await givenUser("full-expansion-enabled-creator");
    const joiner = await givenUser("full-expansion-enabled-joiner");
    const event = await givenAnchorEvent({
      label: "full-expansion-enabled",
      locationIds: [
        "System Full Expansion Enabled Court A",
        "System Full Expansion Enabled Court B",
      ],
      fullPrExpansionPolicy: "ENABLED",
    });
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "System full expansion enabled source PR",
      minPartners: 1,
      maxPartners: 2,
      expectedStatus: "OPEN",
    });

    ctx.record("eventId", event.id);
    ctx.record("sourcePrId", pr.id);

    const joined = await joinPartnerRequest({ pr, user: joiner });
    assert.equal(joined.status, "OPEN");

    const prs = await listEventTimeWindowPRs({
      type: event.type,
      timeWindow: event.timeWindow,
    });
    const source = prs.find((candidate) => candidate.id === pr.id);
    const sibling = prs.find((candidate) => candidate.id !== pr.id);
    assert.equal(prs.length, 2);
    assert.ok(source, "Expected source PR after enabled full expansion");
    assert.ok(sibling, "Expected a sibling PR after enabled full expansion");
    assert.equal(sibling.status, "OPEN");
    assert.equal(sibling.createdBy, null);
    assert.equal(sibling.type, event.type);
    assert.deepEqual(sibling.time, event.timeWindow);
    assert.equal(sibling.confirmationEnabled, source.confirmationEnabled);
    assert.equal(
      sibling.confirmationStartOffsetMinutes,
      source.confirmationStartOffsetMinutes,
    );
    assert.equal(
      sibling.confirmationEndOffsetMinutes,
      source.confirmationEndOffsetMinutes,
    );
    assert.equal(sibling.joinLockOffsetMinutes, source.joinLockOffsetMinutes);
  },
);
