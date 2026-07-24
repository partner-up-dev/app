import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User } from "../../../entities/user";
import { authenticateOperatorCredential } from "./authenticate-operator-credential";

const mocks = vi.hoisted(() => ({
  findById: vi.fn<(userId: User["id"]) => Promise<User | null>>(),
  verifyCredential: vi.fn<(user: User, credential: string) => Promise<boolean>>(),
}));

vi.mock("../../../repositories/UserRepository", () => ({
  UserRepository: class {
    findById = mocks.findById;
  },
}));

vi.mock("../services/user-credential-auth.service", () => ({
  verifyUserCredential: mocks.verifyCredential,
}));

const operatorUser = (overrides: Partial<User> = {}): User => ({
  id: "11111111-1111-4111-8111-111111111111",
  openId: null,
  wechatOfficialAccountFollowedAt: null,
  pinHash: "stored-hash",
  role: ["service", "analytics"],
  nickname: null,
  phoneNumber: null,
  sex: null,
  avatar: null,
  status: "ACTIVE",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("authenticateOperatorCredential", () => {
  beforeEach(() => {
    mocks.findById.mockReset();
    mocks.verifyCredential.mockReset();
  });

  test("returns the same null result for missing, non-operator, and bad credentials", async () => {
    mocks.findById.mockResolvedValueOnce(null);
    await expect(
      authenticateOperatorCredential({
        userId: "22222222-2222-4222-8222-222222222222",
        credential: "secret",
      }),
    ).resolves.toBeNull();
    expect(mocks.verifyCredential).not.toHaveBeenCalled();

    mocks.findById.mockResolvedValueOnce(operatorUser({ role: ["authenticated"] }));
    await expect(
      authenticateOperatorCredential({
        userId: "11111111-1111-4111-8111-111111111111",
        credential: "secret",
      }),
    ).resolves.toBeNull();
    expect(mocks.verifyCredential).not.toHaveBeenCalled();

    const operator = operatorUser();
    mocks.findById.mockResolvedValueOnce(operator);
    mocks.verifyCredential.mockResolvedValueOnce(false);
    await expect(
      authenticateOperatorCredential({
        userId: operator.id,
        credential: "wrong",
      }),
    ).resolves.toBeNull();
    expect(mocks.verifyCredential).toHaveBeenCalledWith(operator, "wrong");
  });

  test("returns a row-free identity without adding a status policy", async () => {
    const disabledOperator = operatorUser({
      status: "DISABLED",
      role: ["analytics", "service", "analytics", "anonymous", "authenticated"],
    });
    mocks.findById.mockResolvedValueOnce(disabledOperator);
    mocks.verifyCredential.mockResolvedValueOnce(true);

    await expect(
      authenticateOperatorCredential({
        userId: disabledOperator.id,
        credential: " raw credential ",
      }),
    ).resolves.toEqual({
      userId: disabledOperator.id,
      roles: ["analytics", "service", "authenticated"],
    });
    expect(mocks.verifyCredential).toHaveBeenCalledWith(disabledOperator, " raw credential ");
  });
});
