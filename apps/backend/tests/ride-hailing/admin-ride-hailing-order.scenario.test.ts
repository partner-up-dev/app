import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import {
  givenAdminUser,
  givenUser,
  type ScenarioUser,
} from "../pr-core/_kit/builders/users";
import { createOffer, createProductSpu } from "../../src/domains/merchandising";
import {
  buildOrderParticipantsFromContext,
  createRideHailingOrderFoundation,
} from "../../src/domains/trade";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";

const tradeOrderRepo = new TradeOrderRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const providerRepo = new RideHailingProviderInstanceRepository();

type AdminRideHailingOrderWorkspaceResponse = {
  orders: Array<{
    order: {
      id: string;
      status: string;
      terminationAttempts: Array<{
        status: string;
        reason?: string | null;
      }>;
    };
    rideHailingOrder: {
      executionPhase: string;
      routeSnapshot: {
        origin: { name: string };
        destination: { name: string };
      };
      riders: Array<{
        displayName: string;
      }>;
    };
    providerBinding: {
      providerInstanceId: string;
      providerOrderId: string;
    } | null;
    providerInstance: {
      id: string;
      displayName: string;
    } | null;
    bill: {
      id: string;
      status: string;
    } | null;
  }>;
};

type RideHailingCancelResponse = {
  orderId: string;
  attemptId: string;
  status: string;
  effectKind: string;
  effectAmountFen: number;
};

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.equal(typeof address, "object");
      assert.notEqual(address, null);
      resolve(`http://127.0.0.1:${address.port}/v2`);
    });
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

async function listOrderParticipants(user: ScenarioUser) {
  return buildOrderParticipantsFromContext({
    participants: [
      {
        participantId: `scenario-${user.user.id}`,
        userId: user.user.id,
        joinedVia: "API",
      },
    ],
    createdBy: user.user.id,
  });
}

async function givenRideHailingOffer() {
  const spu = await createProductSpu({
    name: "Scenario ride hailing admin order",
    productType: "RIDE_HAILING",
    status: "ACTIVE",
    salesPolicy: {
      skuSelectionPolicy: {
        type: "CHOICE_SET",
        min: 1,
        max: null,
        resolvesTo: 1,
      },
      quantityPolicy: {
        type: "FIXED",
        quantity: 1,
      },
    },
    servicePolicy: {
      type: "RIDE_HAILING",
    },
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
  });

  const offer = await createOffer({
    productType: "RIDE_HAILING",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });

  return { offer, spu };
}

