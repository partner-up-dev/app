import { computed, ref, watch, type Ref } from "vue";
import { i18n } from "@/locales/i18n";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";

type PosterInput = {
  title: string;
  targetUrl: string;
};

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 840;
const POSTER_PADDING = 56;
const QR_SIZE = 430;
const TITLE_FONT_SIZE = 40;
const TITLE_LINE_HEIGHT = 52;
const MAX_TITLE_LINES = 3;

const uploadedPosterUrls = new Map<string, string>();

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("QR image failed to load"));
    image.src = src;
  });

  return image;
};

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas blob generation failed"));
      }
    }, "image/png");
  });
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const chars = Array.from(text.trim());
  const lines: string[] = [];
  let currentLine = "";

  for (const char of chars) {
    const candidate = `${currentLine}${char}`;
    if (currentLine.length > 0 && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine);
      currentLine = char;
      if (lines.length === MAX_TITLE_LINES) break;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine && lines.length < MAX_TITLE_LINES) {
    lines.push(currentLine);
  }

  if (lines.length === MAX_TITLE_LINES && lines[MAX_TITLE_LINES - 1]) {
    const lastIndex = MAX_TITLE_LINES - 1;
    let lastLine = lines[lastIndex];
    while (lastLine.length > 1 && context.measureText(`${lastLine}...`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = `${lastLine}...`;
  }

  return lines;
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const renderQrPosterBlob = async ({ title, targetUrl }: PosterInput): Promise<Blob> => {
  const { default: QRCode } = await import("qrcode");
  const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: QR_SIZE,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
  const qrImage = await loadImage(qrCodeDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  context.strokeStyle = "#d8dee8";
  context.lineWidth = 2;
  drawRoundedRect(context, 1, 1, POSTER_WIDTH - 2, POSTER_HEIGHT - 2, 28);
  context.stroke();

  context.fillStyle = "#1f2937";
  context.font = `600 ${TITLE_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";

  const titleLines = wrapText(context, title, POSTER_WIDTH - POSTER_PADDING * 2);
  const titleBlockHeight = titleLines.length * TITLE_LINE_HEIGHT;
  const titleStartY = 92;
  titleLines.forEach((line, index) => {
    context.fillText(line, POSTER_WIDTH / 2, titleStartY + index * TITLE_LINE_HEIGHT);
  });

  const qrX = (POSTER_WIDTH - QR_SIZE) / 2;
  const qrY = Math.max(292, titleStartY + titleBlockHeight + 72);

  context.fillStyle = "#ffffff";
  drawRoundedRect(context, qrX - 18, qrY - 18, QR_SIZE + 36, QR_SIZE + 36, 24);
  context.fill();
  context.strokeStyle = "#e5e7eb";
  context.lineWidth = 2;
  context.stroke();
  context.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  return await canvasToBlob(canvas);
};

const buildPosterCacheKey = ({ title, targetUrl }: PosterInput): string =>
  JSON.stringify({ title, targetUrl });

export const useQrPosterImageUrl = (
  active: Readonly<Ref<boolean>>,
  input: Readonly<Ref<PosterInput>>,
) => {
  const posterUrlRef = ref<string | null>(null);
  const posterErrorRef = ref<string | null>(null);
  const { uploadImage } = useCloudStorage();
  let generationId = 0;

  watch(
    [active, input],
    async ([isActive, nextInput]) => {
      const currentGenerationId = generationId + 1;
      generationId = currentGenerationId;
      if (!isActive) return;

      posterUrlRef.value = null;
      posterErrorRef.value = null;

      if (!nextInput.targetUrl) {
        posterErrorRef.value = i18n.global.t("share.asLink.qrPosterFailed");
        return;
      }

      const cacheKey = buildPosterCacheKey(nextInput);
      const cachedUrl = uploadedPosterUrls.get(cacheKey);
      if (cachedUrl) {
        posterUrlRef.value = cachedUrl;
        return;
      }

      try {
        const blob = await renderQrPosterBlob(nextInput);
        const uploadedUrl = await uploadImage(blob, { purpose: "poster" });
        if (currentGenerationId !== generationId) return;
        uploadedPosterUrls.set(cacheKey, uploadedUrl);
        posterUrlRef.value = uploadedUrl;
      } catch {
        if (currentGenerationId !== generationId) return;
        posterErrorRef.value = i18n.global.t("share.asLink.qrPosterFailed");
      }
    },
    { immediate: true },
  );

  return {
    posterUrl: computed(() => posterUrlRef.value),
    posterError: computed(() => posterErrorRef.value),
  };
};
