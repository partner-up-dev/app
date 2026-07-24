import { describe, expect, it } from "vitest";
import {
  toAdminPRTypeConfigAuthoringRequest,
  toAdminPRTypeConfigCompletionRequest,
  toAdminPRTypeConfigCoordinationRequest,
  toAdminPRTypeConfigCreateRequest,
  toAdminPRTypeConfigDiscoveryRequest,
  toAdminPRTypeConfigDraft,
  toAdminPRTypeConfigParticipationRequest,
  type AdminPRTypeConfigDetailResponse,
} from "./pr-type-config-adapter";
import { createEmptyPRTypeConfigDraft } from "../model/pr-type-config-editor";

const createDraftFixture = () => {
  const draft = createEmptyPRTypeConfigDraft("study");
  draft.authoring.timeWindowEditorDefaultMode = "FUZZY";
  draft.authoring.defaultNotes = "Bring a notebook";
  draft.discovery.communityQrCode = "https://example.com/community.png";
  draft.participation.participationFrequencyLimit = { intervalPrCount: 3 };
  draft.coordination.meetingPoint = {
    description: "North gate",
    imageUrl: null,
  };
  draft.coordination.locationMeetingPoints = {
    Library: {
      description: null,
      imageUrl: "https://example.com/library.png",
    },
  };
  return draft;
};

describe("Admin PR type config adapter", () => {
  it("projects an inferred detail response into an isolated editor draft", () => {
    const source = createDraftFixture();
    const response = {
      type: "study",
      ...source,
    } satisfies AdminPRTypeConfigDetailResponse;

    const draft = toAdminPRTypeConfigDraft(response);

    expect(draft).toEqual(source);
    expect(draft).not.toBe(source);
    expect(draft.authoring.routePool).not.toBe(source.authoring.routePool);
    expect(draft.participation.joinGateConfig).not.toBe(source.participation.joinGateConfig);
  });

  it("maps the whole draft and all five semantic sections to inferred request bodies", () => {
    const draft = createDraftFixture();

    expect(toAdminPRTypeConfigCreateRequest(draft)).toEqual(draft);
    expect(toAdminPRTypeConfigAuthoringRequest(draft.authoring)).toEqual(draft.authoring);
    expect(toAdminPRTypeConfigDiscoveryRequest(draft.discovery)).toEqual(draft.discovery);
    expect(toAdminPRTypeConfigParticipationRequest(draft.participation)).toEqual(
      draft.participation,
    );
    expect(toAdminPRTypeConfigCoordinationRequest(draft.coordination)).toEqual(draft.coordination);
    expect(toAdminPRTypeConfigCompletionRequest(draft.completion)).toEqual(draft.completion);
  });
});
