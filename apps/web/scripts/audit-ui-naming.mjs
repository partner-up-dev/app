import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, "src");
const outputJson = process.argv.includes("--json");
const includeRootClassDrift = process.argv.includes("--include-root-class");

const componentRoots = [
  path.join(srcRoot, "pages"),
  path.join(srcRoot, "domains"),
  path.join(srcRoot, "shared"),
  path.join(srcRoot, "processes"),
];

const weakWords = new Set([
  "Base",
  "Box",
  "Common",
  "Component",
  "Container",
  "Content",
  "Full",
  "Info",
  "Inner",
  "Left",
  "Main",
  "Mini",
  "Minium",
  "Outer",
  "Right",
  "Simple",
  "Small",
  "Top",
  "Wrapper",
]);

const roleSuffixes = [
  "Action",
  "ActionBar",
  "Aside",
  "Avatar",
  "Badge",
  "Button",
  "Card",
  "Chip",
  "Dialog",
  "Drawer",
  "Editor",
  "Field",
  "FilterBar",
  "Footer",
  "Form",
  "Gate",
  "Grid",
  "Header",
  "Item",
  "Layout",
  "List",
  "Map",
  "Modal",
  "Notice",
  "Overlay",
  "Page",
  "Panel",
  "Picker",
  "Prompt",
  "Rail",
  "Row",
  "Scaffold",
  "Section",
  "Selector",
  "Shell",
  "Surface",
  "Table",
  "Template",
  "Toast",
  "Toolbar",
  "View",
];

const variantPropNames = new Set(["appearance", "layout", "mode", "size", "tone", "variant"]);

const weakWordGuidance = {
  Base: "Prefer naming the actual abstraction contract.",
  Box: "Prefer the structural role, such as Card, Panel, or Field.",
  Common: "Prefer the shared semantic role or a variant on one component.",
  Component: "Prefer the UI role.",
  Container: "Prefer Layout, Section, Panel, or the owned domain object.",
  Content: "Prefer the owned surface role, such as Editor, List, Panel, or Body.",
  Full: "Prefer a variant on the same semantic component when only density/layout differs.",
  Info: "Prefer Facts, Meta, Summary, Details, or another precise data role.",
  Inner: "Prefer the element role.",
  Left: "Prefer leading, summary, media, or another semantic role.",
  Main: "Use only when there is a real layout sibling such as nav or aside.",
  Mini: "Prefer a size or density variant.",
  Minium: "Likely a typo or weak size qualifier; prefer a variant.",
  Outer: "Prefer the element role.",
  Right: "Prefer trailing, actions, pricing, or another semantic role.",
  Simple: "Prefer a variant when behavior is the same.",
  Small: "Prefer a size or density variant.",
  Top: "Prefer header or leading context.",
  Wrapper: "Prefer the reason it wraps, such as Shell, Field, or ActionBar.",
};

const knownFalsePositivePatterns = [
  /MiniProgram/,
  /FullScreenPageScaffold/,
  /BottomDrawer/,
  /BaseUrl/,
  /FullAddress/,
  /scrollLeft/,
  /ArrowLeft/,
  /ArrowRight/,
];

const allowedWeakComponentNames = new Set(["InfoRow", "InfoRowAction"]);

const walkVueFiles = async (dir) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dist" || entry.name === "node_modules") return [];
        return await walkVueFiles(fullPath);
      }
      if (!entry.isFile() || !entry.name.endsWith(".vue")) return [];
      return [fullPath];
    }),
  );
  return nested.flat();
};

const relativePath = (filePath) => path.relative(appRoot, filePath).split(path.sep).join("/");

const splitPascal = (value) => value.match(/[A-Z]+(?=[A-Z][a-z]|$)|[A-Z]?[a-z]+|\d+/g) ?? [value];

const kebab = (value) =>
  splitPascal(value)
    .map((part) => part.toLowerCase())
    .join("-");

const extractBlock = (source, tagName) => {
  const match = source.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1] ?? "";
};

const firstTemplateTag = (template) => {
  const stripped = template
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<template\s+[^>]*>/g, "")
    .trim();
  return stripped.match(/^<([A-Za-z][\w.-]*)\b/)?.[1] ?? null;
};

