import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";

const { detectImageContentType, imageUploadPurposes, readStoredImage, saveImageFile } =
  await import("./image-storage.service");

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

const withTempRoot = async (fn: (rootDir: string) => Promise<void>): Promise<void> => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "partnerup-images-"));
  try {
    await fn(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
};

test("image upload purposes expose only active storage contracts", () => {
  assert.deepEqual(imageUploadPurposes, ["poster", "poi", "feedback"]);
});

test("detectImageContentType detects supported file headers", () => {
  assert.equal(detectImageContentType(pngBytes), "image/png");
  assert.equal(detectImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectImageContentType(Buffer.from("RIFFxxxxWEBP", "ascii")), "image/webp");
});

test("saveImageFile stores image under purpose prefix with UUID key", async () => {
  await withTempRoot(async (rootDir) => {
    const file = new File([pngBytes], "client-name.png", { type: "image/png" });
    const stored = await saveImageFile("poi", file, { rootDir });

    assert.match(stored.key, /^[0-9a-f-]{36}$/);
    assert.equal(stored.path, path.join(rootDir, "pois", stored.key));
    assert.equal(path.basename(stored.path), stored.key);
    assert.deepEqual(await readFile(stored.path), pngBytes);
  });
});

test("readStoredImage serves stored bytes and detected content type", async () => {
  await withTempRoot(async (rootDir) => {
    const file = new File([pngBytes], "cover.png", { type: "image/png" });
    const stored = await saveImageFile("feedback", file, { rootDir });
    const read = await readStoredImage("feedback", stored.key, {
      rootDir,
    });

    assert.equal(read.key, stored.key);
    assert.equal(read.contentType, "image/png");
    assert.deepEqual(read.buffer, pngBytes);
  });
});

test("saveImageFile rejects mismatched declared and detected image types", async () => {
  await withTempRoot(async (rootDir) => {
    const file = new File([pngBytes], "wrong.webp", { type: "image/webp" });

    await assert.rejects(() => saveImageFile("poster", file, { rootDir }), /Invalid image file/);
  });
});
