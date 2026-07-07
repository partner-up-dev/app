/**
 * Poster template types for Xiaohongshu poster generation
 */
import { i18n } from "@/locales/i18n";

export interface PosterStyle {
  id: string;
  name: string;
  background: BackgroundConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
}

export interface BackgroundConfig {
  type: "solid" | "gradient";
  colors: string[];
  className?: string;
}

export interface TypographyConfig {
  primaryFont: string;
  primarySize: string;
  primaryWeight: string;
  primaryColor: string;
  lineHeight: number;
  letterSpacing?: string;
}

export interface LayoutConfig {
  padding: string;
  maxWidth: string;
  textAlign: "left" | "center" | "right";
  spacing: string;
}

export interface PosterData {
  caption: string;
  style: number; // 0-4, maps to caption styles
}

/**
 * Maps caption style index to poster style configuration
 */
export const POSTER_STYLES: Record<number, PosterStyle> = {
  // 0: 活泼友好 (Friendly) - Fresh style
  0: {
    id: "fresh",
    name: i18n.global.t("posterStyles.fresh"),
    background: {
      type: "gradient",
      colors: ["#F0F9E9", "#E6F3D3"],
      className: "bg-gradient-fresh",
    },
    typography: {
      primaryFont:
        '"PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      primarySize: "56px",
      primaryWeight: "600",
      primaryColor: "#2D5016",
      lineHeight: 1.3,
      letterSpacing: "0.02em",
    },
    layout: {
      padding: "40px 32px",
      maxWidth: "480px",
      textAlign: "center",
      spacing: "24px",
    },
  },

  // 1: 简洁干练 (Concise) - Minimal style
  1: {
    id: "minimal",
    name: i18n.global.t("posterStyles.minimal"),
    background: {
      type: "solid",
      colors: ["#FFFFFF"],
      className: "bg-minimal",
    },
    typography: {
      primaryFont:
        '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      primarySize: "46px",
      primaryWeight: "500",
      primaryColor: "#1A1A1A",
      lineHeight: 1.25,
      letterSpacing: "0.01em",
    },
    layout: {
      padding: "45px 35px",
      maxWidth: "460px",
      textAlign: "center",
      spacing: "28px",
    },
  },

  // 2: 温暖治愈 (Warm) - Warm style
  2: {
    id: "warm",
    name: i18n.global.t("posterStyles.warm"),
    background: {
      type: "gradient",
      colors: ["#FFF5F0", "#FFE4D6"],
      className: "bg-gradient-warm",
    },
    typography: {
      primaryFont: '"Source Han Serif SC", "Noto Serif CJK SC", serif',
      primarySize: "42px",
      primaryWeight: "400",
      primaryColor: "#8B4513",
      lineHeight: 1.4,
      letterSpacing: "0.03em",
    },
    layout: {
      padding: "42px 34px",
      maxWidth: "470px",
      textAlign: "center",
      spacing: "26px",
    },
  },

  // 3: 潮流酷炫 (Trendy) - Modern style
  3: {
    id: "modern",
    name: i18n.global.t("posterStyles.modern"),
    background: {
      type: "gradient",
      colors: ["#F8F9FA", "#E9ECEF"],
      className: "bg-gradient-modern",
    },
    typography: {
      primaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      primarySize: "42px",
      primaryWeight: "700",
      primaryColor: "#000000",
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
    },
    layout: {
      padding: "48px 38px",
      maxWidth: "450px",
      textAlign: "center",
      spacing: "30px",
    },
  },

  // 4: 专业正式 (Professional) - Elegant style
  4: {
    id: "elegant",
    name: i18n.global.t("posterStyles.elegant"),
    background: {
      type: "solid",
      colors: ["#FEF9F6"],
      className: "bg-elegant",
    },
    typography: {
      primaryFont: '"Times New Roman", "Source Han Serif SC", serif',
      primarySize: "42px",
      primaryWeight: "400",
      primaryColor: "#2D2D2D",
      lineHeight: 1.35,
      letterSpacing: "0.02em",
    },
    layout: {
      padding: "50px 36px",
      maxWidth: "465px",
      textAlign: "center",
      spacing: "32px",
    },
  },
};

/**
 * Default poster dimensions (3:4 aspect ratio for mobile)
 */
export const POSTER_DIMENSIONS = {
  width: 540,
  height: 720,
} as const;

/**
 * Get poster style configuration by caption style index
 */
export function getPosterStyle(styleIndex: number): PosterStyle {
  const normalizedIndex = styleIndex % 5; // Cycle through 0-4
  return POSTER_STYLES[normalizedIndex];
}
