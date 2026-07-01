import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import {
  caocaoCallbackRoutingTokenMatchesCurrent,
  createRideHailingProviderPort,
  parseCaocaoCallbackInfo,
} from "../services";
import type { CaocaoOrderStatusCallback } from "../model";
import {
  RideHailingProviderSyncQueryError,
  syncRideHailingOrderWithProvider,
} from "./sync-ride-hailing-order-with-provider";

const providerRepo = new RideHailingProviderInstanceRepository();

export type CaocaoOrderStatusCallbackAck = {
  code: 200;
  success: true;
};

const readString = (value: Record<string, string>, keys: string[]): string | null => {
  for (const key of keys) {
    const candidate = value[key];
    if (candidate && candidate.trim().length > 0) return candidate;
  }
  return null;
};

async function loadActiveCaocaoProviderInstance(
  providerInstanceId: string,
): Promise<RideHailingProviderInstance> {
  const providerInstance = await providerRepo.findById(
    providerInstanceId as RideHailingProviderInstanceId,
  );
  if (
    !providerInstance ||
    providerInstance.status !== "ACTIVE" ||
    providerInstance.providerType !== "CAOCAO"
  ) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao provider instance not found",
    });
  }

  return providerInstance;
}

async function loadFirstActiveCaocaoProviderInstance(): Promise<RideHailingProviderInstance> {
  const providerInstance = await providerRepo.findFirstActiveByProviderType({
    providerType: "CAOCAO",
  });
  if (!providerInstance) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao provider instance not found",
    });
  }

  return providerInstance;
}

const readCallbackInfoRoute = (form: Record<string, string>) => {
  const callbackInfo = readString(form, ["callback_info", "callbackInfo"]);
  if (!callbackInfo) return null;
  const route = parseCaocaoCallbackInfo(callbackInfo);
  if (!route) {
    return throwHttpProblem({
      status: 400,
      detail: "Caocao callback_info is invalid",
    });
  }
  return route;
};

async function loadCaocaoProviderInstanceFromCallbackInfo(
  form: Record<string, string>,
): Promise<RideHailingProviderInstance | null> {
  const route = readCallbackInfoRoute(form);
  if (!route) return null;
  if (!caocaoCallbackRoutingTokenMatchesCurrent(route.routingToken)) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao callback_info does not belong to this backend environment",
    });
  }
  return loadActiveCaocaoProviderInstance(route.providerInstanceId);
}

const assertCallbackInfoMatchesProviderInstance = (input: {
  form: Record<string, string>;
  providerInstance: RideHailingProviderInstance;
}): void => {
  const route = readCallbackInfoRoute(input.form);
  if (!route) return;
  if (!caocaoCallbackRoutingTokenMatchesCurrent(route.routingToken)) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao callback_info does not belong to this backend environment",
    });
  }
  if (route.providerInstanceId !== input.providerInstance.id) {
    return throwHttpProblem({
      status: 409,
      detail: "Caocao callback_info provider instance does not match callback route",
    });
  }
};

async function applyCaocaoCallbackWithProviderInstance(input: {
  providerInstance: RideHailingProviderInstance;
  form: Record<string, string>;
}): Promise<CaocaoOrderStatusCallbackAck> {
  assertCallbackInfoMatchesProviderInstance({
    form: input.form,
    providerInstance: input.providerInstance,
  });

  const port = createRideHailingProviderPort({
    providerInstance: input.providerInstance,
  });

  let parsed: CaocaoOrderStatusCallback;
  try {
    parsed = port.parseOrderStatusCallback(input.form);
  } catch (error) {
    if (error instanceof Error) {
      return throwHttpProblem({
        status: 400,
        detail: error.message,
      });
    }
    throw error;
  }
  if (!parsed.localOrderId) {
    return throwHttpProblem({
      status: 400,
      detail: "Caocao callback ext_order_id is not a ride-hailing order id",
    });
  }

  try {
    await syncRideHailingOrderWithProvider({
      orderId: parsed.localOrderId as TradeOrderId,
      expectedProviderInstanceId: input.providerInstance.id,
      expectedProviderOrderId: parsed.providerOrderId,
      trigger: "CAOCAO_CALLBACK",
    });
  } catch (error) {
    if (error instanceof RideHailingProviderSyncQueryError) {
      return throwHttpProblem({
        status: 503,
        detail: "RideHailing provider detail query failed for Caocao callback",
        code: "RIDE_HAILING_PROVIDER_DETAIL_QUERY_FAILED",
      });
    }
    throw error;
  }

  return {
    code: 200,
    success: true,
  };
}

export async function handleCaocaoOrderStatusCallback(input: {
  providerInstanceId: string;
  form: Record<string, string>;
}): Promise<CaocaoOrderStatusCallbackAck> {
  return applyCaocaoCallbackWithProviderInstance({
    providerInstance: await loadActiveCaocaoProviderInstance(input.providerInstanceId),
    form: input.form,
  });
}

export async function handleLegacyCaocaoOrderStatusCallback(input: {
  form: Record<string, string>;
}): Promise<CaocaoOrderStatusCallbackAck> {
  return applyCaocaoCallbackWithProviderInstance({
    providerInstance:
      (await loadCaocaoProviderInstanceFromCallbackInfo(input.form)) ??
      (await loadFirstActiveCaocaoProviderInstance()),
    form: input.form,
  });
}
