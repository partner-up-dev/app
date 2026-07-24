import type { MeetingPointConfig } from "../../entities/meeting-point";
import type { PoiAvailabilityRule, PoiCoordinate, PoiStatus } from "../../entities/poi";
import type { UserId } from "../../entities/user";

export type AdminPoiSnapshot = {
  id: number;
  name: string;
  fullAddress: string | null;
  status: PoiStatus;
  gallery: string[];
  gcj02: PoiCoordinate | null;
  wgs84: PoiCoordinate | null;
  bd09: PoiCoordinate | null;
  perTimeWindowCap: number | null;
  availabilityRules: PoiAvailabilityRule[];
  meetingPoint: MeetingPointConfig | null;
  submittedByUserId: UserId | null;
  reviewedByUserId: UserId | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPoiWriteInput = {
  name: string;
  fullAddress: string | null;
  gallery: string[];
  gcj02: PoiCoordinate | null;
  wgs84: PoiCoordinate | null;
  bd09: PoiCoordinate | null;
  perTimeWindowCap: number | null;
  availabilityRules?: PoiAvailabilityRule[];
  meetingPoint?: MeetingPointConfig | null;
};