const firstStaticClass = (template) => {
  const stripped = template
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<template\s+[^>]*>/g, "")
    .trim();
  const tagMatch = stripped.match(/^<([A-Za-z][\w.-]*)\b([^>]*)>/);
  const match = tagMatch?.[2].match(/\bclass="([^"]+)"/);
  if (!match) return null;
  return match[1].split(/\s+/).find((entry) => !entry.includes(":")) ?? null;
};

const extractImports = (script) =>
  Array.from(script.matchAll(/import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+["'][^"']+\.vue["']/g)).map(
    (match) => match[1],
  );

const extractProps = (script) => {
  const props = new Set();
  for (const match of script.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\??\s*:/g)) {
    props.add(match[1]);
  }
  return props;
};

const extractI18nNamespaces = (source) => {
  const namespaces = new Set();
  for (const match of source.matchAll(/\bt\(\s*["']([A-Za-z0-9_-]+)\./g)) {
    namespaces.add(match[1]);
  }
  return [...namespaces].sort();
};

const roleSuffix = (name) =>
  roleSuffixes
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((suffix) => name.endsWith(suffix)) ?? null;

const stripSuffix = (name, suffix) =>
  suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;

const normalizeSemanticStem = (name) =>
  splitPascal(stripSuffix(name, roleSuffix(name)))
    .filter((part) => !weakWords.has(part))
    .join("");

const isKnownFalsePositive = (word, name) =>
  allowedWeakComponentNames.has(name) ||
  knownFalsePositivePatterns.some((pattern) => pattern.test(name)) ||
  (word === "Content" && /\bcontent\b/i.test(name));

const classifyLayer = (filePath) => {
  const rel = relativePath(filePath);
  if (rel.startsWith("src/pages/")) return "page";
  if (rel.startsWith("src/shared/ui/")) return "shared-ui";
  if (rel.startsWith("src/shared/")) return "shared";
  if (rel.startsWith("src/processes/")) return "process";
  if (rel.startsWith("src/domains/")) return "domain";
  return "unknown";
};

const readComponent = async (filePath) => {
  const source = await fs.readFile(filePath, "utf8");
  const fileName = path.basename(filePath, ".vue");
  const template = extractBlock(source, "template");
  const script = extractBlock(source, "script");
  const suffix = roleSuffix(fileName);
  const props = extractProps(script);

  return {
    filePath,
    relPath: relativePath(filePath),
    fileName,
    layer: classifyLayer(filePath),
    suffix,
    stem: stripSuffix(fileName, suffix),
    normalizedStem: normalizeSemanticStem(fileName),
    rootTag: firstTemplateTag(template),
    rootClass: firstStaticClass(template),
    imports: extractImports(script),
    props: [...props].sort(),
    variantProps: [...props].filter((prop) => variantPropNames.has(prop)).sort(),
    i18nNamespaces: extractI18nNamespaces(source),
    words: splitPascal(fileName),
  };
};

const findWeakWordFindings = (component) =>
  component.words
    .filter((word) => weakWords.has(word) && !isKnownFalsePositive(word, component.fileName))
    .map((word) => ({
      severity: word === "Content" || word === "Common" ? "medium" : "low",
      rule: "weak-name-word",
      path: component.relPath,
      component: component.fileName,
      message: `${component.fileName} uses weak word "${word}". ${weakWordGuidance[word]}`,
    }));

const findShapeFindings = (component) => {
  const findings = [];
  if (includeRootClassDrift && component.rootClass) {
    const expected = kebab(component.fileName);
    const expectedStem = component.suffix ? kebab(component.stem) : expected;
    if (
      component.rootClass !== expected &&
      component.rootClass !== expectedStem &&
      !component.rootClass.startsWith(`${expected}__`) &&
      !component.rootClass.startsWith(`${expectedStem}__`)
    ) {
      findings.push({
        severity: "low",
        rule: "root-class-drift",
        path: component.relPath,
        component: component.fileName,
        message: `Root class "${component.rootClass}" does not align with component name "${component.fileName}".`,
      });
    }
  }
  if (component.layer !== "page" && component.suffix === "Page") {
    findings.push({
      severity: "medium",
      rule: "page-outside-pages",
      path: component.relPath,
      component: component.fileName,
      message: "Component suffix Page should normally live under src/pages.",
    });
  }
  return findings;
};

const sameUsageFamily = (components) => {
  const roots = new Set(components.map((component) => component.rootTag).filter(Boolean));
  const suffixes = new Set(components.map((component) => component.suffix).filter(Boolean));
  return roots.size <= 2 && suffixes.size === 1;
};

const findSplitFindings = (components) => {
  const bySuffix = new Map();
  for (const component of components) {
    if (!component.suffix) continue;
    const group = bySuffix.get(component.suffix) ?? [];
    group.push(component);
    bySuffix.set(component.suffix, group);
  }

  const findings = [];
  for (const [suffix, group] of bySuffix) {
    if (group.length < 2) continue;
    if (suffix === "Page" || suffix === "Modal") continue;

    const weakVariantGroup = group.filter((component) =>
      component.words.some((word) =>
        ["Common", "Full", "Mini", "Minium", "Simple", "Small"].includes(word),
      ),
    );

    if (weakVariantGroup.length >= 2 && sameUsageFamily(group)) {
      findings.push({
        severity: "medium",
        rule: "variant-split-candidate",
        path: weakVariantGroup.map((component) => component.relPath).join(", "),
        component: `${suffix} family`,
        message: `Multiple ${suffix} components use weak size/shared words. Consider one ${suffix} component with variant/slots if their purpose is the same.`,
      });
    }
  }

  const footers = components.filter(
    (component) =>
      component.suffix === "Footer" &&
      component.rootTag === "footer" &&
      component.variantProps.length === 0,
  );
  if (footers.length >= 2) {
    findings.push({
      severity: "medium",
      rule: "semantic-role-split-candidate",
      path: footers.map((component) => component.relPath).join(", "),
      component: "Footer family",
      message:
        "Multiple footer components share the same semantic role and root tag without a variant API. Consider one PageFooter with variant/slots if their purpose is the same.",
    });
  }

  const actionBars = components.filter((component) => component.suffix === "ActionBar");
  const sharedActionBars = actionBars.filter((component) => component.words.includes("Shared"));
  for (const component of sharedActionBars) {
    findings.push({
      severity: "low",
      rule: "shared-prefix-in-domain-ui",
      path: component.relPath,
      component: component.fileName,
      message:
        "Domain UI named Shared* often hides the actual contract. Prefer the owned surface role or a variant on the parent component.",
    });
  }

  return findings;
};

const summarize = (components, findings) => ({
  scannedComponents: components.length,
  findings: findings.length,
  bySeverity: findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    return counts;
  }, {}),
  byRule: findings.reduce((counts, finding) => {
    counts[finding.rule] = (counts[finding.rule] ?? 0) + 1;
    return counts;
  }, {}),
});

const printText = (components, findings) => {
  const summary = summarize(components, findings);
  console.log("ui-naming-audit: report only");
  console.log(`scanned components: ${summary.scannedComponents}`);
  console.log(`findings: ${summary.findings}`);
  console.log("root-class drift: disabled by default; pass --include-root-class to inspect it");

  if (findings.length === 0) {
    console.log("no findings");
    return;
  }

  for (const finding of findings) {
    console.log("");
    console.log(`[${finding.severity}] ${finding.rule}`);
    console.log(`  ${finding.path}`);
    console.log(`  ${finding.message}`);
  }
};

const main = async () => {
  const files = (await Promise.all(componentRoots.map(walkVueFiles))).flat();
  const components = await Promise.all(files.map(readComponent));
  const findings = [
    ...components.flatMap(findWeakWordFindings),
    ...components.flatMap(findShapeFindings),
    ...findSplitFindings(components),
  ].sort((a, b) => {
    const severityRank = { medium: 0, low: 1 };
    return (
      (severityRank[a.severity] ?? 2) - (severityRank[b.severity] ?? 2) ||
      a.rule.localeCompare(b.rule) ||
      a.path.localeCompare(b.path)
    );
  });

  if (outputJson) {
    console.log(JSON.stringify({ summary: summarize(components, findings), findings }, null, 2));
    return;
  }

  printText(components, findings);
};

await main();
