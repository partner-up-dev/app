import type { DefineComponent } from "vue";

type DesignWebComponent = DefineComponent<
  Record<string, unknown>,
  Record<string, never>,
  unknown
>;

export const PuCard: DesignWebComponent;
export const PuInlineNotice: DesignWebComponent;
export const PuPageScaffold: DesignWebComponent;
