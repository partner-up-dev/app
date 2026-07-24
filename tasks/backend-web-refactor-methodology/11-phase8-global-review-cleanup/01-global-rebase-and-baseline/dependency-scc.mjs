#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const repoRoot = process.cwd();
const requestedRoot = process.argv[2] ?? "apps/backend/src";
const sourceRoot = path.resolve(repoRoot, requestedRoot);
const extensions = new Set([".ts", ".tsx", ".vue"]);
const productionPattern = /\.(?:ts|tsx|vue)$/;
const testPattern = /\.(?:test|spec)\.(?:ts|tsx|vue)$/;

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });

const files = walk(sourceRoot)
  .filter((file) => productionPattern.test(file) && !testPattern.test(file))
  .sort();
const fileSet = new Set(files);

const readParseableSource = (file) => {
  const source = fs.readFileSync(file, "utf8");
  if (!file.endsWith(".vue")) return source;
  return [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join("\n");
};

const resolveModule = (fromFile, specifier) => {
  let base;
  if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else if (specifier.startsWith("@/") && requestedRoot === "apps/web/src") {
    base = path.join(sourceRoot, specifier.slice(2));
  } else {
    return null;
  }

  const candidates = [
    base,
    ...[...extensions].map((extension) => `${base}${extension}`),
    ...[...extensions].map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
};

const staticEdges = new Map(files.map((file) => [file, new Set()]));
const fullEdges = new Map(files.map((file) => [file, new Set()]));

for (const file of files) {
  const sourceFile = ts.createSourceFile(
    file,
    readParseableSource(file),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const addEdge = (specifier, dynamic) => {
    const resolved = resolveModule(file, specifier);
    if (resolved === null) return;
    fullEdges.get(file).add(resolved);
    if (!dynamic) staticEdges.get(file).add(resolved);
  };

  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      addEdge(node.moduleSpecifier.text, false);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      addEdge(node.arguments[0].text, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

const stronglyConnectedComponents = (edges) => {
  let nextIndex = 0;
  const stack = [];
  const onStack = new Set();
  const indexByNode = new Map();
  const lowLinkByNode = new Map();
  const components = [];

  const connect = (node) => {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of edges.get(node)) {
      if (!indexByNode.has(target)) {
        connect(target);
        lowLinkByNode.set(
          node,
          Math.min(lowLinkByNode.get(node), lowLinkByNode.get(target)),
        );
      } else if (onStack.has(target)) {
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), indexByNode.get(target)));
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) return;
    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    const selfCycle = component.length === 1 && edges.get(component[0]).has(component[0]);
    if (component.length > 1 || selfCycle) components.push(component.sort());
  };

  for (const file of files) {
    if (!indexByNode.has(file)) connect(file);
  }
  return components.sort((left, right) => right.length - left.length);
};

const summarize = (label, edges) => {
  const edgeCount = [...edges.values()].reduce((total, targets) => total + targets.size, 0);
  const components = stronglyConnectedComponents(edges);
  return {
    label,
    files: files.length,
    edges: edgeCount,
    cyclicComponents: components.length,
    components: components.map((component) =>
      component.map((file) => path.relative(repoRoot, file)),
    ),
  };
};

console.log(
  JSON.stringify(
    {
      scope: requestedRoot,
      static: summarize("static import/export", staticEdges),
      full: summarize("static plus dynamic import()", fullEdges),
    },
    null,
    2,
  ),
);
