import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const RULES = Object.freeze({
  BACKEND_CONTROLLER_TO_REPOSITORY: "backend/no-controller-to-repository",
  BACKEND_PR_TO_PR_CORE: "backend/no-canonical-pr-to-pr-core",
  BACKEND_CROSS_DOMAIN_PRIVATE: "backend/no-cross-domain-private-import",
  WEB_SHARED_TO_DOMAIN: "web/no-shared-to-domain",
  WEB_MODEL_TO_QUERY: "web/no-model-to-query",
  WEB_MODEL_TO_TRANSPORT: "web/no-model-to-transport",
  WEB_UI_PRIMITIVE_TO_QUERY: "web/no-ui-primitive-to-query",
  WEB_QUERY_TO_PAGE: "web/no-query-to-page",
  WEB_PAGE_RAW_RPC: "web/no-page-raw-rpc",
  WEB_UI_RAW_RPC: "web/no-ui-raw-rpc",
});

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".vue"]);
const RESOLUTION_SUFFIXES = ["", ".ts", ".tsx", ".vue", "/index.ts", "/index.tsx", "/index.vue"];

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function isProductionSource(file) {
  return SOURCE_EXTENSIONS.has(path.extname(file)) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file);
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    })
    .sort((left, right) => left.localeCompare(right));
}

function maskVueToScripts(source) {
  const masked = Array.from(source, (character) => (character === "\n" ? "\n" : " "));
  const scriptPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/giu;

  for (const match of source.matchAll(scriptPattern)) {
    const fullMatch = match[0];
    const script = match[1];
    const matchStart = match.index ?? 0;
    const contentOffset = fullMatch.indexOf(script);
    const contentStart = matchStart + contentOffset;

    for (let index = 0; index < script.length; index += 1) {
      masked[contentStart + index] = script[index];
    }
  }

  return masked.join("");
}

function parseSource(relativePath, source) {
  const parseText = relativePath.endsWith(".vue") ? maskVueToScripts(source) : source;
  const scriptKind = relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    relativePath,
    parseText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const imports = [];
  const rawRpc = [];

  function addImport(node, specifier, typeOnly, kind) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    imports.push({ kind, line: position.line + 1, specifier, typeOnly });
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      addImport(node, node.moduleSpecifier.text, node.importClause?.isTypeOnly === true, "import");
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      addImport(node, node.moduleSpecifier.text, node.isTypeOnly, "export");
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      addImport(node, node.arguments[0].text, false, "dynamic-import");
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "api" &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "client" || node.expression.text === "adminClient")
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      rawRpc.push({ client: `${node.expression.text}.api`, line: position.line + 1 });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { imports, rawRpc };
}

