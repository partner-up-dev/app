import { throwHttpProblem } from "../../../lib/problem-details";

export const validateAdminPRTimeWindow = (timeWindow: [string | null, string | null]): void => {
  const start = timeWindow[0] === null ? null : Date.parse(timeWindow[0]);
  const end = timeWindow[1] === null ? null : Date.parse(timeWindow[1]);
  if (
    (start !== null && !Number.isFinite(start)) ||
    (end !== null && !Number.isFinite(end)) ||
    (start !== null && end !== null && start >= end)
  ) {
    return throwHttpProblem({ status: 400, detail: "PR time window is invalid" });
  }
};
