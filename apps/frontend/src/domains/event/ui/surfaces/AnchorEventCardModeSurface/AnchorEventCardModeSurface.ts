import type { AnchorEventDetailResponse } from "@/domains/event/model/types";

export type DemandCardViewModel = {
  cardKey: string;
  timeLabel: string;
  displayLocationName: string;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  coverImage: string | null;
};

export type CardTimeWindowOption = {
  key: string;
  label: string;
};

export type CardCreateLocationOption = {
  locationId: string;
  label: string;
  disabled: boolean;
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
  cardCreateTimeWindowOptions?: CardTimeWindowOption[];
  cardCreateTimeWindowKey?: string | null;
  cardCreateLocationId?: string;
  cardCreateLocationOptions?: CardCreateLocationOption[];
  createActionErrorMessage?: string | null;
  isCreatePending?: boolean;
  canUserCreatePR?: boolean;
  eventId: number;
  eventTitle?: string;
  eventBetaGroupQrCode?: string | null;
};

type AnchorEventCardModeSurfaceDefaults = {
  stackPreviewCards: () => DemandCardViewModel[];
  isCardRouting: boolean;
  cardActionError: null;
  dragHintToken: number;
  cardCreateTimeWindowOptions: () => CardTimeWindowOption[];
  cardCreateTimeWindowKey: null;
  cardCreateLocationId: string;
  cardCreateLocationOptions: () => CardCreateLocationOption[];
  createActionErrorMessage: null;
  isCreatePending: boolean;
  canUserCreatePR: boolean;
  eventTitle: string;
  eventBetaGroupQrCode: null;
};

export const anchorEventCardModeSurfaceDefaults: AnchorEventCardModeSurfaceDefaults = {
  stackPreviewCards: () => [],
  isCardRouting: false,
  cardActionError: null,
  dragHintToken: 0,
  cardCreateTimeWindowOptions: () => [],
  cardCreateTimeWindowKey: null,
  cardCreateLocationId: "",
  cardCreateLocationOptions: () => [],
  createActionErrorMessage: null,
  isCreatePending: false,
  canUserCreatePR: true,
  eventTitle: "",
  eventBetaGroupQrCode: null,
};

export type AnchorEventCardModeSurfaceEmits = {
  "consume-drag-hint-window": [];
  "skip-active-card": [];
  "view-active-card-detail": [];
  "update:cardCreateTimeWindowKey": [value: string | null];
  "update:cardCreateLocationId": [value: string];
  "create-from-card-empty": [];
  "card-stage-active-change": [isActive: boolean];
};

export const CARD_OVERFLOW_GUARD_CLASS = "anchor-event-card-overflow-guard";
export const CARD_MODE_DRAG_HINT_DELAY_MS = 3000;
