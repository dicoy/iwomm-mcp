import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { Input } from "./schema.js";

const ALWAYS_IGNORED = ["node_modules", ".git", "dist", "build", "coverage", ".cache"];

export async function getProjectStructureHandler(input: Input): Promise<string> {
  const rootPath = resolve(input.path);
  const ig = ignore().add(ALWAYS_IGNORED);

  if (input.respect_gitignore) {
    const gitignoreContent = await tryReadFile(join(rootPath, ".gitignore"));
    if (gitignoreContent) ig.add(gitignoreContent);
  }

  const lines = await buildTree(rootPath, rootPath, ig, 0, input.max_depth);
  return [rootPath, ...lines].join("\n");
}

async function buildTree(
  dirPath: string,
  rootPath: string,
  ig: Ignore,
  depth: number,
  maxDepth: number,
): Promise<string[]> {
  if (depth >= maxDepth) return [];

  let entries: import("node:fs").Dirent<string>[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true, encoding: "utf-8" });
  } catch {
    return [];
  }

  const visible = entries
    .filter((entry) => {
      const rel = relative(rootPath, join(dirPath, entry.name));
      return !ig.ignores(rel) && !ig.ignores(entry.isDirectory() ? `${rel}/` : rel);
    })
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const lines: string[] = [];
  const indent = "  ".repeat(depth);

  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i];
    if (!entry) continue;
    const isLast = i === visible.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const suffix = entry.isDirectory() ? "/" : "";

    lines.push(`${indent}${connector}${entry.name}${suffix}`);

    if (entry.isDirectory()) {
      const children = await buildTree(
        join(dirPath, entry.name),
        rootPath,
        ig,
        depth + 1,
        maxDepth,
      );
      lines.push(...children);
    }
  }

  return lines;
}

async function tryReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
