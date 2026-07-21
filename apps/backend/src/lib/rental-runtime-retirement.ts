import { throwHttpProblem } from "./problem-details";

export const RENTAL_RUNTIME_RETIRED_CODE = "RENTAL_RUNTIME_RETIRED";

export const throwRentalRuntimeRetired = (): never =>
  throwHttpProblem({
    status: 410,
    code: RENTAL_RUNTIME_RETIRED_CODE,
    type: "https://partner-up.app/problems/commerce.rental-runtime-retired",
    detail: "Rental ordering and fulfillment are no longer available.",
  });
