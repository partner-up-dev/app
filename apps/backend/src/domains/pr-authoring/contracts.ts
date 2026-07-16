import type { PRRoute } from "../../entities/partner-request";
import type {
  PRTypeConfig,
  PRTypeConfigTimeWindowEditorDefaultMode,
} from "../../entities/pr-type-config";
import type { PRTypePreferenceTagModerationStatus } from "../../entities/pr-type-preference-tag";

export type PRAuthoringPlaceDisabledReason = "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";

export type PRAuthoringMapCoordinate = {
  lat: number;
  lng: number;
};

export type PRAuthoringLocationOption = {
  kind: "location";
  id: string;
  locationId: string;
  label: string;
  fullAddress: string | null;
  gallery: string[];
  coordinate: PRAuthoringMapCoordinate | null;
  availableStartKeys: string[];
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: PRAuthoringPlaceDisabledReason;
};

export type PRAuthoringRouteOption = {
  kind: "route";
  id: string;
  routePoolEntryId: string;
  label: string;
  route: PRRoute;
  availableStartKeys: string[];
  remainingQuota: null;
  disabled: boolean;
  disabledReason: PRAuthoringPlaceDisabledReason;
};

export type PRAuthoringStartOption = {
  key: string;
  startAt: string;
  endAt: string;
  description: string | null;
  locationOptions: PRAuthoringLocationOption[];
  routeOptions: PRAuthoringRouteOption[];
};

export type PRAuthoringDefaultSelection = {
  sourcePrId: number;
  locationId: string;
  startAt: string;
};

export type PRAuthoringOptions = {
  type: string;
  creationAllowed: boolean;
  durationMinutes: PRTypeConfig["timePoolConfig"]["durationMinutes"];
  earliestLeadMinutes: PRTypeConfig["timePoolConfig"]["earliestLeadMinutes"];
  timeWindowEditorDefaultMode: PRTypeConfigTimeWindowEditorDefaultMode;
  authoringDefaults: {
    minPartners: number | null;
    maxPartners: number | null;
    notes: string | null;
  };
  startOptions: PRAuthoringStartOption[];
  locationOptions: PRAuthoringLocationOption[];
  routeOptions: PRAuthoringRouteOption[];
  preferenceTags: Array<{
    label: string;
    description: string;
  }>;
  defaultSelection: PRAuthoringDefaultSelection | null;
};

export type PRTypePreferenceTagSubmission = {
  id: number;
  label: string;
  description: string;
  moderationStatus: PRTypePreferenceTagModerationStatus;
};

export type PRTypePreferenceTagSubmissionResponse = {
  type: string;
  submittedTags: PRTypePreferenceTagSubmission[];
};
