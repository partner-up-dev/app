import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import {
  createCaocaoSignature,
  encodeCaocaoExternalOrderId,
} from "../../src/domains/ride-hailing";

const providerRepo = new RideHailingProviderInstanceRepository();

const orderId = "123e4567-e89b-12d3-a456-426614174000";

const buildCallbackForm = (input: {
  signKey: string;
  providerOrderId?: string;
}): URLSearchParams => {
  const unsigned = {
    timestamp: "1700000000000",
    order_id: input.providerOrderId ?? "CC123456",
    ext_order_id: encodeCaocaoExternalOrderId(orderId),
    event: "20",
  };
  return new URLSearchParams({
    ...unsigned,
    sign: createCaocaoSignature({
      params: unsigned,
      signKey: input.signKey,
    }),
  });
};

scenario("legacy Caocao callback alias resolves the first active provider instance", async () => {
  await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: "scenario-caocao-first",
    status: "ACTIVE",
    displayName: "Scenario Caocao First",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-client-first",
      signKey: "scenario-caocao-secret-first",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
    createdAt: new Date("2031-01-01T00:00:00.000Z"),
    updatedAt: new Date("2031-01-01T00:00:00.000Z"),
  });
  await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: "scenario-caocao-second",
    status: "ACTIVE",
    displayName: "Scenario Caocao Second",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-client-second",
      signKey: "scenario-caocao-secret-second",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
    createdAt: new Date("2031-01-01T00:01:00.000Z"),
    updatedAt: new Date("2031-01-01T00:01:00.000Z"),
  });

  const validResponse = await requestJson(
    "/api/v1/service_provider/caocao/callback/order",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildCallbackForm({
        signKey: "scenario-caocao-secret-first",
      }).toString(),
    },
  );

  const validBody = await expectJsonResponse<{
    code: "SUCCESS";
    message: string;
  }>(validResponse, 200);
  assert.equal(validBody.code, "SUCCESS");

  const wrongInstanceResponse = await requestJson(
    "/api/v1/service_provider/caocao/callback/order",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildCallbackForm({
        signKey: "scenario-caocao-secret-second",
        providerOrderId: "CC654321",
      }).toString(),
    },
  );

  assert.equal(wrongInstanceResponse.status, 400);
});
