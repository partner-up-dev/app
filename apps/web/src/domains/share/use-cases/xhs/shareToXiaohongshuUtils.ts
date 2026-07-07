export const TIMING_CONSTANTS = {
  CAPTION_TRANSITION_DELAY: 150,
  POSTER_GENERATION_DELAY: 0,
  POSTER_TRANSITION_DURATION: 300,
} as const;

export const downloadBlob = (blob: Blob, filename: string): void => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatCaptionWithUrl = (caption: string, url: string): string => {
  return `${caption}\n\n${url}`;
};

export const generatePosterFilename = (): string => {
  return `poster-${Date.now()}.png`;
};

export const delayMs = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

