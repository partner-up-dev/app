import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, "src");
const baselinePath = path.join(appRoot, "token-governance-baseline.json");
const sysTokenPath = fileURLToPath(
  import.meta.resolve("@partner-up-dev/design-web/styles/_sys.scss"),
);
const strict = process.argv.includes("--strict");

const scanRoots = [
  path.join(srcRoot, "pages"),
  path.join(srcRoot, "domains"),
  path.join(srcRoot, "shared"),
];

const ignoredPathFragments = [
  `${path.sep}styles${path.sep}`,
  `${path.sep}locales${path.sep}`,
  `${path.sep}router${path.sep}`,
];

const landingVisualExceptionPaths = [
  { type: "file", path: path.join(srcRoot, "pages", "HomePage.vue") },
  { type: "dir", path: path.join(srcRoot, "domains", "landing") },
  {
    type: "dir",
    path: path.join(srcRoot, "domains", "event", "ui", "sections", "landing"),
  },
];

const splashVisualExceptionPaths = [
  {
    type: "file",
    path: path.join(
      srcRoot,
      "domains",
      "event",
      "ui",
      "primitives",
      "FormModeLongPressButton.vue",
    ),
  },
  {
    type: "file",
    path: path.join(
      srcRoot,
      "processes",
      "route-handoff",
      "LiquidWaveSplash.vue",
    ),
  },
];

const componentContractPaths = [
  {
    type: "file",
    path: path.join(srcRoot, "shared", "ui", "forms", "ToggleSwitch.vue"),
  },
  {
    type: "file",
    path: path.join(srcRoot, "shared", "ui", "forms", "MultiStopToggle.vue"),
  },
];

const rules = [
  {
    id: "no-local-color-mix",
    description:
      "Do not invent reusable tint logic in consumers. Prefer sys, dcs, or shared component contracts.",
    regex: /\bcolor-mix\(/g,
    allowLandingVisualException: true,
  },
  {
    id: "no-local-clamp",
    description:
      "Do not invent adaptive formulas in consumers. Prefer sys, dcs, or shared component contracts.",
    regex: /\bclamp\(/g,
    allowLandingVisualException: true,
  },
  {
    id: "no-hardcoded-font-size",
    description:
      "Do not hardcode typography sizes in consumers. Prefer sys typography tokens.",
    regex: /\bfont-size:\s*(?!0(?:px|rem|em|%)?\b)(\d*\.?\d+)(rem|px)\b/g,
    allowLandingVisualException: true,
  },
  {
    id: "no-hardcoded-padding",
    description:
      "Do not hardcode governed spacing in consumers when sys or shared treatments should own it.",
    regex: /\bpadding:\s*(?!0(?:[ ;]|$))[^;]*(\d*\.?\d+)(rem|px)\b/g,
    skipLine: (line) => line.includes("var(") || line.includes("clamp("),
  },
  {
    id: "no-hardcoded-gap",
    description:
      "Do not hardcode governed gap values in consumers when sys or shared treatments should own it.",
    regex: /\bgap:\s*(?!0(?:[ ;]|$))[^;]*(\d*\.?\d+)(rem|px)\b/g,
    skipLine: (line) => line.includes("var(") || line.includes("clamp("),
  },
  {
    id: "no-hardcoded-radius",
    description:
      "Do not hardcode radius values in consumers. Prefer sys radius tokens unless the value is intrinsic and explicitly accepted.",
    regex:
      /\bborder-radius:\s*(?!0(?:[ ;]|$)|999px\b|50%\b)(\d*\.?\d+)(rem|px)\b/g,
  },
];

const walkMatching = async (dir, fileNameRegex) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return await walkMatching(fullPath, fileNameRegex);
      }
      if (!entry.isFile()) return [];
      if (!fileNameRegex.test(entry.name)) return [];
      return [fullPath];
    }),
  );
  return files.flat();
};

const walk = async (dir) => await walkMatching(dir, /\.(vue|scss)$/);

const walkSysColorTokenFiles = async (dir) =>
  await walkMatching(dir, /\.(vue|scss|ts)$/);

const readBaseline = async () => {
  try {
    const raw = await fs.readFile(baselinePath, "utf8");
    const parsed = JSON.parse(raw);
    return new Set(
      (parsed.entries ?? []).map((entry) =>
        `${entry.path}::${entry.rule}::${entry.text}`,
      ),
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return new Set();
    }
    throw error;
  }
};

const relativePath = (filePath) =>
  path.relative(appRoot, filePath).split(path.sep).join("/");

const shouldIgnorePath = (filePath) =>
  ignoredPathFragments.some((fragment) => filePath.includes(fragment));

const isLandingVisualExceptionPath = (filePath) =>
  landingVisualExceptionPaths.some((entry) => {
    if (entry.type === "file") {
      return filePath === entry.path;
    }
    return filePath.startsWith(`${entry.path}${path.sep}`);
  });

const isSplashVisualExceptionPath = (filePath) =>
  splashVisualExceptionPaths.some((entry) => {
    if (entry.type === "file") {
      return filePath === entry.path;
    }
    return filePath.startsWith(`${entry.path}${path.sep}`);
  });

