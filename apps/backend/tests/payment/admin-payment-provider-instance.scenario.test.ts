import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { givenAdminUser } from "../pr-core/_kit/builders/users";
import { PaymentProviderInstanceRepository } from "../../src/repositories/PaymentProviderInstanceRepository";
import type { PaymentProviderInstanceId } from "../../src/entities/payment";

const providerRepo = new PaymentProviderInstanceRepository();

type AdminPaymentProviderInstanceResponse = {
  id: string;
  providerType: "WECHAT_PAY";
  instanceKey: string;
  status: "ACTIVE" | "DISABLED";
  displayName: string;
  clientId: string;
  chargeNotifyUrl: string | null;
  refundNotifyUrl: string | null;
  config: {
    adapterMode: "WECHAT_PAY_API_V3";
    appId: string;
    mchId: string;
    chargeMode: "JSAPI" | "H5";
    endpointBaseUrl?: string | null;
    apiV3KeyConfigured: boolean;
    apiV3Key?: string;
    merchantCertificate: {
      serialNo: string;
      privateKeyPemConfigured: boolean;
      certificatePemConfigured: boolean;
      privateKeyPem?: string;
      certificatePem?: string;
    };
    platformCertificates: {
      count: number;
      items: Array<{
        serialNo: string;
        certificatePemConfigured: boolean;
        certificatePem?: string;
        effectiveTime?: string | null;
        expireTime?: string | null;
      }>;
    };
  };
};

type AdminPaymentProviderWorkspaceResponse = {
  providerInstances: AdminPaymentProviderInstanceResponse[];
};

const buildProviderPayload = (input: {
  instanceKey: string;
  clientId: string;
  apiV3Key: string | null;
  privateKeyPem: string | null;
  certificatePem: string | null;
}) => ({
  providerType: "WECHAT_PAY",
  instanceKey: input.instanceKey,
  displayName: "Scenario WeChatPay Admin",
  status: "ACTIVE",
  clientId: input.clientId,
  config: {
    adapterMode: "WECHAT_PAY_API_V3",
    appId: "wx-scenario-admin",
    mchId: "1900000001",
    chargeMode: "JSAPI",
    endpointBaseUrl: "https://api.mch.weixin.qq.com",
    apiV3Key: input.apiV3Key,
    merchantCertificate: {
      serialNo: "scenario-merchant-serial",
      privateKeyPem: input.privateKeyPem,
      certificatePem: input.certificatePem,
    },
  },
});

scenario(
  "admin_payment_provider_instance_create_list_update_preserves_secrets",
  async () => {
    const admin = await givenAdminUser("payment-provider-admin");
    const instanceKey = `scenario-wechatpay-admin-${randomUUID()}`;
    const clientId = `web-${randomUUID()}`;

    const createResponse = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          instanceKey,
          clientId,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: "scenario-private-key",
          certificatePem: "scenario-merchant-certificate",
        }),
      },
    );
    const created =
      await expectJsonResponse<AdminPaymentProviderInstanceResponse>(
        createResponse,
        200,
      );

    assert.equal(created.providerType, "WECHAT_PAY");
    assert.equal(created.instanceKey, instanceKey);
    assert.equal(created.clientId, clientId);
    assert.equal(created.config.apiV3KeyConfigured, true);
    assert.equal("apiV3Key" in created.config, false);
    assert.equal(
      created.config.merchantCertificate.privateKeyPemConfigured,
      true,
    );
    assert.equal(
      "privateKeyPem" in created.config.merchantCertificate,
      false,
    );
    assert.equal(
      "certificatePem" in created.config.merchantCertificate,
      false,
    );

    const storedAfterCreate = await providerRepo.findById(
      created.id as PaymentProviderInstanceId,
    );
    assert.ok(storedAfterCreate);
    await providerRepo.updateConfig({
      id: storedAfterCreate.id,
      config: {
        ...storedAfterCreate.config,
        platformCertificates: [
          {
            serialNo: "scenario-platform-serial",
            certificatePem: "scenario-platform-certificate",
            effectiveTime: "2026-01-01T00:00:00Z",
            expireTime: "2027-01-01T00:00:00Z",
          },
        ],
      },
    });

    const workspaceResponse = await requestJson(
      "/api/admin/payment/provider-instances/workspace",
      {
        method: "GET",
        token: admin.token,
      },
    );
    const workspace =
      await expectJsonResponse<AdminPaymentProviderWorkspaceResponse>(
        workspaceResponse,
        200,
      );
    const listed = workspace.providerInstances.find(
      (providerInstance) => providerInstance.id === created.id,
    );
    assert.ok(listed);
    assert.equal("apiV3Key" in listed.config, false);
    assert.equal(
      "privateKeyPem" in listed.config.merchantCertificate,
      false,
    );
    assert.equal(listed.config.platformCertificates.count, 1);
    assert.equal(
      "certificatePem" in listed.config.platformCertificates.items[0]!,
      false,
    );

    const updateResponse = await requestJson(
      `/api/admin/payment/provider-instances/${created.id}`,
      {
        method: "PATCH",
        token: admin.token,
        body: {
          ...buildProviderPayload({
            instanceKey,
            clientId,
            apiV3Key: "",
            privateKeyPem: "",
            certificatePem: "",
          }),
          displayName: "Scenario WeChatPay Admin Updated",
          status: "DISABLED",
          config: {
            ...buildProviderPayload({
              instanceKey,
              clientId,
              apiV3Key: "",
              privateKeyPem: "",
              certificatePem: "",
            }).config,
            appId: "wx-scenario-admin-updated",
          },
        },
      },
    );
    const updated =
      await expectJsonResponse<AdminPaymentProviderInstanceResponse>(
        updateResponse,
        200,
      );

    assert.equal(updated.displayName, "Scenario WeChatPay Admin Updated");
    assert.equal(updated.status, "DISABLED");
    assert.equal(updated.config.appId, "wx-scenario-admin-updated");
    assert.equal(updated.config.platformCertificates.count, 1);
    assert.equal("apiV3Key" in updated.config, false);

    const storedAfterUpdate = await providerRepo.findById(
      created.id as PaymentProviderInstanceId,
    );
    assert.ok(storedAfterUpdate);
    assert.equal(
      storedAfterUpdate.config.apiV3Key,
      "0123456789abcdef0123456789abcdef",
    );
    assert.equal(
      storedAfterUpdate.config.merchantCertificate.privateKeyPem,
      "scenario-private-key",
    );
    assert.equal(
      storedAfterUpdate.config.merchantCertificate.certificatePem,
      "scenario-merchant-certificate",
    );
    assert.equal(storedAfterUpdate.config.platformCertificates?.length, 1);
    assert.equal(
      storedAfterUpdate.config.platformCertificates?.[0]?.certificatePem,
      "scenario-platform-certificate",
    );
  },
);

scenario(
  "admin_payment_provider_instance_rejects_duplicate_active_client",
  async () => {
    const admin = await givenAdminUser("payment-provider-admin-conflict");
    const clientId = `web-${randomUUID()}`;

    const firstResponse = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          instanceKey: `scenario-wechatpay-admin-${randomUUID()}`,
          clientId,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: "scenario-private-key",
          certificatePem: null,
        }),
      },
    );
    await expectJsonResponse<AdminPaymentProviderInstanceResponse>(
      firstResponse,
      200,
    );

    const duplicateResponse = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          instanceKey: `scenario-wechatpay-admin-${randomUUID()}`,
          clientId,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: "scenario-private-key",
          certificatePem: null,
        }),
      },
    );

    await expectJsonResponse(duplicateResponse, 409);
  },
);
