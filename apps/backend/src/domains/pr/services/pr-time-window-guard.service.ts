import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerRequestFields } from "../../../entities/partner-request";
import { getTimeWindowStart } from "./time-window.service";

export const PR_START_TIME_PASSED_CODE = "PR_START_TIME_PASSED";

export const assertPRStartTimeHasNotPassed = (
  timeWindow: PartnerRequestFields["time"],
  now: Date = new Date(),
): void => {
  const startAt = getTimeWindowStart(timeWindow);
  if (!startAt) {
    return;
  }

  if (startAt.getTime() <= now.getTime()) {
    return throwHttpProblem({
      status: 400,
      detail: "PR start time has already passed",
      code: PR_START_TIME_PASSED_CODE,
    });
  }
};
