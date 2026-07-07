import type { PRStatus } from "@partner-up-dev/backend";

export type PRDisplayStatus = PRStatus | "FULL";

type PRCapacitySnapshot = {
  current: number;
  max: number | null;
};

export const resolvePRDisplayStatus = (
  status: PRStatus,
  capacity: PRCapacitySnapshot | null | undefined,
): PRDisplayStatus => {
  if (
    status === "OPEN" &&
    capacity?.max !== null &&
    capacity?.max !== undefined &&
    capacity.current >= capacity.max
  ) {
    return "FULL";
  }

  return status;
};
