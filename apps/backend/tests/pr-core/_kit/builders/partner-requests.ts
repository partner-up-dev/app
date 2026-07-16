import assert from "node:assert/strict";
import { initializeSlotsForPR } from "../../../../src/domains/pr-core/services/slot-management.service";
import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRId,
  PRStatus,
} from "../../../../src/entities/partner-request";
import { PartnerRequestRepository } from "../../../../src/repositories/PartnerRequestRepository";
import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type { ScenarioUser } from "./users";

export type ScenarioPartnerRequest = {
  id: PRId;
};

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

export type GivenPublishedPartnerRequestInput = {
  creator: ScenarioUser;
  maxPartners?: number | null;
  minPartners: number;
  expectedCreatedStatus?: PRStatus;
  title?: string;
};

export type GivenPersistedPartnerRequestInput = {
  creator: ScenarioUser;
  fields: PartnerRequestFields;
  status: PRStatus;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
};

const defaultTimeWindow = (): [string, string] => [
  "2030-01-01T10:00:00.000Z",
  "2030-01-01T12:00:00.000Z",
];

let scenarioFieldsSequence = 0;
const prRepo = new PartnerRequestRepository();

export function buildScenarioFields(title: string): PartnerRequestFields {
  const sequence = scenarioFieldsSequence++;
  const day = String(10 + Math.floor(sequence / 8)).padStart(2, "0");
  const startHour = String(8 + (sequence % 8)).padStart(2, "0");
  const endHour = String(9 + (sequence % 8)).padStart(2, "0");

  return {
    title,
    type: "badminton",
    time: [`2031-01-${day}T${startHour}:00:00.000Z`, `2031-01-${day}T${endHour}:00:00.000Z`],
    location: `Scenario Court ${sequence}`,
    route: null,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  };
}

export async function givenDraftPR(input: {
  creator: ScenarioUser;
  title: string;
}): Promise<ScenarioPartnerRequest> {
  const fields = buildScenarioFields(input.title);
  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
    joinGateConfig: [],
    status: "DRAFT",
    createdBy: null,
  });
  await initializeSlotsForPR(request.id, null);

  return { id: request.id };
}

export async function givenPersistedPartnerRequest(
  input: GivenPersistedPartnerRequestInput,
): Promise<ScenarioPartnerRequest> {
  const request = await prRepo.create({
    title: input.fields.title,
    type: input.fields.type,
    time: input.fields.time,
    location: input.fields.location,
    route: input.fields.route,
    minPartners: input.fields.minPartners,
    maxPartners: input.fields.maxPartners,
    budget: input.fields.budget,
    preferences: input.fields.preferences,
    notes: input.fields.notes,
    meetingPoint: input.fields.meetingPoint ?? null,
    joinGateConfig: [],
    status: input.status,
    createdBy: input.creator.user.id,
    allowEditAfterReady: input.allowEditAfterReady ?? null,
  });
  await initializeSlotsForPR(request.id, null);

  return { id: request.id };
}

export async function givenPublishedPartnerRequest(
  input: GivenPublishedPartnerRequestInput,
): Promise<ScenarioPartnerRequest> {
  const fields: PartnerRequestFields = {
    title: input.title ?? "Scenario badminton partner request",
    type: "badminton",
    time: defaultTimeWindow(),
    location: "Scenario Court",
    route: null,
    minPartners: input.minPartners,
    maxPartners: input.maxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  };

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields,
      createSource: "PR_DISCOVERY",
    },
  });
  const body = await expectJsonResponse<CreatePRResponse>(response, 201);
  const expectedStatus = input.expectedCreatedStatus ?? "OPEN";
  if (body.status !== expectedStatus) {
    throw new Error(`Expected created PR to be ${expectedStatus}, got ${body.status}`);
  }

  return { id: body.id };
}
