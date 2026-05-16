import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

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

const cloneTimeWindow = (
  time: PartnerRequestFields["time"],
): PartnerRequestFields["time"] => [time[0], time[1]];

export const toPartnerRequestFields = (
  fields: PRFormFields,
): PartnerRequestFields => ({
  title: fields.title,
  type: fields.type,
  time: cloneTimeWindow(fields.time),
  location: fields.location,
  route: fields.route ?? null,
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  budget: fields.budget ?? null,
  preferences: [...fields.preferences],
  notes: fields.notes,
  meetingPoint: fields.meetingPoint ?? null,
});

export const toUserUpdatePRContentFields = (
  fields: PRFormFields,
): PRUserUpdateContentFields => ({
  title: fields.title,
  time: cloneTimeWindow(fields.time),
  location: fields.location,
  route: fields.route ?? null,
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  budget: fields.budget ?? null,
  preferences: [...fields.preferences],
  notes: fields.notes,
  meetingPoint: fields.meetingPoint ?? null,
});
