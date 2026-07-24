import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../lib/env";
import { type ImageUploadPurpose, imageUploadPurposes } from "./contracts";

export { imageUploadPurposes };
export type { ImageUploadPurpose };

type StoredImageSnapshot = {
  key: string;
  contentType: SupportedImageContentType;
  size: number;
  path: string;
};

type ImageStorageOptions = {
  rootDir?: string;
  maxBytes?: number;
};

type SupportedImageContentType = keyof typeof supportedContentTypeByMimeType;

const defaultImagesDir =
  process.platform === "win32" ? path.join(process.cwd(), "images") : "/mnt/oss/images";

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const supportedContentTypeByMimeType = {
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
} as const;

const purposePrefixByPurpose: Record<ImageUploadPurpose, string> = {
  poster: "posters",
  poi: "pois",
  feedback: "feedback",
};

const uuidKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ImageStorageError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 413 | 415 | 500,
  ) {
    super(message);
    this.name = "ImageStorageError";
  }
}

export const isImageKey = (value: string): boolean => uuidKeyPattern.test(value);

const getStorageRootDir = (options?: ImageStorageOptions): string =>
  options?.rootDir ?? env.IMAGES_DIR ?? defaultImagesDir;

const getPurposeDirectory = (purpose: ImageUploadPurpose, options?: ImageStorageOptions): string =>
  path.join(getStorageRootDir(options), purposePrefixByPurpose[purpose]);

const resolveImagePath = (
  purpose: ImageUploadPurpose,
  key: string,
  options?: ImageStorageOptions,
): string => {
  if (!isImageKey(key)) {
    throw new ImageStorageError("Invalid image key", 400);
  }

  const purposeDir = path.resolve(getPurposeDirectory(purpose, options));
  const imagePath = path.resolve(purposeDir, key);
  const relative = path.relative(purposeDir, imagePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ImageStorageError("Invalid image key", 400);
  }

  return imagePath;
};

export const detectImageContentType = (buffer: Buffer): SupportedImageContentType | null => {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

const assertSupportedDeclaredContentType = (contentType: string): SupportedImageContentType => {
  if (contentType in supportedContentTypeByMimeType) {
    return contentType as SupportedImageContentType;
  }

  throw new ImageStorageError("Unsupported image file type", 415);
};

const normalizeFileSize = (file: File): number => {
  const size = Number(file.size);
  return Number.isFinite(size) && size >= 0 ? size : 0;
};

export const saveImageFile = async (
  purpose: ImageUploadPurpose,
  file: File,
  options?: ImageStorageOptions,
): Promise<StoredImageSnapshot> => {
  const declaredContentType = assertSupportedDeclaredContentType(file.type);
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const fileSize = normalizeFileSize(file);

  if (fileSize === 0) {
    throw new ImageStorageError("Image file is required", 400);
  }

  if (fileSize > maxBytes) {
    throw new ImageStorageError("Image file is too large", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedContentType = detectImageContentType(buffer);
  if (!detectedContentType || detectedContentType !== declaredContentType) {
    throw new ImageStorageError("Invalid image file", 400);
  }

  const purposeDir = getPurposeDirectory(purpose, options);
  await fs.mkdir(purposeDir, { recursive: true });

  const key = uuidv4();
  const imagePath = resolveImagePath(purpose, key, options);
  await fs.writeFile(imagePath, buffer, { flag: "wx" });

  return {
    key,
    contentType: detectedContentType,
    size: buffer.byteLength,
    path: imagePath,
  };
};

export const readStoredImage = async (
  purpose: ImageUploadPurpose,
  key: string,
  options?: ImageStorageOptions,
): Promise<StoredImageSnapshot & { buffer: Buffer }> => {
  const imagePath = resolveImagePath(purpose, key, options);

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(imagePath);
  } catch (error) {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : null;
    if (code === "ENOENT") {
      throw new ImageStorageError("Image not found", 404);
    }
    throw error;
  }

  const contentType = detectImageContentType(buffer);
  if (!contentType) {
    throw new ImageStorageError("Stored image is invalid", 500);
  }

  return {
    key,
    contentType,
    size: buffer.byteLength,
    path: imagePath,
    buffer,
  };
};
