import type { PRFormFields } from "@/domains/pr/model/types";
import { clonePRRoute } from "@/domains/pr/model/pr-route";

export const clonePRFields = (fields: PRFormFields): PRFormFields => ({
  title: fields.title,
  type: fields.type,
  time: [fields.time[0], fields.time[1]],
  location: fields.location,
  route: clonePRRoute(fields.route),
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  budget: fields.budget,
  preferences: [...fields.preferences],
  notes: fields.notes,
  meetingPoint: fields.meetingPoint
    ? {
        description: fields.meetingPoint.description,
        imageUrl: fields.meetingPoint.imageUrl,
      }
    : fields.meetingPoint,
});

export const parseNullableNumber = (value: string): number | null => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
