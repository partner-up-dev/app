/**
 * Type-community QR assets are operator-provided URLs. Keep the presentation
 * boundary to HTTP(S) so a malformed configuration cannot become an image
 * source in a public Discovery surface.
 */
export const normalizeCommunityQrUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};
