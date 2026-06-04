import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import {
  AnchorEventPRContextRepository,
  type AnchorEventPRContextRecord,
} from "../../../repositories/AnchorEventPRContextRepository";
import {
  type AnchorEventRoutePool,
  type AnchorEvent,
  type AnchorEventId,
  type AnchorEventPrCreationPolicy,
  type AnchorEventPrTimeWindowEditorDefaultMode,
} from "../../../entities";
import { isJoinableStatus } from "../../pr-core/services/status-rules";
import {
  canUserCreatePRForAnchorEvent,
  isTimeWindowAvailableByPoiRules,
} from "../../pr/services";
import { isAnchorEventFormModeStartSelectable } from "../services/form-mode";
import {
  buildAnchorEventPlaceSelectorView,
  toAnchorEventLocationPlaceOptionView,
  toAnchorEventRoutePlaceOptionView,
  type AnchorEventPlaceSelectorView,
} from "../services/place-selector";
import {
  resolveEventRoutePool,
  resolvePublicEventLocationPool,
} from "../services/event-scope";
import { listAnchorEventTimeWindowDetails } from "../services/time-window-pool";
import { findPoisByNames } from "../../poi";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();
const eventContextRepo = new AnchorEventPRContextRepository();

const hasTimeWindowStarted = (
  timeWindow: [string | null, string | null],
  now: Date,
): boolean => {
  const startAt = timeWindow[0];
  if (!startAt) {
    return false;
  }
  const parsed = Date.parse(startAt);
  return Number.isFinite(parsed) && parsed <= now.getTime();
};

const resolveLocationIds = async (
  event: NonNullable<Awaited<ReturnType<AnchorEventRepository["findById"]>>>,
): Promise<string[]> => resolvePublicEventLocationPool(event);

const parseStartAt = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveDefaultSelection = (
  event: AnchorEvent,
  records: AnchorEventPRContextRecord[],
  now: Date,
): AnchorEventFormModeData["defaultSelection"] => {
  const rankedRecords = records
    .flatMap((record) => {
      const locationId = record.root.location?.trim() ?? "";
      const startAt = record.root.time[0] ?? null;
      const parsedStartAt = parseStartAt(startAt);
      if (
        !locationId ||
        !parsedStartAt ||
        !isJoinableStatus(record.root.status) ||
        !isAnchorEventFormModeStartSelectable(event, startAt, now)
      ) {
        return [];
      }

      return [
        {
          record,
          locationId,
          startAt: parsedStartAt.toISOString(),
          startTime: parsedStartAt.getTime(),
        },
      ];
    })
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime - right.startTime;
      }
      return (
        right.record.root.createdAt.getTime() -
        left.record.root.createdAt.getTime()
      );
    });

  const selected = rankedRecords[0] ?? null;
  if (!selected) {
    return null;
  }

  return {
    sourcePrId: selected.record.root.id,
    locationId: selected.locationId,
    startAt: selected.startAt,
  };
};

export interface AnchorEventFormModeData {
  event: {
    id: number;
    title: string;
    type: string;
    description: string | null;
    durationMinutes: number | null;
    earliestLeadMinutes: number | null;
    defaultMinPartners: number | null;
    defaultMaxPartners: number | null;
    prCreationPolicy: AnchorEventPrCreationPolicy;
    prTimeWindowEditorDefaultMode: AnchorEventPrTimeWindowEditorDefaultMode;
    canUserCreatePR: boolean;
  };
  locations: Array<{
    id: string;
    gallery: string[];
    availableStartKeys: string[];
  }>;
  routes: Array<{
    id: string;
    route: AnchorEventRoutePool[number]["route"];
    availableStartKeys: string[];
  }>;
  placeSelector: AnchorEventPlaceSelectorView;
  startOptions: Array<{
    key: string;
    startAt: string;
    endAt: string;
    description: string | null;
  }>;
  presetTags: Array<{
    id: number;
    label: string;
    description: string;
  }>;
  defaultSelection: {
    sourcePrId: number;
    locationId: string;
    startAt: string;
  } | null;
}

export async function getAnchorEventFormModeData(
  eventId: AnchorEventId,
): Promise<AnchorEventFormModeData> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const locationIds = await resolveLocationIds(event);
  const routePool = resolveEventRoutePool(event);
  const [pois, tags, visiblePrRecords] = await Promise.all([
    findPoisByNames(locationIds),
    preferenceTagRepo.findByAnchorEventIdAndStatuses(eventId, ["PUBLISHED"]),
    eventContextRepo.findVisibleByAnchorEventId(eventId),
  ]);

  const now = new Date();
  const poiRecordById = new Map(pois.map((poi) => [poi.name, poi]));
  const startOptions = listAnchorEventTimeWindowDetails(event)
    .filter((detail) => !hasTimeWindowStarted(detail.timeWindow, now))
    .flatMap((detail) => {
      const [startAt, endAt] = detail.timeWindow;
      if (!startAt || !endAt) {
        return [];
      }
      return [
        {
          key: detail.key,
          startAt,
          endAt,
          description: detail.description,
        },
      ];
    });
  const startOptionByKey = new Map(
    startOptions.map((option) => [
      option.key,
      [option.startAt, option.endAt] as [string | null, string | null],
    ]),
  );
  const locationPlaceOptions = locationIds.map((id) => {
    const poi = poiRecordById.get(id) ?? null;
    const availableStartKeys = startOptions
      .filter((option) => {
        const timeWindow = startOptionByKey.get(option.key);
        return (
          !poi ||
          poi.availabilityRules.length === 0 ||
          (timeWindow !== undefined &&
            isTimeWindowAvailableByPoiRules(poi.availabilityRules, timeWindow))
        );
      })
      .map((option) => option.key);

    return toAnchorEventLocationPlaceOptionView({
      locationId: id,
      poi,
      availableStartKeys,
      remainingQuota: null,
      disabled: false,
      disabledReason: "NONE",
    });
  });
  const routePlaceOptions = routePool.map((entry) =>
    toAnchorEventRoutePlaceOptionView({
      routePoolEntryId: entry.id,
      route: entry.route,
      availableStartKeys: startOptions.map((option) => option.key),
      disabled: false,
      disabledReason: "NONE",
    }),
  );

  return {
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      description: event.description,
      durationMinutes: event.timePoolConfig.durationMinutes,
      earliestLeadMinutes: event.timePoolConfig.earliestLeadMinutes,
      defaultMinPartners: event.defaultMinPartners,
      defaultMaxPartners: event.defaultMaxPartners,
      prCreationPolicy: event.prCreationPolicy,
      prTimeWindowEditorDefaultMode: event.prTimeWindowEditorDefaultMode,
      canUserCreatePR: canUserCreatePRForAnchorEvent(event),
    },
    locations: locationPlaceOptions.map((option) => ({
      id: option.locationId,
      gallery: [...option.gallery],
      availableStartKeys: [...(option.availableStartKeys ?? [])],
    })),
    routes: routePlaceOptions.map((option) => ({
      id: option.routePoolEntryId,
      route: option.route,
      availableStartKeys: [...(option.availableStartKeys ?? [])],
    })),
    placeSelector: buildAnchorEventPlaceSelectorView({
      locationOptions: locationPlaceOptions,
      routeOptions: routePlaceOptions,
    }),
    startOptions,
    presetTags: tags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      description: tag.description,
    })),
    defaultSelection: resolveDefaultSelection(event, visiblePrRecords, now),
  };
}
