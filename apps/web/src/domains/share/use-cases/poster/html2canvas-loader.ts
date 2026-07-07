export const loadHtml2Canvas = async (): Promise<
  typeof import("html2canvas")["default"]
> => {
  const module = await import("html2canvas");
  return module.default;
};
