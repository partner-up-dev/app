import { throwHttpProblem } from "../../../lib/problem-details";
import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
import type { RideHailingProviderPort } from "../model";
import { CaocaoProviderAdapter } from "./caocao-provider";

export function createRideHailingProviderPort(input: {
  providerInstance: RideHailingProviderInstance;
  fetchImpl?: typeof fetch;
}): RideHailingProviderPort {
  if (input.providerInstance.providerType === "CAOCAO") {
    return new CaocaoProviderAdapter(input);
  }

  return throwHttpProblem({
    status: 409,
    detail: "Unsupported ride-hailing provider instance",
  });
}
