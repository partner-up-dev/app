import { throwHttpProblem } from "../../../lib/problem-details";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { PRTypePreferenceTagRepository } from "../../../repositories/PRTypePreferenceTagRepository";
import {
  isPRActiveStatus,
  isPRJoinableStatus,
  isTimeWindowAvailableByPoiRules,
  readVisiblePartnerRequestsByType,
} from "../../pr/queries";
import {
  getPRTypeConfigAuthoringPolicy,
  type PRTypeConfigAuthoringPolicy,
} from "../../pr-type-config";
import type { PRAuthoringOptions } from "../contracts";
import {
  buildPRAuthoringLocationOptions,
  buildPRAuthoringRouteOptions,
} from "../services/place-options";
import { listPRAuthoringStartOptions } from "../services/time-window-pool";

const tagRepo = new PRTypePreferenceTagRepository();
const poiRepo = new PoiRepository();
const MINUTE_MS = 60_000;

type StartOptionBase = ReturnType<typeof listPRAuthoringStartOptions>[number];

const buildAvailableStartKeysByLocation = (input: {
  locations: readonly string[];
  pois: Awaited<ReturnType<PoiRepository["findByNames"]>>;
  startOptions: readonly StartOptionBase[];
}): Map<string, string[]> => {
  const poiByName = new Map(input.pois.map((poi) => [poi.name, poi]));
  return new Map(
    input.locations.map((location) => {
      const poi = poiByName.get(location);
      const availableStartKeys = input.startOptions
        .filter(
          (option) =>
            !poi ||
            poi.availabilityRules.length === 0 ||
            isTimeWindowAvailableByPoiRules(poi.availabilityRules, [option.startAt, option.endAt]),
        )
        .map((option) => option.key);
      return [location, availableStartKeys];
    }),
  );
};

const resolveDefaultSelection = (input: {
  requests: Awaited<ReturnType<typeof readVisiblePartnerRequestsByType>>;
  timePoolConfig: PRTypeConfigAuthoringPolicy["timePoolConfig"];
  now: Date;
}): PRAuthoringOptions["defaultSelection"] => {
  const selected = input.requests
    .flatMap((request) => {
      const locationId = request.location?.trim() ?? "";
      const rawStartAt = request.time[0];
      const startTimestamp = rawStartAt ? Date.parse(rawStartAt) : Number.NaN;
      const exceedsLeadBoundary =
        input.timePoolConfig.earliestLeadMinutes !== null &&
        startTimestamp > input.now.getTime() + input.timePoolConfig.earliestLeadMinutes * MINUTE_MS;
      if (
        !locationId ||
        !Number.isFinite(startTimestamp) ||
        startTimestamp <= input.now.getTime() ||
        exceedsLeadBoundary ||
        !isPRJoinableStatus(request.status)
      ) {
        return [];
      }
      return [
        {
          request,
          locationId,
          startAt: new Date(startTimestamp).toISOString(),
          startTimestamp,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.startTimestamp - right.startTimestamp ||
        right.request.createdAt.getTime() - left.request.createdAt.getTime(),
    )[0];
  return selected
    ? {
        sourcePrId: selected.request.id,
        locationId: selected.locationId,
        startAt: selected.startAt,
      }
    : null;
};

export const normalizePRAuthoringType = (value: string): string => {
  const type = value.trim();
  if (!type) {
    return throwHttpProblem({
      status: 400,
      detail: "type is required",
      code: "PR_AUTHORING_TYPE_REQUIRED",
    });
  }
  return type;
};

export const getPRAuthoringOptions = async (
  rawType: string,
  now = new Date(),
): Promise<PRAuthoringOptions> => {
  const type = normalizePRAuthoringType(rawType);
  const config = await getPRTypeConfigAuthoringPolicy(type);
  if (!config) {
    return {
      type,
      creationAllowed: true,
      durationMinutes: null,
      earliestLeadMinutes: null,
      timeWindowEditorDefaultMode: "NORMAL",
      authoringDefaults: { minPartners: 2, maxPartners: null, notes: null },
      startOptions: [],
      locationOptions: [],
      routeOptions: [],
      preferenceTags: [],
      defaultSelection: null,
    };
  }

  const baseStartOptions = listPRAuthoringStartOptions(config, now);
  const [pois, tags, visibleRequests] = await Promise.all([
    poiRepo.findByNames(config.locationPool),
    tagRepo.findByTypeAndStatuses(type, ["PUBLISHED"]),
    readVisiblePartnerRequestsByType(type),
  ]);
  const availableStartKeysByLocation = buildAvailableStartKeysByLocation({
    locations: config.locationPool,
    pois,
    startOptions: baseStartOptions,
  });
  const routeOptions = buildPRAuthoringRouteOptions({
    routes: config.routePool,
    availableStartKeys: baseStartOptions.map((option) => option.key),
  });
  const locationIds = new Set(config.locationPool);
  const activeCountByStartAndLocation = new Map<string, number>();
  for (const request of visibleRequests) {
    const location = request.location?.trim() ?? "";
    if (!locationIds.has(location) || !isPRActiveStatus(request.status)) continue;
    const key = `${request.time[0] ?? "_"}::${request.time[1] ?? "_"}::${location}`;
    activeCountByStartAndLocation.set(key, (activeCountByStartAndLocation.get(key) ?? 0) + 1);
  }
  const poiByName = new Map(pois.map((poi) => [poi.name, poi]));
  const locationOptions = buildPRAuthoringLocationOptions({
    locations: config.locationPool,
    pois,
    availableStartKeysByLocation,
  });
  const startOptions = baseStartOptions.map((option) => {
    const availabilityByLocation = new Map(
      config.locationPool.map((location) => {
        const poi = poiByName.get(location);
        const activeCount =
          activeCountByStartAndLocation.get(`${option.startAt}::${option.endAt}::${location}`) ?? 0;
        const remainingQuota =
          poi?.perTimeWindowCap == null ? null : Math.max(poi.perTimeWindowCap - activeCount, 0);
        const timeAvailable =
          availableStartKeysByLocation.get(location)?.includes(option.key) ?? false;
        const disabled = !timeAvailable || (remainingQuota !== null && remainingQuota <= 0);
        return [
          location,
          {
            remainingQuota,
            disabled,
            disabledReason: !timeAvailable
              ? ("TIME_UNAVAILABLE" as const)
              : disabled
                ? ("MAX_REACHED" as const)
                : ("NONE" as const),
          },
        ] as const;
      }),
    );
    return {
      ...option,
      locationOptions: buildPRAuthoringLocationOptions({
        locations: config.locationPool,
        pois,
        availableStartKeysByLocation,
        availabilityByLocation,
      }),
      routeOptions,
    };
  });
  return {
    type: config.type,
    creationAllowed: config.authoringCreationPolicy === "USER_AND_ADMIN",
    durationMinutes: config.timePoolConfig.durationMinutes,
    earliestLeadMinutes: config.timePoolConfig.earliestLeadMinutes,
    timeWindowEditorDefaultMode: config.timeWindowEditorDefaultMode,
    authoringDefaults: {
      minPartners: config.defaultMinPartners,
      maxPartners: config.defaultMaxPartners,
      notes: config.defaultNotes,
    },
    startOptions,
    locationOptions,
    routeOptions,
    preferenceTags: tags
      .filter((tag) => tag.moderationStatus === "PUBLISHED")
      .map((tag) => ({ label: tag.label, description: tag.description })),
    defaultSelection: resolveDefaultSelection({
      requests: visibleRequests,
      timePoolConfig: config.timePoolConfig,
      now,
    }),
  };
};
