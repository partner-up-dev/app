import type { PRStatus } from "@partner-up-dev/backend";

type PRCapacitySnapshot = {
  current: number;
  max: number | null;
};

export const resolvePRDisplayStatus = (
  status: PRStatus,
  capacity: PRCapacitySnapshot | null | undefined,
): PRStatus => {
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
