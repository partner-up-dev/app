import { beforeEach, expect, test, vi } from "vitest";
import type { User, UserId } from "../../../entities/user";
import type { UserRepository } from "../../../repositories/UserRepository";
import { fillMissingWeChatProfileFields } from "./fill-missing-wechat-profile-fields";

const mocks = vi.hoisted(() => ({
  updateWeChatProfileFieldsIfMissing:
    vi.fn<
      (
        input: Parameters<UserRepository["updateWeChatProfileFieldsIfMissing"]>[0],
      ) => Promise<User | null>
    >(),
}));

vi.mock("../../../repositories/UserRepository", () => ({
  UserRepository: class {
    updateWeChatProfileFieldsIfMissing = mocks.updateWeChatProfileFieldsIfMissing;
  },
}));

const userId = "11111111-1111-4111-8111-111111111111" satisfies UserId;

beforeEach(() => {
  mocks.updateWeChatProfileFieldsIfMissing.mockReset();
});

test("delegates a semantic best-effort missing-profile fill without exposing a row", async () => {
  mocks.updateWeChatProfileFieldsIfMissing.mockResolvedValueOnce(null);

  await expect(
    fillMissingWeChatProfileFields({
      userId,
      nickname: "Partner",
      sex: 1,
      avatar: "/avatar.png",
    }),
  ).resolves.toBeUndefined();
  expect(mocks.updateWeChatProfileFieldsIfMissing).toHaveBeenCalledWith({
    userId,
    nickname: "Partner",
    sex: 1,
    avatar: "/avatar.png",
  });
});
