import type { TradeOrder } from "./order";

export type RentalRegistrant = {
  name: string;
  phone?: string | null;
  nationalIdMasked?: string | null;
};

export type RentalOrder = Omit<TradeOrder, "family"> & {
  family: "RENTAL";
  selectedZoneCodes: string[];
  serviceStartAt: string;
  serviceEndAt: string;
  participantCount: number;
  contactPhone: string;
  registrants: RentalRegistrant[];
};