const isComponentContractPath = (filePath) =>
  componentContractPaths.some((entry) => {
    if (entry.type === "file") {
      return filePath === entry.path;
    }
    return filePath.startsWith(`${entry.path}${path.sep}`);
  });

const isComponentContractLine = (filePath, line) =>
  isComponentContractPath(filePath) && /^\s*--[a-z0-9-]+:/.test(line);

const findMatchingParenEnd = (source, openParenIndex) => {
  let depth = 0;

  for (let index = openParenIndex; index < source.length; index += 1) {
    const character = source[index];

    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const extractThemeColorTokenNames = (source, themeName) => {
  const themeStart = source.indexOf(`$${themeName}:`);
  if (themeStart === -1) {
    return new Set();
  }

  const colorStart = source.indexOf("color:", themeStart);
  if (colorStart === -1) {
    return new Set();
  }

  const colorMapStart = source.indexOf("(", colorStart);
  if (colorMapStart === -1) {
    return new Set();
  }

  const colorMapEnd = findMatchingParenEnd(source, colorMapStart);
  if (colorMapEnd === -1) {
    return new Set();
  }

  const colorMapSource = source.slice(colorMapStart + 1, colorMapEnd);
  const tokenNames = new Set();

  for (const match of colorMapSource.matchAll(/^\s{4}([a-z0-9-]+):/gm)) {
    tokenNames.add(match[1]);
  }

  return tokenNames;
};

const collectDefinedSysColorTokens = async () => {
  const raw = await fs.readFile(sysTokenPath, "utf8");

  return {
    dark: extractThemeColorTokenNames(raw, "dark"),
    light: extractThemeColorTokenNames(raw, "light"),
  };
};

const collectUndefinedSysColorTokenFindings = async (definedTokensByTheme) => {
  const files = (await walkSysColorTokenFiles(srcRoot)).filter(
    (filePath) => !shouldIgnorePath(filePath),
  );
  const findings = [];
  const seenFindings = new Set();
  const sysColorTokenRegex = /var\(\s*(--sys-color-([a-z0-9-]+))/g;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/);

    lines.forEach((line, index) => {
      sysColorTokenRegex.lastIndex = 0;

      for (
        let match = sysColorTokenRegex.exec(line);
        match;
        match = sysColorTokenRegex.exec(line)
      ) {
        const fullTokenName = match[1];
        const colorTokenName = match[2];

        for (const [themeName, definedTokens] of Object.entries(
          definedTokensByTheme,
        )) {
          if (definedTokens.has(colorTokenName)) {
            continue;
          }

          const findingKey = `${filePath}::${index + 1}::${themeName}::${fullTokenName}`;
          if (seenFindings.has(findingKey)) {
            continue;
          }
          seenFindings.add(findingKey);

          findings.push({
            path: relativePath(filePath),
            line: index + 1,
            rule: "undefined-sys-color-token",
            description: `${fullTokenName} is used but is not defined in the ${themeName} sys color token map.`,
            text: line.trim(),
          });
        }
      }
    });
  }

  return findings;
};

const collectFindings = async () => {
  const files = (
    await Promise.all(scanRoots.map(async (scanRoot) => await walk(scanRoot)))
  )
    .flat()
    .filter((filePath) => !shouldIgnorePath(filePath));

  const findings = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (line.includes("token-governance-ignore")) {
        return;
      }
      if (isComponentContractLine(filePath, line)) {
        return;
      }
      for (const rule of rules) {
        if (
          rule.allowLandingVisualException &&
          (isLandingVisualExceptionPath(filePath) ||
            isSplashVisualExceptionPath(filePath))
        ) {
          continue;
        }
        if (rule.skipLine?.(line)) {
          continue;
        }
        rule.regex.lastIndex = 0;
        if (!rule.regex.test(line)) continue;
        findings.push({
          path: relativePath(filePath),
          line: index + 1,
          rule: rule.id,
          description: rule.description,
          text: line.trim(),
        });
      }
    });
  }

  return findings;
};

const main = async () => {
  const [baseline, definedSysColorTokens, governanceFindings] =
    await Promise.all([
      readBaseline(),
      collectDefinedSysColorTokens(),
      collectFindings(),
    ]);
  const undefinedSysColorTokenFindings =
    await collectUndefinedSysColorTokenFindings(definedSysColorTokens);
  const findings = [
    ...governanceFindings,
    ...undefinedSysColorTokenFindings,
  ];

  const unmatched = findings.filter(
    (finding) =>
      !baseline.has(`${finding.path}::${finding.rule}::${finding.text}`),
  );

  if (unmatched.length === 0) {
    console.log("token-governance: no findings outside baseline");
    return;
  }

  console.log(
    `token-governance: found ${unmatched.length} finding(s) outside baseline`,
  );

  for (const finding of unmatched) {
    console.log(
      `- [${finding.rule}] ${finding.path}:${finding.line}\n  ${finding.text}\n  ${finding.description}`,
    );
  }

  if (strict) {
    process.exitCode = 1;
  }
};

await main();
