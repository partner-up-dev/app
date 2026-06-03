import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { givenAdminUser } from "../pr-core/_kit/builders/users";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import type { RideHailingProviderInstanceId } from "../../src/entities/ride-hailing-provider";

const providerRepo = new RideHailingProviderInstanceRepository();

type AdminRideHailingProviderInstanceResponse = {
  id: string;
  providerType: "CAOCAO";
  instanceKey: string;
  status: "ACTIVE" | "DISABLED";
  displayName: string;
  callbackUrl: string | null;
  config: {
    adapterMode: "CAOCAO_OPEN_API";
    caocaoClientId: string;
    endpointBaseUrl: string;
    callbackBaseUrl?: string | null;
    requestTimeoutMs?: number | null;
    signKeyConfigured: boolean;
    signKey?: string;
  };
};

type AdminRideHailingProviderWorkspaceResponse = {
  providerInstances: AdminRideHailingProviderInstanceResponse[];
};

const buildProviderPayload = (instanceKey: string, signKey: string | null) => ({
  providerType: "CAOCAO",
  instanceKey,
  displayName: "Scenario Caocao Admin",
  status: "ACTIVE",
  config: {
    adapterMode: "CAOCAO_OPEN_API",
    caocaoClientId: "scenario-caocao-admin-client",
    signKey,
    endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
    callbackBaseUrl: "https://api.partner-up.test",
    requestTimeoutMs: 5000,
  },
});

scenario(
  "admin_ride_hailing_provider_instance_create_list_update_preserves_secret",
  async () => {
    const admin = await givenAdminUser("ride-hailing-provider-admin");
    const instanceKey = `scenario-caocao-admin-${randomUUID()}`;

    const createResponse = await requestJson(
      "/api/admin/ride-hailing/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload(instanceKey, "scenario-caocao-secret"),
      },
    );
    const created =
      await expectJsonResponse<AdminRideHailingProviderInstanceResponse>(
        createResponse,
        200,
      );

    assert.equal(created.providerType, "CAOCAO");
    assert.equal(created.instanceKey, instanceKey);
    assert.equal(created.config.signKeyConfigured, true);
    assert.equal("signKey" in created.config, false);
    assert.equal(
      created.callbackUrl,
      `https://api.partner-up.test/api/ride-hailing/caocao/${created.id}/callback/order-status`,
    );

    const workspaceResponse = await requestJson(
      "/api/admin/ride-hailing/provider-instances/workspace",
      {
        method: "GET",
        token: admin.token,
      },
    );
    const workspace =
      await expectJsonResponse<AdminRideHailingProviderWorkspaceResponse>(
        workspaceResponse,
        200,
      );
    const listed = workspace.providerInstances.find(
      (providerInstance) => providerInstance.id === created.id,
    );
    assert.ok(listed);
    assert.equal("signKey" in listed.config, false);

    const updateResponse = await requestJson(
      `/api/admin/ride-hailing/provider-instances/${created.id}`,
      {
        method: "PATCH",
        token: admin.token,
        body: {
          ...buildProviderPayload(instanceKey, ""),
          displayName: "Scenario Caocao Admin Updated",
          status: "DISABLED",
          config: {
            ...buildProviderPayload(instanceKey, "").config,
            caocaoClientId: "scenario-caocao-admin-client-updated",
          },
        },
      },
    );
    const updated =
      await expectJsonResponse<AdminRideHailingProviderInstanceResponse>(
        updateResponse,
        200,
      );

    assert.equal(updated.displayName, "Scenario Caocao Admin Updated");
    assert.equal(updated.status, "DISABLED");
    assert.equal(updated.config.caocaoClientId, "scenario-caocao-admin-client-updated");
    assert.equal("signKey" in updated.config, false);

    const stored = await providerRepo.findById(
      created.id as RideHailingProviderInstanceId,
    );
    assert.ok(stored);
    assert.equal(stored.config.signKey, "scenario-caocao-secret");
  },
);
