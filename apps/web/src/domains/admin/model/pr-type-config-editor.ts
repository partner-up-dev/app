import type {
  AdminPRTypeConfigAuthoring,
  AdminPRTypeConfigCompletion,
  AdminPRTypeConfigCoordination,
  AdminPRTypeConfigDiscovery,
  AdminPRTypeConfigDraft,
  AdminPRTypeConfigParticipation,
} from "@/domains/admin/queries/useAdminPRTypeConfigs";

export type PRTypeConfigSection =
  | "authoring"
  | "discovery"
  | "participation"
  | "coordination"
  | "completion";

export type JsonDraftKey =
  | "routePool"
  | "timePoolConfig"
  | "joinGateConfig"
  | "meetingPoint"
  | "locationMeetingPoints";

export type JsonDrafts = Record<JsonDraftKey, string>;
export type JsonErrors = Partial<Record<JsonDraftKey, string>>;

export type PRTypeConfigSectionResponse = {
  authoring: AdminPRTypeConfigAuthoring;
  discovery: AdminPRTypeConfigDiscovery;
  participation: AdminPRTypeConfigParticipation;
  coordination: AdminPRTypeConfigCoordination;
  completion: AdminPRTypeConfigCompletion;
};

const pretty = (value: unknown): string => JSON.stringify(value, null, 2);

export const createEmptyPRTypeConfigDraft = (type: string): AdminPRTypeConfigDraft => ({
  authoring: {
    locationPool: [],
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    defaultMinPartners: null,
    defaultMaxPartners: null,
    defaultNotes: null,
    authoringCreationPolicy: "USER_AND_ADMIN",
  },
  discovery: {
    title: type,
    description: null,
    coverImage: null,
    viewRatios: { FORM: 0, CARD: 0, LIST: 0 },
  },
  participation: {
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 120,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 30,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    fullCapacityExpansionPolicy: "DISABLED",
  },
  coordination: { meetingPoint: null, locationMeetingPoints: {} },
  completion: { feedbackQuestionnaireTemplateId: null },
});

export const clonePRTypeConfigDraft = (draft: AdminPRTypeConfigDraft): AdminPRTypeConfigDraft =>
  structuredClone(draft);

export const resetPRTypeConfigDraft = (
  type: string,
  detail?: AdminPRTypeConfigDraft,
): AdminPRTypeConfigDraft =>
  detail ? clonePRTypeConfigDraft(detail) : createEmptyPRTypeConfigDraft(type);

export const createJsonDrafts = (draft: AdminPRTypeConfigDraft): JsonDrafts => ({
  routePool: pretty(draft.authoring.routePool),
  timePoolConfig: pretty(draft.authoring.timePoolConfig),
  joinGateConfig: pretty(draft.participation.joinGateConfig),
  meetingPoint: pretty(draft.coordination.meetingPoint),
  locationMeetingPoints: pretty(draft.coordination.locationMeetingPoints),
});

export const parseJsonDraft = <T>(text: string): { value: T | null; error: string | null } => {
  try {
    return { value: JSON.parse(text) as T, error: null };
  } catch {
    return { value: null, error: "JSON 格式无效，请修正后再保存" };
  }
};

export const applyJsonDraft = <K extends JsonDraftKey>(
  draft: AdminPRTypeConfigDraft,
  drafts: JsonDrafts,
  errors: JsonErrors,
  key: K,
  text: string,
): AdminPRTypeConfigDraft => {
  drafts[key] = text;
  const parsed = parseJsonDraft<unknown>(text);
  if (parsed.error) {
    errors[key] = parsed.error;
    return draft;
  }
  delete errors[key];
  const next = clonePRTypeConfigDraft(draft);
  if (key === "routePool")
    next.authoring.routePool = parsed.value as typeof next.authoring.routePool;
  if (key === "timePoolConfig")
    next.authoring.timePoolConfig = parsed.value as typeof next.authoring.timePoolConfig;
  if (key === "joinGateConfig")
    next.participation.joinGateConfig = parsed.value as typeof next.participation.joinGateConfig;
  if (key === "meetingPoint")
    next.coordination.meetingPoint = parsed.value as typeof next.coordination.meetingPoint;
  if (key === "locationMeetingPoints")
    next.coordination.locationMeetingPoints =
      parsed.value as typeof next.coordination.locationMeetingPoints;
  return next;
};

export const mergeSavedSlice = (
  draft: AdminPRTypeConfigDraft,
  section: PRTypeConfigSection,
  response: PRTypeConfigSectionResponse,
): AdminPRTypeConfigDraft => ({
  ...draft,
  [section]: structuredClone(response[section]),
});

export const normalizeNullableNumber = (
  value: string | number | null | undefined,
): number | null | undefined => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : undefined;
};

export const normalizeRequiredNumber = (
  value: string | number | null | undefined,
): number | undefined => {
  const normalized = normalizeNullableNumber(value);
  return normalized === null || normalized === undefined ? undefined : normalized;
};
