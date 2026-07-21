import type { RideHailingDispatchBindingSnapshot } from "./ride-hailing-order";

export type CreateOrderAttemptStatus = "PREPARED" | "SUBMITTING" | "SUCCEEDED" | "FAILED";

export type OrderingActionProblem = {
  type: string;
  code: string;
  title: string;
  detail: string;
};

export type CreateOrderCommandResult =
  | {
      outcome: "CREATED";
      attemptId: string;
      orderId: string;
      billId?: string | null;
    }
  | {
      outcome: "PROCESSING";
      attemptId: string;
      orderId: string;
    }
  | {
      outcome: "CANCELLED";
      attemptId: string;
      orderId: string;
      reason: OrderingActionProblem;
    };

export type RideHailingCreateDispatchSeed = Omit<
  RideHailingDispatchBindingSnapshot,
  "providerOrderId" | "providerSnapshot"
>;
