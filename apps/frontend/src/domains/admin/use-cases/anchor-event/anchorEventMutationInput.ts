import type {
  AdminAnchorEventInput,
  AdminAnchorEventWorkspaceResponse,
  AdminAnchorTimePoolConfigInput,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import type { AnchorEventRoutePool } from "@partner-up-dev/backend";
import {
  getRouteValidationIssue,
  normalizeRouteForSubmit,
} from "@/domains/route/model/route";
import type {
  AnchorEventEditorForm,
  EditableMeetingPointForm,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

type Workspace = NonNullable<AdminAnchorEventWorkspaceResponse>;

export type AdminAnchorEventRecord = Workspace["events"][number];

const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = 30;

export type AnchorEventBasicDraft = {
  title: string;
  type: string;
  description: string;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  coverImage: string;
  betaGroupQrCode: string;
  prCreationPolicy: AdminAnchorEventInput["prCreationPolicy"];
  status: AdminAnchorEventInput["status"];
};

export type AnchorEventLocationsDraft = {
  placePoolMode: AnchorEventEditorForm["placePoolMode"];
  locationPoolText: string;
  routePool: AnchorEventRoutePool;
  meetingPointDescription: string;
  meetingPointImageUrl: string;
  locationMeetingPoints: Record<string, EditableMeetingPointForm>;
};

export type AnchorEventTimePolicyDraft = {
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  absoluteRulesText: string;
  recurringRulesText: string;
  prTimeWindowEditorDefaultMode: AdminAnchorEventInput["prTimeWindowEditorDefaultMode"];
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
};

export type AnchorEventOtherSettingsDraft = {
  joinGateConfig: AdminAnchorEventInput["joinGateConfig"];
  participationFrequencyLimit: AdminAnchorEventInput["participationFrequencyLimit"];
  feedbackQuestionnaireTemplateId: number | null;
  defaultPrNotes: string;
  prCreationPolicy: AdminAnchorEventInput["prCreationPolicy"];
  fullPrExpansionPolicy: AdminAnchorEventInput["fullPrExpansionPolicy"];
};

export const normalizeLines = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const normalizeNullableNonNegativeInteger = (
  value: unknown,
): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

export const buildMeetingPointInput = (
  description: string,
  imageUrl: string,
): { description: string | null; imageUrl: string | null } | null => {
  const normalizedDescription = description.trim();
  const normalizedImageUrl = imageUrl.trim();
  if (!normalizedDescription && !normalizedImageUrl) {
    return null;
  }

  return {
    description: normalizedDescription || null,
    imageUrl: normalizedImageUrl || null,
  };
};

export const buildLocationMeetingPointsInput = (
  locations: string[],
  map: Record<string, EditableMeetingPointForm>,
): Record<string, { description: string | null; imageUrl: string | null }> => {
  const result: Record<
    string,
    { description: string | null; imageUrl: string | null }
  > = {};

  for (const location of locations) {
    const meetingPoint = map[location];
    if (!meetingPoint) {
      continue;
    }
    const input = buildMeetingPointInput(
      meetingPoint.description,
      meetingPoint.imageUrl,
    );
    if (input) {
      result[location] = input;
    }
  }

  return result;
};

const splitRuleDescription = (
  value: string,
): { ruleText: string; description: string | null } => {
  const separatorIndex = value.indexOf("|");
  if (separatorIndex < 0) {
    return {
      ruleText: value.trim(),
      description: null,
    };
  }

  const ruleText = value.slice(0, separatorIndex).trim();
  const description = value.slice(separatorIndex + 1).trim();
  return {
    ruleText,
    description: description || null,
  };
};

export const buildAnchorEventTimePoolConfig = (
  draft: AnchorEventTimePolicyDraft,
): AdminAnchorTimePoolConfigInput => {
  const absoluteRules = normalizeLines(draft.absoluteRulesText).map(
    (line, index) => {
      const { ruleText, description } = splitRuleDescription(line);
      return {
        id: `absolute-${index + 1}`,
        kind: "ABSOLUTE" as const,
        startAt: ruleText,
        description,
      };
    },
  );

  const recurringRules = normalizeLines(draft.recurringRulesText)
    .map((line, index) => {
      const { ruleText, description } = splitRuleDescription(line);
      const [weekdaysRaw = "", timeOfDayRaw = ""] = ruleText.split(/\s+/, 2);
      const weekdays = weekdaysRaw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
      const timeOfDay = timeOfDayRaw.trim();
      if (weekdays.length === 0 || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
        return null;
      }
      return {
        id: `recurring-${index + 1}`,
        kind: "RECURRING" as const,
        weekdays,
        timeOfDay,
        description,
      };
    })
    .filter(
      (
        value,
      ): value is Extract<
        AdminAnchorTimePoolConfigInput["startRules"][number],
        { kind: "RECURRING" }
      > => value !== null,
    );

  return {
    durationMinutes: normalizeNullableNonNegativeInteger(draft.durationMinutes),
    earliestLeadMinutes: normalizeNullableNonNegativeInteger(
      draft.earliestLeadMinutes,
    ),
    startRules: [...absoluteRules, ...recurringRules],
  };
};

export const toAnchorEventMutationInput = (
  event: AdminAnchorEventRecord,
  patch: Partial<AdminAnchorEventInput> = {},
): AdminAnchorEventInput => ({
  title: event.title,
  type: event.type,
  description: event.description ?? null,
  locationPool: event.locationPool,
  routePool: event.routePool,
  meetingPoint: event.meetingPoint ?? null,
  locationMeetingPoints: event.locationMeetingPoints,
  joinGateConfig: event.joinGateConfig,
  participationFrequencyLimit: event.participationFrequencyLimit,
  feedbackQuestionnaireTemplateId:
    event.feedbackQuestionnaireTemplateId ?? null,
  defaultPrNotes: event.defaultPrNotes ?? null,
  timePoolConfig: event.timePoolConfig,
  defaultMinPartners: event.defaultMinPartners,
  defaultMaxPartners: event.defaultMaxPartners,
  defaultConfirmationEnabled: event.defaultConfirmationEnabled,
  defaultConfirmationStartOffsetMinutes:
    event.defaultConfirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  defaultConfirmationEndOffsetMinutes:
    event.defaultConfirmationEndOffsetMinutes ??
    DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  defaultJoinLockOffsetMinutes:
    event.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  coverImage: event.coverImage ?? null,
  betaGroupQrCode: event.betaGroupQrCode ?? null,
  prCreationPolicy: event.prCreationPolicy,
  fullPrExpansionPolicy: event.fullPrExpansionPolicy,
  prTimeWindowEditorDefaultMode: event.prTimeWindowEditorDefaultMode,
  status: event.status as AdminAnchorEventInput["status"],
  ...patch,
});

export const normalizeRoutePoolForSubmit = (
  routePool: AnchorEventRoutePool,
): AnchorEventRoutePool => {
  const seen = new Set<string>();
  const result: AnchorEventRoutePool = [];

  for (const entry of routePool) {
    const id = entry.id.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    const route = normalizeRouteForSubmit(entry.route);
    if (!route || getRouteValidationIssue(route) !== null) {
      continue;
    }

    seen.add(id);
    result.push({
      id,
      route,
    });
  }

  return result;
};

export const buildAnchorEventMutationInputFromEditorDraft = (
  draft: AnchorEventEditorForm,
): AdminAnchorEventInput => {
  const locationPool =
    draft.placePoolMode === "location" ? normalizeLines(draft.locationPoolText) : [];
  const routePool =
    draft.placePoolMode === "route"
      ? normalizeRoutePoolForSubmit(draft.routePool)
      : [];
  return {
    title: draft.title.trim(),
    type: draft.type.trim(),
    description: draft.description.trim() || null,
    locationPool,
    routePool,
    meetingPoint: buildMeetingPointInput(
      draft.meetingPointDescription,
      draft.meetingPointImageUrl,
    ),
    locationMeetingPoints:
      draft.placePoolMode === "location"
        ? buildLocationMeetingPointsInput(
            locationPool,
            draft.locationMeetingPoints,
          )
        : {},
    joinGateConfig: draft.joinGateConfig,
    participationFrequencyLimit: draft.participationFrequencyLimit,
    feedbackQuestionnaireTemplateId: draft.feedbackQuestionnaireTemplateId,
    defaultPrNotes: draft.defaultPrNotes.trim() || null,
    timePoolConfig: buildAnchorEventTimePoolConfig(draft),
    defaultMinPartners: normalizeNullableNonNegativeInteger(
      draft.defaultMinPartners,
    ),
    defaultMaxPartners: normalizeNullableNonNegativeInteger(
      draft.defaultMaxPartners,
    ),
    defaultConfirmationStartOffsetMinutes:
      draft.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEnabled: draft.defaultConfirmationEnabled,
    defaultConfirmationEndOffsetMinutes:
      draft.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: draft.defaultJoinLockOffsetMinutes,
    coverImage: draft.coverImage.trim() || null,
    betaGroupQrCode: draft.betaGroupQrCode.trim() || null,
    prCreationPolicy: draft.prCreationPolicy,
    fullPrExpansionPolicy: draft.fullPrExpansionPolicy,
    prTimeWindowEditorDefaultMode: draft.prTimeWindowEditorDefaultMode,
    status: draft.status,
  };
};
