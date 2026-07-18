import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerRequestFields, PRRoute } from "../../../entities/partner-request";

export const PR_PLACE_MODE_CONFLICT_CODE = "PR_PLACE_MODE_CONFLICT";
const ROUTE_SUMMARY_MAX_LENGTH = 16;
const ROUTE_SUMMARY_SEPARATOR = "~";

const normalizeWhitespace = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const truncateToLength = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 1) {
    return value.slice(0, Math.max(0, maxLength));
  }
  return `${value.slice(0, maxLength - 1)}…`;
};

export const buildPRRouteSummary = (route: PRRoute | null | undefined): string | null => {
  if (!route || route.length < 2) {
    return null;
  }

  const startName = normalizeWhitespace(route[0]?.name);
  const endName = normalizeWhitespace(route[route.length - 1]?.name);
  if (startName.length === 0 || endName.length === 0) {
    return null;
  }

  const availableLength = ROUTE_SUMMARY_MAX_LENGTH - ROUTE_SUMMARY_SEPARATOR.length;
  let startBudget = Math.min(startName.length, Math.ceil(availableLength / 2));
  let endBudget = Math.min(endName.length, availableLength - startBudget);
  startBudget = Math.min(startName.length, availableLength - endBudget);

  return [truncateToLength(startName, startBudget), truncateToLength(endName, endBudget)].join(
    ROUTE_SUMMARY_SEPARATOR,
  );
};

export const resolvePRPlaceDisplayName = (input: {
  location: string | null;
  route: PRRoute | null | undefined;
}): string | null => {
  const routeSummary = buildPRRouteSummary(input.route);
  if (routeSummary) {
    return routeSummary;
  }

  const location = normalizeWhitespace(input.location);
  return location.length > 0 ? location : null;
};

export const assertPRPlaceModeValid = (input: {
  location: string | null;
  route: PRRoute | null | undefined;
}): void => {
  const location = normalizeWhitespace(input.location);
  if (location.length === 0 || !input.route) {
    return;
  }

  return throwHttpProblem({
    status: 400,
    detail: "PartnerRequest must use either location or route",
    code: PR_PLACE_MODE_CONFLICT_CODE,
  });
};

export const normalizePartnerRequestFieldsForPersistence = (
  fields: PartnerRequestFields,
): PartnerRequestFields => {
  assertPRPlaceModeValid(fields);

  if (!fields.route) {
    return {
      ...fields,
      route: null,
    };
  }

  return {
    ...fields,
    location: null,
    route: fields.route,
  };
};
