import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";
import { getScenarioEnvironment } from "../environment/scenario-environment";

let browser: Browser | null = null;

export async function getScenarioBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: process.env.HEADED === "true" ? false : true,
    });
  }
  return browser;
}

export async function closeScenarioBrowser(): Promise<void> {
  if (!browser) {
    return;
  }

  const browserToClose = browser;
  browser = null;
  await browserToClose.close();
}

export async function withScenarioPage(
  run: (page: Page) => Promise<void>,
  contextOptions: BrowserContextOptions = {},
): Promise<void> {
  const activeBrowser = await getScenarioBrowser();
  const { frontendBaseUrl } = getScenarioEnvironment();
  const context = await activeBrowser.newContext({
    baseURL: frontendBaseUrl,
    hasTouch: true,
    isMobile: true,
    viewport: {
      width: 390,
      height: 844,
    },
    ...contextOptions,
  });
  const page = await context.newPage();

  try {
    await run(page);
  } finally {
    await context.close();
  }
}
