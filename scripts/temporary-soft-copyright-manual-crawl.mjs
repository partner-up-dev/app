import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.PARTNERUP_BASE_URL || 'https://app.partner-up.cn';
const OUT_DIR = path.resolve(process.env.CRAWL_OUT_DIR || 'soft-copyright-manual-evidence');
const SRC_DIR = path.resolve('apps/web/src');
const MAX_PAGES = Number(process.env.MAX_PAGES || 35);
const SOURCE_COMMIT = process.env.SOURCE_COMMIT || '30f51b96e2498b4b85014552512a31a7345d86cb';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'screenshots'), { recursive: true });

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const sourceFiles = walk(SRC_DIR).filter((file) => /\.(?:ts|vue)$/.test(file));
const routeEvidence = [];
const staticPaths = new Set(['/']);
const pathPattern = /\bpath\s*:\s*['"`]([^'"`]+)['"`]/g;
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (!/(?:createRouter|RouteRecordRaw|routes\s*=|children\s*:)/.test(text)) continue;
  let match;
  while ((match = pathPattern.exec(text))) {
    const value = match[1].trim();
    routeEvidence.push({ file: path.relative(process.cwd(), file), path: value });
    if (value.startsWith('/') && !value.includes(':') && !value.includes('*')) staticPaths.add(value);
  }
}

for (const candidate of [
  '/create', '/discover', '/events', '/profile', '/me', '/about', '/privacy', '/terms',
  '/admin/bi?code=2026zcb'
]) staticPaths.add(candidate);

fs.writeFileSync(path.join(OUT_DIR, 'source-routes.json'), JSON.stringify(routeEvidence, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'crawl-metadata.json'), JSON.stringify({
  baseUrl: BASE_URL,
  sourceCommit: SOURCE_COMMIT,
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  generatedAt: new Date().toISOString(),
}, null, 2));

function normalizeUrl(input) {
  try {
    const url = new URL(input, BASE_URL);
    if (url.origin !== new URL(BASE_URL).origin) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:code|token|state|ticket)$/i.test(key) && key !== 'code') url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function safeName(value, index) {
  const u = new URL(value);
  const raw = `${String(index).padStart(2, '0')}-${u.pathname}${u.search}`
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return raw || `${String(index).padStart(2, '0')}-root`;
}

const queue = [...staticPaths].map((p) => normalizeUrl(p)).filter(Boolean);
const queued = new Set(queue);
const visited = new Set();
const pages = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  userAgent: 'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',
});
context.setDefaultTimeout(12000);

while (queue.length && pages.length < MAX_PAGES) {
  const requestedUrl = queue.shift();
  if (!requestedUrl || visited.has(requestedUrl)) continue;
  visited.add(requestedUrl);

  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('requestfailed', (req) => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || '' }));

  let navigationError = null;
  let responseStatus = null;
  try {
    const response = await page.goto(requestedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    responseStatus = response?.status() ?? null;
    await page.waitForTimeout(2500);
  } catch (error) {
    navigationError = String(error);
  }

  const finalUrl = page.url();
  let snapshot = {};
  try {
    snapshot = await page.evaluate(() => {
      const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const text = clean(document.body?.innerText || '');
      const collect = (selector, mapper) => [...document.querySelectorAll(selector)].map(mapper).filter(Boolean);
      return {
        title: document.title,
        lang: document.documentElement.lang,
        headings: collect('h1,h2,h3', (el) => ({ level: el.tagName, text: clean(el.textContent) })).slice(0, 80),
        buttons: collect('button,[role="button"]', (el) => ({
          text: clean(el.textContent),
          ariaLabel: el.getAttribute('aria-label'),
          disabled: el.matches(':disabled,[aria-disabled="true"]'),
        })).slice(0, 100),
        links: collect('a[href]', (el) => ({ text: clean(el.textContent), href: el.href })).slice(0, 150),
        fields: collect('input,textarea,select', (el) => ({
          tag: el.tagName,
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
        })).slice(0, 100),
        dialogs: collect('[role="dialog"],dialog', (el) => clean(el.textContent)).slice(0, 20),
        text: text.slice(0, 12000),
        bodyHeight: document.documentElement.scrollHeight,
      };
    });
  } catch (error) {
    snapshot = { evaluationError: String(error) };
  }

  const index = pages.length + 1;
  const name = safeName(finalUrl || requestedUrl, index);
  const viewportScreenshot = path.join(OUT_DIR, 'screenshots', `${name}-viewport.png`);
  const fullScreenshot = path.join(OUT_DIR, 'screenshots', `${name}-full.png`);
  try { await page.screenshot({ path: viewportScreenshot, fullPage: false }); } catch {}
  try { await page.screenshot({ path: fullScreenshot, fullPage: true }); } catch {}

  const entry = {
    index,
    requestedUrl,
    finalUrl,
    responseStatus,
    navigationError,
    viewportScreenshot: path.relative(OUT_DIR, viewportScreenshot),
    fullScreenshot: path.relative(OUT_DIR, fullScreenshot),
    ...snapshot,
    consoleErrors: consoleErrors.slice(0, 30),
    failedRequests: failedRequests.slice(0, 30),
  };
  pages.push(entry);
  fs.writeFileSync(path.join(OUT_DIR, 'pages.json'), JSON.stringify(pages, null, 2));

  for (const link of snapshot.links || []) {
    const normalized = normalizeUrl(link.href);
    if (!normalized || visited.has(normalized) || queued.has(normalized)) continue;
    queued.add(normalized);
    queue.push(normalized);
  }

  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT_DIR, 'pages.json'), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'crawl-summary.json'), JSON.stringify({
  requestedCount: visited.size,
  capturedCount: pages.length,
  discoveredCount: queued.size,
  sourceRouteCount: routeEvidence.length,
  sourceCommit: SOURCE_COMMIT,
}, null, 2));
