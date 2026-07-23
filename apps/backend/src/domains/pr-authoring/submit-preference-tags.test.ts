import assert from "node:assert/strict";
import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findConfig: vi.fn<() => unknown>(),
  findTags: vi.fn<() => unknown>(),
  create: vi.fn<(input: { type: string; label: string }) => Promise<unknown>>(),
  update: vi.fn<() => unknown>(),
}));

vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = mocks.findConfig;
  },
}));
vi.mock("../../repositories/PRTypePreferenceTagRepository", () => ({
  PRTypePreferenceTagRepository: class {
    findByType = mocks.findTags;
    create = mocks.create;
    update = mocks.update;
  },
}));

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const { normalizePRAuthoringPreferenceLabels, submitPRAuthoringPreferenceTags } =
  await import("./use-cases/submit-preference-tags");

const config = { type: "study" };
const rejected = {
  id: 3,
  type: "study",
  label: "旧标签",
  description: "",
  moderationStatus: "REJECTED" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findConfig.mockResolvedValue(config);
  mocks.findTags.mockResolvedValue([rejected]);
  mocks.update.mockResolvedValue({ ...rejected, moderationStatus: "PENDING" });
  mocks.create.mockImplementation(async (input: { type: string; label: string }) => ({
    id: 4,
    type: input.type,
    label: input.label,
    description: "",
    moderationStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
});

test("preference labels normalize whitespace and deduplicate", () => {
  assert.deepEqual(normalizePRAuthoringPreferenceLabels([" 安静 ", "安静", "  新手  友好 "]), [
    "安静",
    "新手 友好",
  ]);
});

test("submission reopens rejected tags and creates new pending tags", async () => {
  const result = await submitPRAuthoringPreferenceTags({
    type: " study ",
    labels: ["旧标签", "新标签", "新标签"],
  });
  assert.equal(result.type, "study");
  assert.deepEqual(
    result.submittedTags.map(({ label, moderationStatus }) => ({ label, moderationStatus })),
    [
      { label: "旧标签", moderationStatus: "PENDING" },
      { label: "新标签", moderationStatus: "PENDING" },
    ],
  );
  expect(mocks.update).toHaveBeenCalledWith(3, { label: "旧标签", moderationStatus: "PENDING" });
});

test("submission rejects an unknown type", async () => {
  mocks.findConfig.mockResolvedValue(null);
  await assert.rejects(() => submitPRAuthoringPreferenceTags({ type: "unknown", labels: ["x"] }));
});

test("submission preserves an existing published label", async () => {
  const published = { ...rejected, id: 5, label: "已发布", moderationStatus: "PUBLISHED" as const };
  mocks.findTags.mockResolvedValue([published]);
  const result = await submitPRAuthoringPreferenceTags({ type: "study", labels: ["已发布"] });
  assert.equal(result.submittedTags[0]?.moderationStatus, "PUBLISHED");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
