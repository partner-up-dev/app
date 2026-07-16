import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PRJoinGateConfig } from "../../../entities";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  updatePartnerRules: vi.fn(),
  updateJoinGateConfig: vi.fn(),
}));
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findById = mocks.findById;
    updatePartnerRules = mocks.updatePartnerRules;
    updateJoinGateConfig = mocks.updateJoinGateConfig;
  },
}));

const { materializePRTypeParticipationSnapshot } = await import(
  "./pr-type-participation-defaults.service"
);

const configGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "config",
  version: "v1",
  title: "Config",
  source: "PR_TYPE_CONFIG",
  body: "Config gate",
};
const prGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "pr",
  version: "v1",
  title: "PR",
  source: "PR",
  body: "PR gate",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findById.mockResolvedValue({
    confirmationStartOffsetMinutes: null,
    confirmationEndOffsetMinutes: null,
    joinLockOffsetMinutes: null,
  });
});

describe("materializePRTypeParticipationSnapshot", () => {
  it("snapshots policy once and preserves PR-owned gates", async () => {
    await materializePRTypeParticipationSnapshot({
      prId: 2,
      defaults: {
        defaultConfirmationEnabled: true,
        defaultConfirmationStartOffsetMinutes: 180,
        defaultConfirmationEndOffsetMinutes: 45,
        defaultJoinLockOffsetMinutes: 45,
        joinGateConfig: [configGate],
      },
      prJoinGateConfig: [prGate],
    });

    expect(mocks.updatePartnerRules).toHaveBeenCalled();
    expect(mocks.updateJoinGateConfig).toHaveBeenCalledWith(2, [configGate, prGate]);
  });

  it("keeps gates when config is missing", async () => {
    await materializePRTypeParticipationSnapshot({
      prId: 2,
      defaults: null,
      prJoinGateConfig: [prGate],
    });
    expect(mocks.updatePartnerRules).not.toHaveBeenCalled();
    expect(mocks.updateJoinGateConfig).toHaveBeenCalledWith(2, [prGate]);
  });

  it("does not rewrite an empty gate snapshot without a type config", async () => {
    await materializePRTypeParticipationSnapshot({ prId: 2, defaults: null });
    expect(mocks.updateJoinGateConfig).not.toHaveBeenCalled();
  });
});
