import { defineConfig, presetIcons, presetWind3 } from "unocss";
import partnerUpDesignPreset from "@partner-up-dev/design-web/uno";

export default defineConfig({
  presets: [
    partnerUpDesignPreset(),
    presetWind3(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
});
