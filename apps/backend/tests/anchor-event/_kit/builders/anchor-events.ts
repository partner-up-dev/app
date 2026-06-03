import assert from "node:assert/strict";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../../../src/domains/pr/services";
import type {
  AnchorEventId,
  AnchorEventFullPrExpansionPolicy,
  AnchorEventParticipationFrequencyLimit,
  AnchorEventPrCreationPolicy,
  AnchorEventRoutePool,
} from "../../../../src/entities";
import type { FeedbackQuestionnaireTemplateId } from "../../../../src/entities/feedback-questionnaire";
import type {
  PartnerRequestFields,
  PRId,
  PRRoute,
  PRStatus,
} from "../../../../src/entities/partner-request";
import {
  getAnchorEventLandingConfigKey,
  serializeAnchorEventLandingConfig,
  type AnchorEventLandingVariantRatioOverride,
} from "../../../../src/domains/anchor-event/landing-config";
import { AnchorEventRepository } from "../../../../src/repositories/AnchorEventRepository";
import { ConfigRepository } from "../../../../src/repositories/ConfigRepository";
import {
  expectJsonResponse,
  requestJson,
} from "../../../_infra/http/backend-app";
import type { ScenarioUser } from "../../../pr-core/_kit/builders/users";

export type ScenarioAnchorEvent = {
  id: AnchorEventId;
  title: string;
  type: string;
  betaGroupQrCode: string | null;
  locationId: string;
  locationIds: string[];
  routePool: AnchorEventRoutePool;
  timeWindow: [string, string];
  timeWindows: Array<[string, string]>;
};

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

const anchorEventRepo = new AnchorEventRepository();
const configRepo = new ConfigRepository();

let scenarioAnchorEventSequence = 0;

const buildScenarioTimeWindow = (sequence: number): [string, string] => {
  const day = String(10 + sequence).padStart(2, "0");
  return [
    `2035-01-${day}T10:00:00.000Z`,
    `2035-01-${day}T11:00:00.000Z`,
  ];
};

export async function givenAnchorEvent(input: {
  label: string;
  locationIds?: string[];
  routePool?: AnchorEventRoutePool;
  timeWindows?: Array<[string, string]>;
  defaultMinPartners?: number | null;
  defaultMaxPartners?: number | null;
  defaultPrNotes?: string | null;
  prCreationPolicy?: AnchorEventPrCreationPolicy;
  fullPrExpansionPolicy?: AnchorEventFullPrExpansionPolicy;
  participationFrequencyLimit?: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId?: FeedbackQuestionnaireTemplateId | null;
  betaGroupQrCode?: string | null;
}): Promise<ScenarioAnchorEvent> {
  const sequence = scenarioAnchorEventSequence++;
  const timeWindows = input.timeWindows ?? [buildScenarioTimeWindow(sequence)];
  const type = `system-anchor-landing-${input.label}-${sequence}`;
  const title = `System Anchor Landing ${input.label}`;
  const routePool = input.routePool ?? [];
  const locationIds =
    routePool.length > 0
      ? []
      : (input.locationIds ?? [`System Landing Court ${sequence}`]);
  const locationId = locationIds[0] ?? `System Landing Court ${sequence}`;
  const timeWindow = timeWindows[0] ?? buildScenarioTimeWindow(sequence);

  const event = await anchorEventRepo.create({
    title,
    type,
    description: `System scenario anchor event for ${input.label}`,
    locationPool: locationIds,
    routePool,
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: timeWindows.map((window, index) => ({
        id: `system-scenario-start-${index + 1}`,
        kind: "ABSOLUTE",
        startAt: window[0],
        description: `System scenario start window ${index + 1}`,
      })),
    },
    defaultMinPartners: input.defaultMinPartners ?? 2,
    defaultMaxPartners: input.defaultMaxPartners ?? null,
    defaultPrNotes: input.defaultPrNotes ?? null,
    defaultConfirmationStartOffsetMinutes:
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: null,
    joinGateConfig: [],
    participationFrequencyLimit: input.participationFrequencyLimit ?? null,
    feedbackQuestionnaireTemplateId:
      input.feedbackQuestionnaireTemplateId ?? null,
    locationMeetingPoints: {},
    coverImage: null,
    betaGroupQrCode: input.betaGroupQrCode ?? null,
    prCreationPolicy: input.prCreationPolicy ?? "USER_AND_ADMIN",
    fullPrExpansionPolicy: input.fullPrExpansionPolicy ?? "DISABLED",
    status: "ACTIVE",
  });

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    betaGroupQrCode: event.betaGroupQrCode,
    locationId,
    locationIds,
    routePool,
    timeWindow,
    timeWindows,
  };
}

export async function givenAnchorEventVisiblePR(input: {
  creator: ScenarioUser;
  event: ScenarioAnchorEvent;
  title: string;
  location?: string;
  route?: PRRoute | null;
  timeWindow?: [string, string];
  preferences?: string[];
  minPartners?: number | null;
  maxPartners?: number | null;
  expectedStatus?: PRStatus;
}): Promise<{ id: PRId }> {
  const fields: PartnerRequestFields = {
    title: input.title,
    type: input.event.type,
    time: input.timeWindow ?? input.event.timeWindow,
    location: input.route ? null : (input.location ?? input.event.locationId),
    route: input.route ?? null,
    minPartners: input.minPartners ?? 2,
    maxPartners: input.maxPartners ?? null,
    partners: [],
    budget: null,
    preferences: input.preferences ?? ["场景:分流"],
    notes: "System scenario visible PR",
  };

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields,
      createSource: "FORM",
    },
  });
  const body = await expectJsonResponse<CreatePRResponse>(response, 201);

  assert.equal(body.status, input.expectedStatus ?? "OPEN");

  return { id: body.id };
}

export async function setAnchorEventLandingRollout(input: {
  eventId: AnchorEventId;
  ratios: AnchorEventLandingVariantRatioOverride;
  assignmentRevision: number;
}): Promise<void> {
  await configRepo.upsertValueByKey(
    getAnchorEventLandingConfigKey(input.eventId),
    serializeAnchorEventLandingConfig({
      variantRatioOverride: input.ratios,
      assignmentRevision: input.assignmentRevision,
    }),
  );
}
