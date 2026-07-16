import assert from "node:assert/strict";
import { z } from "zod";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../../../src/domains/pr-core/services/participation-policy.service";
import type { FeedbackQuestionnaireTemplateId } from "../../../../src/entities/feedback-questionnaire";
import type {
  PartnerRequestFields,
  PRId,
  PRRoute,
  PRStatus,
} from "../../../../src/entities/partner-request";
import type { PRTypeConfig } from "../../../../src/entities/pr-type-config";
import {
  prTypeConfigAuthoringCreationPolicySchema,
  prTypeConfigFullCapacityExpansionPolicySchema,
} from "../../../../src/entities/pr-type-config";
import { PRTypeConfigRepository } from "../../../../src/repositories/PRTypeConfigRepository";
import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type { ScenarioUser } from "../../../pr-core/_kit/builders/users";

export type ScenarioPRType = {
  type: string;
  title: string;
  locations: string[];
  routePool: Array<{ id: string; route: PRRoute }>;
  timeWindow: [string, string];
  timeWindows: Array<[string, string]>;
};

type CreatePRResponse = { id: PRId; status: PRStatus; canonicalPath: string };

const configRepo = new PRTypeConfigRepository();
let sequence = 0;

const buildWindow = (index: number): [string, string] => {
  const day = String(10 + index).padStart(2, "0");
  return [`2035-01-${day}T10:00:00.000Z`, `2035-01-${day}T11:00:00.000Z`];
};

export async function givenPRTypeConfig(input: {
  label: string;
  locations?: string[];
  routePool?: Array<{ id: string; route: PRRoute }>;
  timeWindows?: Array<[string, string]>;
  defaultMinPartners?: number | null;
  defaultMaxPartners?: number | null;
  defaultPrNotes?: string | null;
  authoringCreationPolicy?: z.infer<typeof prTypeConfigAuthoringCreationPolicySchema>;
  fullCapacityExpansionPolicy?: z.infer<typeof prTypeConfigFullCapacityExpansionPolicySchema>;
  participationFrequencyLimit?: { intervalPrCount: number } | null;
  feedbackQuestionnaireTemplateId?: FeedbackQuestionnaireTemplateId | null;
  discoveryFormRatio?: number;
  discoveryCardRatio?: number;
  discoveryListRatio?: number;
  communityQrCode?: string | null;
  meetingPoint?: PRTypeConfig["meetingPoint"];
}): Promise<ScenarioPRType> {
  const current = sequence++;
  const timeWindows = input.timeWindows ?? [buildWindow(current)];
  const type = `scenario-pr-type-${input.label}-${current}`;
  const title = `Scenario PR type ${input.label}`;
  const routePool = input.routePool ?? [];
  const locations = routePool.length > 0 ? [] : (input.locations ?? [`Scenario Court ${current}`]);
  await configRepo.create({
    type,
    title,
    description: `Scenario PR type for ${input.label}`,
    locationPool: locations,
    routePool,
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: timeWindows.map((window, index) => ({
        id: `scenario-start-${current}-${index}`,
        kind: "ABSOLUTE",
        startAt: window[0],
        description: null,
      })),
    },
    defaultMinPartners: input.defaultMinPartners ?? 2,
    defaultMaxPartners: input.defaultMaxPartners ?? null,
    defaultNotes: input.defaultPrNotes ?? null,
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: input.meetingPoint ?? null,
    joinGateConfig: [],
    participationFrequencyLimit: input.participationFrequencyLimit ?? null,
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId ?? null,
    locationMeetingPoints: {},
    coverImage: null,
    communityQrCode: input.communityQrCode ?? null,
    authoringCreationPolicy: input.authoringCreationPolicy ?? "USER_AND_ADMIN",
    fullCapacityExpansionPolicy: input.fullCapacityExpansionPolicy ?? "DISABLED",
    discoveryFormRatio: input.discoveryFormRatio ?? 50,
    discoveryCardRatio: input.discoveryCardRatio ?? 50,
    discoveryListRatio: input.discoveryListRatio ?? 0,
  });
  const timeWindow = timeWindows[0] ?? buildWindow(current);
  return {
    type,
    title,
    locations,
    routePool,
    timeWindow,
    timeWindows,
  };
}

export async function givenPRTypeVisiblePR(input: {
  creator: ScenarioUser;
  prType: ScenarioPRType;
  title: string;
  location?: string;
  route?: PRRoute | null;
  timeWindow?: [string, string];
  preferences?: string[];
  notes?: string | null;
  minPartners?: number | null;
  maxPartners?: number | null;
  expectedStatus?: PRStatus;
}): Promise<{ id: PRId }> {
  const fields: PartnerRequestFields = {
    title: input.title,
    type: input.prType.type,
    time: input.timeWindow ?? input.prType.timeWindow,
    location: input.route ? null : (input.location ?? input.prType.locations[0] ?? null),
    route: input.route ?? null,
    minPartners: input.minPartners ?? 2,
    maxPartners: input.maxPartners ?? null,
    partners: [],
    budget: null,
    preferences: input.preferences ?? [],
    notes: input.notes ?? "Scenario visible PR",
  };
  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: { fields, createSource: "PR_DISCOVERY" },
  });
  const body = await expectJsonResponse<CreatePRResponse>(response, 201);
  assert.equal(body.status, input.expectedStatus ?? "OPEN");
  return { id: body.id };
}
