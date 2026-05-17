import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { normalizePRRouteForSubmit } from "@/domains/pr/model/pr-route";

type CanonicalPRDetailView = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type PRDetailView = CanonicalPRDetailView;
export type PRPartnerSectionView = CanonicalPRDetailView["partnerSection"];

export type PRBookingSupportView = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;

export type PRSearchView = InferResponseType<
  (typeof client.api.pr)["search"]["$get"]
>;

export type PRSearchResult = PRSearchView["results"][number];

export type PRFormFields = Omit<PartnerRequestFields, "budget"> & {
  budget?: PartnerRequestFields["budget"];
};
export type PRUserUpdateContentFields = Omit<PartnerRequestFields, "type">;

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const normalizePRPlaceFieldsForSubmit = (
  fields: Pick<PRFormFields, "location" | "route">,
): Pick<PartnerRequestFields, "location" | "route"> => {
  const route = normalizePRRouteForSubmit(fields.route);
  if (route) {
    return {
      location: null,
      route,
    };
  }

  return {
    location: normalizeNullableText(fields.location),
    route: null,
  };
};

const cloneTimeWindow = (
  time: PartnerRequestFields["time"],
): PartnerRequestFields["time"] => [time[0], time[1]];

export const toPartnerRequestFields = (
  fields: PRFormFields,
): PartnerRequestFields => {
  const placeFields = normalizePRPlaceFieldsForSubmit(fields);
  return {
    title: fields.title,
    type: fields.type,
    time: cloneTimeWindow(fields.time),
    location: placeFields.location,
    route: placeFields.route,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    partners: [...fields.partners],
    budget: fields.budget ?? null,
    preferences: [...fields.preferences],
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
  };
};

export const toUserUpdatePRContentFields = (
  fields: PRFormFields,
): PRUserUpdateContentFields => {
  const placeFields = normalizePRPlaceFieldsForSubmit(fields);
  return {
    title: fields.title,
    time: cloneTimeWindow(fields.time),
    location: placeFields.location,
    route: placeFields.route,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    partners: [...fields.partners],
    budget: fields.budget ?? null,
    preferences: [...fields.preferences],
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
  };
};
