import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import type {
  AnchorEventPlaceOption,
} from "@/domains/event/model/place-options";
import type { TimeWindow } from "@/domains/event/model/time-window-view";

export type DemandCardViewModel = {
  cardKey: string;
  timeLabel: string;
  displayLocationName: string;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  coverImage: string | null;
};

export type LocationOption =
  AnchorEventDetailResponse["createTimeWindows"][number]["locationOptions"][number];

export type CreateTimeWindowEntry =
  AnchorEventDetailResponse["createTimeWindows"][number];

export type FrontDemandCardHandle = {
  triggerAction: (action: "skip" | "view-detail") => void;
  playHintWobble: () => void;
};

export type AnchorEventCardModeSurfaceProps = {
  activeDemandCard?: DemandCardViewModel | null;
  stackPreviewCards?: DemandCardViewModel[];
  isCardRouting?: boolean;
  cardActionError?: string | null;
  dragHintToken?: number;
  cardCreateTimeWindow?: TimeWindow | null;
  cardCreatePlaceId?: string | null;
  cardCreatePlaceOptions?: AnchorEventPlaceOption[];
  cardCreatePlaceLabel?: string;
  cardCreatePlacePlaceholder?: string;
  createActionErrorMessage?: string | null;
  isCreatePending?: boolean;
  canUserCreatePR?: boolean;
  cardCreateAllowEditAfterReady?: PRAllowEditAfterReady | null;
  eventId: number;
  eventTitle?: string;
  eventBetaGroupQrCode?: string | null;
};

type AnchorEventCardModeSurfaceDefaults = {
  stackPreviewCards: () => DemandCardViewModel[];
  isCardRouting: boolean;
  cardActionError: null;
  dragHintToken: number;
  cardCreateTimeWindow: null;
  cardCreatePlaceId: null;
  cardCreatePlaceOptions: () => AnchorEventPlaceOption[];
  cardCreatePlaceLabel: undefined;
  cardCreatePlacePlaceholder: undefined;
  createActionErrorMessage: null;
  isCreatePending: boolean;
  canUserCreatePR: boolean;
  cardCreateAllowEditAfterReady: null;
  eventTitle: string;
  eventBetaGroupQrCode: null;
};

export const anchorEventCardModeSurfaceDefaults: AnchorEventCardModeSurfaceDefaults = {
  stackPreviewCards: () => [],
  isCardRouting: false,
  cardActionError: null,
  dragHintToken: 0,
  cardCreateTimeWindow: null,
  cardCreatePlaceId: null,
  cardCreatePlaceOptions: () => [],
  cardCreatePlaceLabel: undefined,
  cardCreatePlacePlaceholder: undefined,
  createActionErrorMessage: null,
  isCreatePending: false,
  canUserCreatePR: true,
  cardCreateAllowEditAfterReady: null,
  eventTitle: "",
  eventBetaGroupQrCode: null,
};

export type AnchorEventCardModeSurfaceEmits = {
  "consume-drag-hint-window": [];
  "skip-active-card": [];
  "view-active-card-detail": [];
  "update:cardCreateTimeWindow": [value: TimeWindow | null];
  "update:cardCreateAllowEditAfterReady": [
    value: PRAllowEditAfterReady | null,
  ];
  "update:cardCreatePlaceId": [value: string | null];
  "create-from-card-empty": [];
  "card-stage-active-change": [isActive: boolean];
};

export const CARD_OVERFLOW_GUARD_CLASS = "anchor-event-card-overflow-guard";
export const CARD_MODE_DRAG_HINT_DELAY_MS = 3000;
