import { beforeEach, describe, expect, it, vi } from "vitest";

const updateNotes = vi.hoisted(() => vi.fn<() => unknown>());
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    updateNotes = updateNotes;
  },
}));

const { materializePRTypeAuthoringDefaults } = await import("./pr-type-authoring-defaults");

beforeEach(() => vi.clearAllMocks());

describe("materializePRTypeAuthoringDefaults", () => {
  it("fills only empty notes", async () => {
    await materializePRTypeAuthoringDefaults({
      prId: 1,
      prNotes: "  ",
      defaults: { defaultNotes: "  Arrive early  " },
    });
    expect(updateNotes).toHaveBeenCalledWith(1, "Arrive early");
  });

  it("does not overwrite authored notes", async () => {
    await materializePRTypeAuthoringDefaults({
      prId: 1,
      prNotes: "Already authored",
      defaults: { defaultNotes: "Default" },
    });
    expect(updateNotes).not.toHaveBeenCalled();
  });
});