function resolveImport(repositoryRoot, sourceFile, specifier) {
  let unresolvedTarget;

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    unresolvedTarget = path.resolve(repositoryRoot, path.dirname(sourceFile), specifier);
  } else if (sourceFile.startsWith("apps/web/src/") && specifier.startsWith("@/")) {
    unresolvedTarget = path.resolve(repositoryRoot, "apps/web/src", specifier.slice(2));
  } else {
    return undefined;
  }

  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = `${unresolvedTarget}${suffix}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return normalizePath(path.relative(repositoryRoot, candidate));
    }
  }

  return undefined;
}

function backendDomain(file) {
  return file.match(/^apps\/backend\/src\/domains\/([^/]+)\//u)?.[1];
}

const BACKEND_PUBLIC_ENTRYPOINTS = new Set([
  "index.ts",
  "commands.ts",
  "queries.ts",
  "contracts.ts",
  "events.ts",
  "ports.ts",
]);

function isBackendDomainPublicEntrypoint(target, domain) {
  const domainRoot = `apps/backend/src/domains/${domain}/`;
  if (!target.startsWith(domainRoot)) return false;
  return BACKEND_PUBLIC_ENTRYPOINTS.has(target.slice(domainRoot.length));
}

function finding(rule, source, target, line, typeOnly = false) {
  return {
    fingerprint: `${rule}|${source}|${target}`,
    line,
    rule,
    source,
    target,
    typeOnly,
  };
}

function evaluateEdge(edge) {
  const findings = [];
  const sourceDomain = backendDomain(edge.source);
  const targetDomain = backendDomain(edge.target);

  if (
    edge.source.startsWith("apps/backend/src/controllers/") &&
    edge.target.startsWith("apps/backend/src/repositories/")
  ) {
    findings.push(
      finding(
        RULES.BACKEND_CONTROLLER_TO_REPOSITORY,
        edge.source,
        edge.target,
        edge.line,
        edge.typeOnly,
      ),
    );
  }

  if (sourceDomain === "pr" && targetDomain === "pr-core") {
    findings.push(
      finding(RULES.BACKEND_PR_TO_PR_CORE, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  if (
    sourceDomain &&
    targetDomain &&
    sourceDomain !== targetDomain &&
    !(sourceDomain === "pr" && targetDomain === "pr-core") &&
    !isBackendDomainPublicEntrypoint(edge.target, targetDomain)
  ) {
    findings.push(
      finding(
        RULES.BACKEND_CROSS_DOMAIN_PRIVATE,
        edge.source,
        edge.target,
        edge.line,
        edge.typeOnly,
      ),
    );
  }

  if (
    edge.source.startsWith("apps/web/src/shared/") &&
    edge.target.startsWith("apps/web/src/domains/")
  ) {
    findings.push(
      finding(RULES.WEB_SHARED_TO_DOMAIN, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  if (
    /^apps\/web\/src\/domains\/[^/]+\/model\//u.test(edge.source) &&
    /^apps\/web\/src\/domains\/[^/]+\/queries\//u.test(edge.target)
  ) {
    findings.push(
      finding(RULES.WEB_MODEL_TO_QUERY, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  if (
    /^apps\/web\/src\/domains\/[^/]+\/model\//u.test(edge.source) &&
    /^apps\/web\/src\/lib\/(?:rpc|admin-rpc)\.(?:ts|tsx)$/u.test(edge.target)
  ) {
    findings.push(
      finding(RULES.WEB_MODEL_TO_TRANSPORT, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  if (
    /^apps\/web\/src\/domains\/[^/]+\/ui\/primitives\//u.test(edge.source) &&
    /^apps\/web\/src\/domains\/[^/]+\/queries\//u.test(edge.target)
  ) {
    findings.push(
      finding(RULES.WEB_UI_PRIMITIVE_TO_QUERY, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  if (
    /^apps\/web\/src\/domains\/[^/]+\/queries\//u.test(edge.source) &&
    edge.target.startsWith("apps/web/src/pages/")
  ) {
    findings.push(
      finding(RULES.WEB_QUERY_TO_PAGE, edge.source, edge.target, edge.line, edge.typeOnly),
    );
  }

  return findings;
}

function evaluateRawRpc(source, rawRpc) {
  if (source.startsWith("apps/web/src/pages/")) {
    return finding(RULES.WEB_PAGE_RAW_RPC, source, rawRpc.client, rawRpc.line);
  }

  if (/^apps\/web\/src\/domains\/[^/]+\/ui\//u.test(source)) {
    return finding(RULES.WEB_UI_RAW_RPC, source, rawRpc.client, rawRpc.line);
  }

  return undefined;
}

function deduplicateAndSort(findings) {
  const byFingerprint = new Map();
  for (const item of findings) {
    const previous = byFingerprint.get(item.fingerprint);
    if (!previous || item.line < previous.line) byFingerprint.set(item.fingerprint, item);
  }

  return [...byFingerprint.values()].sort((left, right) =>
    [left.rule, left.source, left.target, left.line]
      .join("|")
      .localeCompare([right.rule, right.source, right.target, right.line].join("|")),
  );
}

export function scanArchitecture(repositoryRoot) {
  const absoluteRoot = path.resolve(repositoryRoot);
  const roots = [
    path.join(absoluteRoot, "apps/backend/src"),
    path.join(absoluteRoot, "apps/web/src"),
  ];
  const files = roots
    .flatMap(walk)
    .filter(isProductionSource)
    .sort((left, right) => left.localeCompare(right));
  const digest = createHash("sha256");
  const edges = [];
  const unresolved = [];
  const rawRpcFindings = [];

  for (const absoluteFile of files) {
    const relativeFile = normalizePath(path.relative(absoluteRoot, absoluteFile));
    const source = fs.readFileSync(absoluteFile, "utf8");
    digest.update(relativeFile).update("\0").update(source).update("\0");
    const parsed = parseSource(relativeFile, source);

    for (const imported of parsed.imports) {
      const target = resolveImport(absoluteRoot, relativeFile, imported.specifier);
      if (!target) {
        if (imported.specifier.startsWith(".") || imported.specifier.startsWith("@/")) {
          unresolved.push({
            line: imported.line,
            source: relativeFile,
            specifier: imported.specifier,
          });
        }
        continue;
      }
      edges.push({ ...imported, source: relativeFile, target });
    }

    for (const rawRpc of parsed.rawRpc) {
      const item = evaluateRawRpc(relativeFile, rawRpc);
      if (item) rawRpcFindings.push(item);
    }
  }

  edges.sort((left, right) =>
    [left.source, left.target, left.line]
      .join("|")
      .localeCompare([right.source, right.target, right.line].join("|")),
  );
  unresolved.sort((left, right) =>
    [left.source, left.specifier, left.line]
      .join("|")
      .localeCompare([right.source, right.specifier, right.line].join("|")),
  );

  const findings = deduplicateAndSort([...edges.flatMap(evaluateEdge), ...rawRpcFindings]);
  return {
    schemaVersion: 1,
    scopeDigest: digest.digest("hex"),
    metrics: {
      edges: edges.length,
      files: files.length,
      findings: findings.length,
      unresolvedImports: unresolved.length,
    },
    findings,
    unresolved,
  };
}

export function classifyReport(report, baseline) {
  const known = new Set(baseline?.knownFindings ?? []);
  const current = new Set(report.findings.map((item) => item.fingerprint));
  const findings = report.findings.map((item) => ({
    ...item,
    classification: known.has(item.fingerprint) ? "known" : "new",
    governance:
      baseline?.exceptions?.[item.fingerprint] ??
      baseline?.ruleClassifications?.[item.rule] ??
      undefined,
  }));
  const newFindings = findings.filter((item) => item.classification === "new");
  const staleKnownFindings = [...known].filter((fingerprint) => !current.has(fingerprint)).sort();

  return {
    ...report,
    baselineScopeDigest: baseline?.scopeDigest,
    baselineScopeDrift: Boolean(
      baseline?.scopeDigest && baseline.scopeDigest !== report.scopeDigest,
    ),
    findings,
    classification: {
      known: findings.length - newFindings.length,
      new: newFindings.length,
      staleKnown: staleKnownFindings.length,
    },
    newFindings: newFindings.map((item) => item.fingerprint),
    staleKnownFindings,
  };
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
