import { i18n } from "@/locales/i18n";
import { loadHtml2Canvas } from "./html2canvas-loader";

const getHTMLElementCtor = (doc: Document): typeof HTMLElement | null => {
  const win = doc.defaultView;
  return win?.HTMLElement ?? null;
};

const isHTMLElementInDoc = (
  doc: Document,
  node: unknown,
): node is HTMLElement => {
  const Ctor = getHTMLElementCtor(doc);
  return Ctor !== null && node instanceof Ctor;
};

const denyList: ReadonlyArray<RegExp> = [
  /<script/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<link/i,
  /<iframe/i,
];

const assertHtmlSafe = (html: string): void => {
  for (const pattern of denyList) {
    if (pattern.test(html)) {
      throw new Error(i18n.global.t("errors.unsafeHtml"));
    }
  }
};

const CSP_META =
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;\">";

const BASE_STYLE =
  "<style>html,body{margin:0;padding:0;width:100%;height:100%;}</style>";

const injectCsp = (rawHtml: string): string => {
  if (/content-security-policy/i.test(rawHtml)) return rawHtml;

  if (/<head[\s>]/i.test(rawHtml)) {
    return rawHtml.replace(
      /<head(\s[^>]*)?>/i,
      (m) => `${m}${CSP_META}${BASE_STYLE}`,
    );
  }

  if (/<html[\s>]/i.test(rawHtml)) {
    return rawHtml.replace(
      /<html(\s[^>]*)?>/i,
      (m) => `${m}<head>${CSP_META}${BASE_STYLE}</head>`,
    );
  }

  return `<!doctype html><html><head>${CSP_META}${BASE_STYLE}</head><body>${rawHtml}</body></html>`;
};

const pickRenderRoot = (
  doc: Document,
  width: number,
  height: number,
): HTMLElement => {
  const posterRoot = doc.getElementById("poster-root");
  if (isHTMLElementInDoc(doc, posterRoot)) return posterRoot;

  const body = doc.body;
  if (!isHTMLElementInDoc(doc, body)) {
    throw new Error(i18n.global.t("errors.iframeBodyUnavailable"));
  }

  const singleChild =
    body.childElementCount === 1 ? body.firstElementChild : null;
  const root = isHTMLElementInDoc(doc, singleChild) ? singleChild : body;

  // Ensure predictable sizing even when LLM forgets to set it.
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  root.style.overflow = "hidden";

  return root;
};

const waitForFonts = async (doc: Document, timeoutMs = 2000): Promise<void> => {
  const fonts = (doc as unknown as { fonts?: { ready: Promise<unknown> } })
    .fonts;
  if (!fonts) return;

  await Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
};

const waitForBody = async (doc: Document, timeoutMs = 1500): Promise<void> => {
  const deadline = window.performance.now() + timeoutMs;
  while (window.performance.now() < deadline) {
    if (isHTMLElementInDoc(doc, doc.body)) return;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
  }

  throw new Error(i18n.global.t("errors.iframeBodyUnavailable"));
};

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(i18n.global.t("errors.canvasBlobFailed")));
        } else {
          resolve(blob);
        }
      },
      "image/png",
      0.95,
    );
  });
};

export const renderPosterHtmlToBlob = async (input: {
  html: string;
  width: number;
  height: number;
  scale: number;
  backgroundColor?: string;
}): Promise<Blob> => {
  assertHtmlSafe(input.html);
  const srcdoc = injectCsp(input.html);

  const iframe = document.createElement("iframe");
  iframe.sandbox.add("allow-same-origin");
  iframe.style.position = "absolute";
  iframe.style.left = "-10000px";
  iframe.style.top = "-10000px";
  iframe.style.width = `${input.width}px`;
  iframe.style.height = `${input.height}px`;
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(i18n.global.t("errors.iframeLoadTimeout")));
      }, 8000);

      iframe.addEventListener(
        "load",
        () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
        { once: true },
      );
    });

    iframe.srcdoc = srcdoc;
    await loaded;

    const doc = iframe.contentDocument;
    if (!doc) throw new Error(i18n.global.t("errors.iframeDocumentUnavailable"));

    await waitForBody(doc);
    await waitForFonts(doc);

    const root = pickRenderRoot(doc, input.width, input.height);

    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(root, {
      width: input.width,
      height: input.height,
      scale: input.scale,
      backgroundColor: input.backgroundColor ?? null,
      logging: false,
      useCORS: true,
      allowTaint: false,
      windowWidth: input.width,
      windowHeight: input.height,
    });

    return await canvasToBlob(canvas);
  } finally {
    document.body.removeChild(iframe);
  }
};
