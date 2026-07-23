import assert from "node:assert/strict";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PartnerRequestFields } from "../../../entities/partner-request";
import type { User, UserId } from "../../../entities/user";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";

const { createSpy, slotSpy, materializeSpy, findByIdSpy, oauthSpy } = vi.hoisted(() => ({
  createSpy: vi.fn<(data: Record<string, unknown>) => Promise<{ id: number; status: "OPEN" }>>(),
  slotSpy: vi.fn<(prId: number, creatorUserId: UserId | null) => Promise<void>>(),
  materializeSpy: vi.fn<(input: unknown) => Promise<void>>(),
  findByIdSpy: vi.fn<(id: UserId) => Promise<User | null>>(),
  oauthSpy: vi.fn<(openId: string) => Promise<User>>(),
}));

vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    create = createSpy;
  },
}));

vi.mock("../../../repositories/UserRepository", () => ({
  UserRepository: class {
    findById = findByIdSpy;
  },
}));

vi.mock("../../user", () => ({
  resolveUserByOpenId: oauthSpy,
}));

vi.mock("../services/slot-management.service", () => ({
  initializeSlotsForPR: slotSpy,
}));

vi.mock("../services/pr-type-creation-materialization.service", () => ({
  materializePRTypeConfigurationAtCreation: materializeSpy,
}));

vi.mock("../services/poi-availability.service", () => ({
  assertPRTimeWindowAvailableAtLocation: vi.fn<(input: unknown) => Promise<void>>(),
}));

const { createPRFromStructured } = await import("./create-pr-structured");

const userId = (value: string): UserId => value as UserId;

const buildUser = (id: UserId, role: User["role"]): User =>
  ({
    id,
    role,
    status: "ACTIVE",
  }) as User;

const buildFields = (): PartnerRequestFields => ({
  title: "Guard test PR",
  type: "badminton",
  time: ["2031-01-01T10:00:00.000Z", "2031-01-01T12:00:00.000Z"],
  location: null,
  route: null,
  minPartners: 1,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

const emptyIdentity = {
  authenticatedUserId: null,
  anonymousUserId: null,
  oauthOpenId: null,
};

describe("createPRFromStructured creation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdSpy.mockResolvedValue(null);
    createSpy.mockResolvedValue({ id: 9001, status: "OPEN" });
  });

  test.each([
    ["missing identity", emptyIdentity],
    ["anonymous identity", { ...emptyIdentity, anonymousUserId: userId("anonymous-user") }],
  ])("rejects USER creation for %s before any write", async (_label, identity) => {
    await expect(
      createPRFromStructured(buildFields(), identity, { creationAuthority: "USER" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATED_REQUIRED",
    });

    assert.equal(createSpy.mock.calls.length, 0);
    assert.equal(slotSpy.mock.calls.length, 0);
    assert.equal(materializeSpy.mock.calls.length, 0);
  });

  test("rejects an active service actor under USER before any write", async () => {
    const serviceId = userId("service-user");
    findByIdSpy.mockResolvedValue(buildUser(serviceId, ["service", "analytics"]));

    await expect(
      createPRFromStructured(
        buildFields(),
        { ...emptyIdentity, authenticatedUserId: serviceId },
        { creationAuthority: "USER" },
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATED_REQUIRED",
    });

    assert.equal(createSpy.mock.calls.length, 0);
    assert.equal(slotSpy.mock.calls.length, 0);
    assert.equal(materializeSpy.mock.calls.length, 0);
  });

  test("does not fall back to OAuth when authenticated id is invalid", async () => {
    const invalidAuthenticatedId = userId("invalid-authenticated-user");
    oauthSpy.mockResolvedValue(buildUser(userId("oauth-user"), ["authenticated"]));

    await expect(
      createPRFromStructured(
        buildFields(),
        {
          authenticatedUserId: invalidAuthenticatedId,
          anonymousUserId: null,
          oauthOpenId: "established-open-id",
        },
        { creationAuthority: "USER" },
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATED_REQUIRED",
    });

    assert.equal(oauthSpy.mock.calls.length, 0);
    assert.equal(createSpy.mock.calls.length, 0);
    assert.equal(slotSpy.mock.calls.length, 0);
    assert.equal(materializeSpy.mock.calls.length, 0);
  });

  test("preserves creatorless OPEN SYSTEM expansion", async () => {
    const result = await createPRFromStructured(buildFields(), emptyIdentity, {
      creationAuthority: "SYSTEM",
      publicationMode: "create-open",
    });

    assert.equal(result.status, "OPEN");
    assert.equal(result.createdBy, null);
    assert.equal(createSpy.mock.calls.length, 1);
    assert.equal(createSpy.mock.calls[0]?.[0].createdBy, null);
    assert.deepEqual(slotSpy.mock.calls[0], [9001, null]);
    assert.equal(materializeSpy.mock.calls.length, 1);
  });
});
