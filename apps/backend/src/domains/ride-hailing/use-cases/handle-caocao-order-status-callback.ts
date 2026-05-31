import {
  type RideHailingProviderInstance,
  type RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { createRideHailingProviderPort } from "../services";

const providerRepo = new RideHailingProviderInstanceRepository();

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

async function loadFirstActiveCaocaoProviderInstance(): Promise<
  RideHailingProviderInstance
> {
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

function parseCaocaoCallbackWithProviderInstance(input: {
  providerInstance: RideHailingProviderInstance;
  form: Record<string, string>;
}): { code: "SUCCESS"; message: string } {
  const port = createRideHailingProviderPort({
    providerInstance: input.providerInstance,
  });

  try {
    const parsed = port.parseOrderStatusCallback(input.form);
    if (!parsed.localOrderId) {
      return throwHttpProblem({
        status: 400,
        detail: "Caocao callback ext_order_id is not a ride-hailing order id",
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return throwHttpProblem({
        status: 400,
        detail: error.message,
      });
    }
    throw error;
  }

  return {
    code: "SUCCESS",
    message: "成功",
  };
}

export async function handleCaocaoOrderStatusCallback(input: {
  providerInstanceId: string;
  form: Record<string, string>;
}): Promise<{ code: "SUCCESS"; message: string }> {
  return parseCaocaoCallbackWithProviderInstance({
    providerInstance: await loadActiveCaocaoProviderInstance(
      input.providerInstanceId,
    ),
    form: input.form,
  });
}

export async function handleLegacyCaocaoOrderStatusCallback(input: {
  form: Record<string, string>;
}): Promise<{ code: "SUCCESS"; message: string }> {
  return parseCaocaoCallbackWithProviderInstance({
    providerInstance: await loadFirstActiveCaocaoProviderInstance(),
    form: input.form,
  });
}