scenario("admin_ride_hailing_order_workspace_can_cancel_dispatching_order", async () => {
  const admin = await givenAdminUser("ride-hailing-order-admin");
  const creator = await givenUser("ride-hailing-order-owner");
  const participants = await listOrderParticipants(creator);
  const { offer } = await givenRideHailingOffer();
  const providerOrderId = `CC-ADMIN-${randomUUID().slice(0, 8)}`;

  const fakeCaocao = createServer((request, response) => {
    if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          code: 200,
          success: true,
          data: {
            phase: "DISPATCHING",
            finalAmountFen: null,
            driver: null,
            vehicle: null,
          },
        }),
      );
      return;
    }

    if (request.url === "/v2/common/cancelOrderV3" && request.method === "POST") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          code: 200,
          success: true,
          data: {
            orderNo: providerOrderId,
            cancelFee: 800,
          },
        }),
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: 404, success: false }));
  });

  const endpointBaseUrl = await listen(fakeCaocao);

  try {
    const provider = await providerRepo.create({
      providerType: "CAOCAO",
      instanceKey: `scenario-admin-order-${randomUUID()}`,
      status: "ACTIVE",
      displayName: "Scenario Admin Caocao",
      config: {
        adapterMode: "CAOCAO_OPEN_API",
        caocaoClientId: "scenario-admin-order-client",
        signKey: "scenario-admin-order-secret",
        endpointBaseUrl,
        callbackBaseUrl: "https://api.partner-up.test",
      },
    });

    const itemId = randomUUID();
    const result = await createRideHailingOrderFoundation({
      createdBy: creator.user.id,
      participants,
      offerId: offer.id,
      items: [
        {
          kind: "CHOICE_SET",
          itemId,
          productType: "RIDE_HAILING",
          candidates: [
            {
              sku: {
                id: 901001,
                version: 1,
                name: "Scenario Admin Ride",
                presentationSnapshot: {
                  heroImageAssetIds: [],
                  detailImageAssetIds: [],
                  sellingPoints: [],
                  parameterGroups: [],
                  noticeBlocks: [],
                },
                factsSnapshot: {
                  rideHailingProviderInstanceId: provider.id,
                  providerVehicleTypeCode: "1",
                },
                pricingModelSnapshot: {
                  type: "DYNAMIC_QUOTE",
                  calculatorSpec: {},
                },
                cancellationPolicySnapshot: null,
              },
              quoteSnapshot: {
                amountFen: 3600,
                currency: "CNY",
                displayName: "Scenario Admin Ride",
                estimateAmountFen: 3600,
                quotedAt: "2031-03-01T09:00:00.000Z",
                explanations: [],
              },
            },
          ],
          resolution: null,
          quantity: 1,
        },
      ],
      pricingSnapshot: {
        currency: "CNY",
        itemBreakdowns: [
          {
            itemId,
            resolvedAmountFen: 3600,
            explanations: [],
          },
        ],
        orderLevelExplanations: [],
        subtotalFen: 3600,
        totalFen: 3600,
      },
      routeSnapshot: {
        origin: {
          name: "Scenario pickup",
          address: "A road",
          latitude: 30.2601,
          longitude: 120.1531,
        },
        waypoints: [],
        destination: {
          name: "Scenario destination",
          address: "B road",
          latitude: 30.2801,
          longitude: 120.1731,
        },
        drivingPlan: {
          distanceMeters: 8200,
          durationSeconds: 1500,
          polyline: [
            {
              latitude: 30.2601,
              longitude: 120.1531,
            },
            {
              latitude: 30.2801,
              longitude: 120.1731,
            },
          ],
        },
      },
      departureAt: null,
      riders: [
        {
          userId: creator.user.id,
          displayName: "Scenario rider",
          phoneMasked: "138****8000",
        },
      ],
      contactPhone: "13800138000",
    });

    const baseOrder = await tradeOrderRepo.findById(result.orderId);
    assert.ok(baseOrder);
    const choiceSetItem =
      baseOrder.items[0]?.kind === "CHOICE_SET" ? baseOrder.items[0] : null;
    assert.ok(choiceSetItem);

    const resolvedItems = [
      {
        ...choiceSetItem,
        resolution: {
          sku: choiceSetItem.candidates[0]?.sku ?? null,
          providerVehicleTypeCode: "1",
          providerVehicleTypeName: "Scenario Admin Ride",
          quoteSnapshot: choiceSetItem.candidates[0]?.quoteSnapshot ?? null,
          providerBinding: {
            providerInstanceId: provider.id,
            providerType: provider.providerType,
            providerOrderId,
            providerSnapshot: null,
          },
          source: "DISPATCH_POLICY" as const,
          candidateRelation: "IN_CANDIDATES" as const,
          reason: "Scenario dispatch",
          resolvedAt: "2031-03-01T09:01:00.000Z",
        },
      },
    ];

    await tradeOrderRepo.replaceItems(baseOrder.id, resolvedItems);
    await tradeOrderRepo.updateStatus(baseOrder.id, "OPEN");
    await rideOrderRepo.updateByOrderId(baseOrder.id, {
      executionPhase: "DISPATCHING",
    });

    const workspaceResponse = await requestJson(
      "/api/admin/ride-hailing/orders/workspace",
      {
        method: "GET",
        token: admin.token,
      },
    );
    const workspace =
      await expectJsonResponse<AdminRideHailingOrderWorkspaceResponse>(
        workspaceResponse,
        200,
      );
    const record = workspace.orders.find((order) => order.order.id === baseOrder.id);
    assert.ok(record);
    assert.equal(record.order.status, "OPEN");
    assert.equal(record.rideHailingOrder.executionPhase, "DISPATCHING");
    assert.equal(record.providerBinding?.providerOrderId, providerOrderId);
    assert.equal(record.providerInstance?.id, provider.id);

    const cancelResponse = await requestJson(
      `/api/admin/ride-hailing/orders/${baseOrder.id}/cancel`,
      {
        method: "POST",
        token: admin.token,
      },
    );
    const cancelled =
      await expectJsonResponse<RideHailingCancelResponse>(cancelResponse, 200);

    assert.equal(cancelled.orderId, baseOrder.id);
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.effectKind, "ABORT_FEE");
    assert.equal(cancelled.effectAmountFen, 800);

    const persistedOrder = await tradeOrderRepo.findById(baseOrder.id);
    assert.ok(persistedOrder);
    assert.equal(persistedOrder.status, "CANCELLED");
    assert.equal(persistedOrder.terminationAttempts.length, 1);
    assert.equal(persistedOrder.terminationAttempts[0]?.status, "APPROVED");
    assert.equal(persistedOrder.terminationAttempts[0]?.reason, "管理员取消订单");
    assert.equal(persistedOrder.terminationAttempts[0]?.requestedBy, admin.user.id);

    const persistedRideOrder = await rideOrderRepo.findByOrderId(baseOrder.id);
    assert.ok(persistedRideOrder);
    assert.equal(persistedRideOrder.executionPhase, "CANCELLED");

    const refreshedWorkspaceResponse = await requestJson(
      "/api/admin/ride-hailing/orders/workspace",
      {
        method: "GET",
        token: admin.token,
      },
    );
    const refreshedWorkspace =
      await expectJsonResponse<AdminRideHailingOrderWorkspaceResponse>(
        refreshedWorkspaceResponse,
        200,
      );
    const refreshedRecord = refreshedWorkspace.orders.find(
      (order) => order.order.id === baseOrder.id,
    );
    assert.ok(refreshedRecord);
    assert.equal(refreshedRecord.order.status, "CANCELLED");
    assert.equal(refreshedRecord.rideHailingOrder.executionPhase, "CANCELLED");
  } finally {
    await closeServer(fakeCaocao);
  }
});
