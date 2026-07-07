import { describe, expect, test } from "vitest";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  buildAnchorEventMutationInputFromEditorDraft,
  normalizeRoutePoolForSubmit,
} from "./anchorEventMutationInput";

const validRoute = [
  {
    name: " 广州塔东广场 ",
    full_address: " ",
    gcj02: [23.10647, 113.32446] as [number, number],
    wgs84: null,
    bd09: null,
  },
  {
    name: " 体育西路地铁站 ",
    full_address: null,
    gcj02: [23.13402, 113.32172] as [number, number],
    wgs84: null,
    bd09: null,
  },
];

const baseDraft = (): AnchorEventEditorForm => ({
  title: "路线活动",
  type: "徒步",
  description: "",
  placePoolMode: "location",
  locationPoolText: "珠江新城\n天河公园",
  routePool: [],
  meetingPointDescription: "",
  meetingPointImageUrl: "",
  locationMeetingPoints: {
    珠江新城: {
      description: "A 出口",
      imageUrl: "",
    },
  },
  joinGateConfig: [],
  participationFrequencyLimit: null,
  feedbackQuestionnaireTemplateId: null,
  defaultPrNotes: "",
  durationMinutes: null,
  earliestLeadMinutes: null,
  absoluteRulesText: "",
  recurringRulesText: "",
  defaultMinPartners: null,
  defaultMaxPartners: null,
  defaultConfirmationEnabled: true,
  defaultConfirmationStartOffsetMinutes: 120,
  defaultConfirmationEndOffsetMinutes: 30,
  defaultJoinLockOffsetMinutes: 30,
  coverImage: "",
  betaGroupQrCode: "",
  prCreationPolicy: "USER_AND_ADMIN",
  fullPrExpansionPolicy: "DISABLED",
  prTimeWindowEditorDefaultMode: "NORMAL",
  status: "ACTIVE",
});

describe("anchor event route pool mutation input", () => {
  test("normalizeRoutePoolForSubmit trims route entries and skips invalid or duplicate ids", () => {
    expect(
      normalizeRoutePoolForSubmit([
        {
          id: " route-a ",
          route: validRoute,
        },
        {
          id: "route-a",
          route: validRoute,
        },
        {
          id: "route-b",
          route: [
            validRoute[0],
            {
              ...validRoute[1],
              gcj02: null,
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: "route-a",
        route: [
          {
            ...validRoute[0],
            name: "广州塔东广场",
            full_address: null,
          },
          {
            ...validRoute[1],
            name: "体育西路地铁站",
          },
        ],
      },
    ]);
  });

  test("location mode submits location pool and clears route pool", () => {
    const input = buildAnchorEventMutationInputFromEditorDraft({
      ...baseDraft(),
      routePool: [
        {
          id: "route-a",
          route: validRoute,
        },
      ],
    });

    expect(input.locationPool).toEqual(["珠江新城", "天河公园"]);
    expect(input.prTimeWindowEditorDefaultMode).toBe("NORMAL");
    expect(input.locationMeetingPoints).toEqual({
      珠江新城: {
        description: "A 出口",
        imageUrl: null,
      },
    });
    expect(input.routePool).toEqual([]);
  });

  test("route mode submits route pool and clears location pool artifacts", () => {
    const input = buildAnchorEventMutationInputFromEditorDraft({
      ...baseDraft(),
      placePoolMode: "route",
      prTimeWindowEditorDefaultMode: "FUZZY",
      routePool: [
        {
          id: "route-a",
          route: validRoute,
        },
      ],
    });

    expect(input.locationPool).toEqual([]);
    expect(input.locationMeetingPoints).toEqual({});
    expect(input.prTimeWindowEditorDefaultMode).toBe("FUZZY");
    expect(input.routePool).toHaveLength(1);
    expect(input.routePool[0]?.id).toBe("route-a");
  });
});
