import { generateKeyPairSync, randomUUID } from "node:crypto";
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

const deriveInstanceKey = (input: { appId: string; mchId: string }): string =>
  `mch:${input.mchId}:app:${input.appId}`;

const generateRsaPemPair = (): {
  privateKeyPem: string;
  publicKeyPem: string;
} => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });

  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
  };
};

const buildProviderPayload = (input: {
  clientId: string;
  appId?: string;
  mchId?: string;
  apiV3Key: string | null;
  privateKeyPem: string | null;
  certificatePem: string | null;
}) => ({
  providerType: "WECHAT_PAY",
  displayName: "Scenario WeChatPay Admin",
  status: "ACTIVE",
  clientId: input.clientId,
  config: {
    adapterMode: "WECHAT_PAY_API_V3",
    appId: input.appId ?? "wx-scenario-admin",
    mchId: input.mchId ?? "1900000001",
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
    const clientId = `web-${randomUUID()}`;
    const appId = `wx-scenario-admin-${randomUUID()}`;
    const mchId = `1900000001-${randomUUID()}`;
    const instanceKey = deriveInstanceKey({ appId, mchId });
    const merchantCertificate = generateRsaPemPair();

    const createResponse = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          clientId,
          appId,
          mchId,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: merchantCertificate.privateKeyPem,
          certificatePem: merchantCertificate.publicKeyPem,
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
    const platformCertificate = generateRsaPemPair();
    await providerRepo.updateConfig({
      id: storedAfterCreate.id,
      config: {
        ...storedAfterCreate.config,
        platformCertificates: [
          {
            serialNo: "scenario-platform-serial",
            certificatePem: platformCertificate.publicKeyPem,
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
            clientId,
            appId,
            mchId,
            apiV3Key: "",
            privateKeyPem: "",
            certificatePem: "",
          }),
          displayName: "Scenario WeChatPay Admin Updated",
          status: "DISABLED",
          config: {
            ...buildProviderPayload({
              clientId,
              appId,
              mchId,
              apiV3Key: "",
              privateKeyPem: "",
              certificatePem: "",
            }).config,
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
    assert.equal(updated.instanceKey, instanceKey);
    assert.equal(updated.config.appId, appId);
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
      merchantCertificate.privateKeyPem.trim(),
    );
    assert.equal(
      storedAfterUpdate.config.merchantCertificate.certificatePem,
      merchantCertificate.publicKeyPem.trim(),
    );
    assert.equal(storedAfterUpdate.config.platformCertificates?.length, 1);
    assert.equal(
      storedAfterUpdate.config.platformCertificates?.[0]?.certificatePem,
      platformCertificate.publicKeyPem.trim(),
    );

    const identityChangeResponse = await requestJson(
      `/api/admin/payment/provider-instances/${created.id}`,
      {
        method: "PATCH",
        token: admin.token,
        body: {
          ...buildProviderPayload({
            clientId,
            appId: "wx-scenario-admin-replacement",
            mchId,
            apiV3Key: "",
            privateKeyPem: "",
            certificatePem: "",
          }),
          status: "DISABLED",
        },
      },
    );
    await expectJsonResponse(identityChangeResponse, 422);
  },
);

scenario(
  "admin_payment_provider_instance_rejects_duplicate_active_client",
  async () => {
    const admin = await givenAdminUser("payment-provider-admin-conflict");
    const clientId = `web-${randomUUID()}`;
    const firstCertificate = generateRsaPemPair();
    const duplicateCertificate = generateRsaPemPair();

    const firstResponse = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          clientId,
          appId: `wx-scenario-admin-${randomUUID()}`,
          mchId: `1900000001-${randomUUID()}`,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: firstCertificate.privateKeyPem,
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
          clientId,
          appId: `wx-scenario-admin-${randomUUID()}`,
          mchId: `1900000001-${randomUUID()}`,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: duplicateCertificate.privateKeyPem,
          certificatePem: null,
        }),
      },
    );

    await expectJsonResponse(duplicateResponse, 409);
  },
);

scenario(
  "admin_payment_provider_instance_rejects_invalid_wechatpay_private_key",
  async () => {
    const admin = await givenAdminUser("payment-provider-admin-invalid-key");

    const response = await requestJson(
      "/api/admin/payment/provider-instances",
      {
        method: "POST",
        token: admin.token,
        body: buildProviderPayload({
          clientId: `web-${randomUUID()}`,
          appId: `wx-scenario-admin-${randomUUID()}`,
          mchId: `1900000001-${randomUUID()}`,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          privateKeyPem: "not-a-private-key",
          certificatePem: null,
        }),
      },
    );

    await expectJsonResponse(response, 422);
  },
);
