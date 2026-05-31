import type { RentalServicePolicy } from "../../merchandising";

const MINUTES_PER_DAY = 24 * 60;

export const defaultRentalServiceWindow = (): NonNullable<
  RentalServicePolicy["serviceWindow"]
> => ({
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startTime: "00:00",
  endTime: "23:59",
});

const parseTimeOfDay = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const minuteOfUtcDay = (value: Date): number =>
  value.getUTCHours() * 60 + value.getUTCMinutes();

const isWithinDailyWindow = (input: {
  startMinute: number;
  endMinute: number;
  windowStartMinute: number;
  windowEndMinute: number;
}): boolean => {
  if (input.windowStartMinute > input.windowEndMinute) return false;
  return (
    input.startMinute >= input.windowStartMinute &&
    input.endMinute <= input.windowEndMinute
  );
};

export function validateRentalServicePolicyAvailability(input: {
  servicePolicy: RentalServicePolicy;
  serviceStartAt: string;
  serviceEndAt: string;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  const serviceStartAt = new Date(input.serviceStartAt);
  const serviceEndAt = new Date(input.serviceEndAt);
  if (
    Number.isNaN(serviceStartAt.getTime()) ||
    Number.isNaN(serviceEndAt.getTime()) ||
    serviceEndAt <= serviceStartAt
  ) {
    return "预约时间无效";
  }

  const leadTimeMs =
    input.servicePolicy.bookingLeadTimeMinutes * 60 * 1000;
  if (serviceStartAt.getTime() - now.getTime() < leadTimeMs) {
    return "预约时间未满足商品提前预订要求";
  }

  const serviceWindow =
    input.servicePolicy.serviceWindow ?? defaultRentalServiceWindow();
  if (!serviceWindow.weekdays.includes(serviceStartAt.getUTCDay())) {
    return "预约时间不在商品可服务日期内";
  }

  const windowStartMinute = parseTimeOfDay(serviceWindow.startTime);
  const windowEndMinute = parseTimeOfDay(serviceWindow.endTime);
  if (windowStartMinute === null || windowEndMinute === null) {
    return "商品服务时间窗配置无效";
  }

  if (serviceStartAt.toISOString().slice(0, 10) !== serviceEndAt.toISOString().slice(0, 10)) {
    return "预约时间不在商品可服务时段内";
  }

  if (
    !isWithinDailyWindow({
      startMinute: minuteOfUtcDay(serviceStartAt),
      endMinute: Math.min(minuteOfUtcDay(serviceEndAt), MINUTES_PER_DAY - 1),
      windowStartMinute,
      windowEndMinute,
    })
  ) {
    return "预约时间不在商品可服务时段内";
  }

  return null;
}
