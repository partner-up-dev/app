export type FakeCaocaoMovementCoordinate = {
  latitude: number;
  longitude: number;
};

export type FakeCaocaoMovementSnapshot = {
  coordinate: FakeCaocaoMovementCoordinate;
  headingDegrees: number;
  remainingDistanceMeters: number;
  remainingRoute: FakeCaocaoMovementCoordinate[];
};

const EARTH_RADIUS_METERS = 6_371_000;
const MINIMUM_SEGMENT_DISTANCE_METERS = 0.01;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const normalizeHeadingDegrees = (degrees: number): number => {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
};

export const distanceMeters = (
  from: FakeCaocaoMovementCoordinate,
  to: FakeCaocaoMovementCoordinate,
): number => {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const bearingDegrees = (
  from: FakeCaocaoMovementCoordinate,
  to: FakeCaocaoMovementCoordinate,
): number => {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return normalizeHeadingDegrees(toDegrees(Math.atan2(y, x)));
};

export const polylineLengthMeters = (route: readonly FakeCaocaoMovementCoordinate[]): number =>
  route.slice(1).reduce((total, point, index) => total + distanceMeters(route[index]!, point), 0);

const interpolateCoordinate = (
  from: FakeCaocaoMovementCoordinate,
  to: FakeCaocaoMovementCoordinate,
  ratio: number,
): FakeCaocaoMovementCoordinate => ({
  latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  longitude: from.longitude + (to.longitude - from.longitude) * ratio,
});

export const remainingRouteFromDistance = (
  route: readonly FakeCaocaoMovementCoordinate[],
  distanceAlongRouteMeters: number,
): FakeCaocaoMovementCoordinate[] => {
  const first = route[0];
  if (!first) return [];
  if (route.length === 1) return [first];

  const targetDistance = Math.max(0, distanceAlongRouteMeters);
  let consumedDistance = 0;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1]!;
    const current = route[index]!;
    const segmentDistance = distanceMeters(previous, current);
    if (segmentDistance <= MINIMUM_SEGMENT_DISTANCE_METERS) continue;

    const nextConsumedDistance = consumedDistance + segmentDistance;
    if (targetDistance <= nextConsumedDistance) {
      const segmentRatio = (targetDistance - consumedDistance) / segmentDistance;
      return [interpolateCoordinate(previous, current, segmentRatio), ...route.slice(index)];
    }
    consumedDistance = nextConsumedDistance;
  }

  return [route[route.length - 1]!];
};

export const movementSnapshotFromRoute = (input: {
  route: readonly FakeCaocaoMovementCoordinate[];
  distanceAlongRouteMeters?: number;
  fallbackHeadingDegrees?: number;
  progressRatio?: number;
}): FakeCaocaoMovementSnapshot => {
  const first = input.route[0];
  if (!first) {
    return {
      coordinate: { latitude: 0, longitude: 0 },
      headingDegrees: normalizeHeadingDegrees(input.fallbackHeadingDegrees ?? 0),
      remainingDistanceMeters: 0,
      remainingRoute: [],
    };
  }

  const totalDistance = polylineLengthMeters(input.route);
  const clampedProgressRatio = Math.min(Math.max(input.progressRatio ?? 0, 0), 1);
  const distanceAlongRouteMeters =
    input.distanceAlongRouteMeters ?? totalDistance * clampedProgressRatio;
  const remainingRoute = remainingRouteFromDistance(
    input.route,
    Math.min(Math.max(distanceAlongRouteMeters, 0), totalDistance),
  );
  const coordinate = remainingRoute[0] ?? first;
  const nextPoint = remainingRoute.find((point) => distanceMeters(coordinate, point) > 0.5);
  return {
    coordinate,
    headingDegrees: nextPoint
      ? bearingDegrees(coordinate, nextPoint)
      : normalizeHeadingDegrees(input.fallbackHeadingDegrees ?? 0),
    remainingDistanceMeters: polylineLengthMeters(remainingRoute),
    remainingRoute,
  };
};
