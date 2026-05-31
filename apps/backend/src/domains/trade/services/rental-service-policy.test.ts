import { describe, expect, test } from "vitest";
import { validateRentalServicePolicyAvailability } from "./rental-service-policy";
import type { RentalServicePolicy } from "../../merchandising";

const basePolicy: RentalServicePolicy = {
  type: "RENTAL",
  bookingLeadTimeMinutes: 0,
  serviceWindow: {
    weekdays: [3],
    startTime: "10:00",
    endTime: "22:30",
  },
  requiresContactPhone: true,
  requiresRealName: true,
  requiresNationalId: false,
};

describe("validateRentalServicePolicyAvailability", () => {
  test("accepts service time inside the rental service window", () => {
    expect(
      validateRentalServicePolicyAvailability({
        servicePolicy: basePolicy,
        serviceStartAt: "2031-01-01T10:00:00.000Z",
        serviceEndAt: "2031-01-01T12:00:00.000Z",
        now: new Date("2030-12-30T10:00:00.000Z"),
      }),
    ).toBeNull();
  });

  test("rejects service dates outside allowed weekdays", () => {
    expect(
      validateRentalServicePolicyAvailability({
        servicePolicy: basePolicy,
        serviceStartAt: "2031-01-02T10:00:00.000Z",
        serviceEndAt: "2031-01-02T12:00:00.000Z",
        now: new Date("2030-12-30T10:00:00.000Z"),
      }),
    ).toBe("预约时间不在商品可服务日期内");
  });

  test("rejects service times outside daily window", () => {
    expect(
      validateRentalServicePolicyAvailability({
        servicePolicy: basePolicy,
        serviceStartAt: "2031-01-01T09:59:00.000Z",
        serviceEndAt: "2031-01-01T12:00:00.000Z",
        now: new Date("2030-12-30T10:00:00.000Z"),
      }),
    ).toBe("预约时间不在商品可服务时段内");
  });

  test("rejects bookings inside product lead time", () => {
    expect(
      validateRentalServicePolicyAvailability({
        servicePolicy: {
          ...basePolicy,
          bookingLeadTimeMinutes: 24 * 60,
        },
        serviceStartAt: "2031-01-01T10:00:00.000Z",
        serviceEndAt: "2031-01-01T12:00:00.000Z",
        now: new Date("2030-12-31T12:00:00.000Z"),
      }),
    ).toBe("预约时间未满足商品提前预订要求");
  });
});
