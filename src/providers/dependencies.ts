import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { DependencyFileNotFoundError, DependencyParseError } from "../errors/index.js";

export type BuildSystem = "maven" | "gradle-groovy" | "gradle-kotlin" | "go" | "npm";

export interface Dependency {
  name: string;
  version?: string;
  scope?: string;
}

export interface DependencySummary {
  buildSystem: BuildSystem;
  dependencies: Dependency[];
}

export interface IDependenciesProvider {
  read(filePath: string): Promise<DependencySummary>;
}

export class FsDependenciesProvider implements IDependenciesProvider {
  async read(filePath: string): Promise<DependencySummary> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      throw new DependencyFileNotFoundError(filePath);
    }

    const file = basename(filePath);
    if (file === "pom.xml")
      return { buildSystem: "maven", dependencies: parseMaven(raw, filePath) };
    if (file === "build.gradle.kts")
      return { buildSystem: "gradle-kotlin", dependencies: parseGradle(raw) };
    if (file === "build.gradle")
      return { buildSystem: "gradle-groovy", dependencies: parseGradle(raw) };
    if (file === "go.mod") return { buildSystem: "go", dependencies: parseGoMod(raw) };
    if (file === "package.json")
      return { buildSystem: "npm", dependencies: parseNpm(raw, filePath) };

    throw new DependencyParseError(
      filePath,
      "unrecognised file — expected pom.xml, build.gradle, build.gradle.kts, go.mod, or package.json",
    );
  }
}

// ─── Maven ────────────────────────────────────────────────────────────────────

interface PomDependency {
  groupId?: string;
  artifactId?: string;
  version?: string;
  scope?: string;
}

interface ParsedPom {
  project?: {
    dependencies?: { dependency?: PomDependency | PomDependency[] };
  };
}

function parseMaven(raw: string, filePath: string): Dependency[] {
  let doc: ParsedPom;
  try {
    doc = new XMLParser({ ignoreAttributes: true }).parse(raw) as ParsedPom;
  } catch (err) {
    throw new DependencyParseError(filePath, err instanceof Error ? err.message : String(err));
  }

  const raw_deps = doc?.project?.dependencies?.dependency;
  if (!raw_deps) return [];
  const deps = Array.isArray(raw_deps) ? raw_deps : [raw_deps];

  return deps.flatMap((d) => {
    if (!d.groupId || !d.artifactId) return [];
    const dep: Dependency = { name: `${d.groupId}:${d.artifactId}`, scope: d.scope ?? "compile" };
    if (d.version !== undefined) dep.version = d.version;
    return [dep];
  });
}

// ─── Gradle ───────────────────────────────────────────────────────────────────

const GRADLE_SCOPES = new Set([
  "implementation",
  "api",
  "compileOnly",
  "runtimeOnly",
  "testImplementation",
  "testCompileOnly",
  "testRuntimeOnly",
  "annotationProcessor",
  "kapt",
]);

function parseGradle(raw: string): Dependency[] {
  // Matches: scope("group:name:version") or scope 'group:name'
  const pattern = /(\w+)\s*[\("']([A-Za-z0-9._\-:]+)["'\)]/g;
  return [...raw.matchAll(pattern)].flatMap((match) => {
    const scope = match[1];
    const coord = match[2];
    if (!scope || !coord || !GRADLE_SCOPES.has(scope)) return [];

    const parts = coord.split(":");
    const group = parts[0] ?? "";
    const artifact = parts[1] ?? "";
    const version = parts[2];
    if (!group || !artifact) return [];

    const dep: Dependency = { name: `${group}:${artifact}`, scope };
    if (version !== undefined) dep.version = version;
    return [dep];
  });
}

// ─── Go modules ───────────────────────────────────────────────────────────────

function parseGoMod(raw: string): Dependency[] {
  const results: Dependency[] = [];
  let inRequireBlock = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "require (") {
      inRequireBlock = true;
      continue;
    }
    if (trimmed === ")") {
      inRequireBlock = false;
      continue;
    }
    const dep = parseGoModLine(trimmed, inRequireBlock);
    if (dep) results.push(dep);
  }

  return results;
}

function parseGoModLine(trimmed: string, inRequireBlock: boolean): Dependency | null {
  const isInline = trimmed.startsWith("require ");
  if (!inRequireBlock && !isInline) return null;

  const coords = isInline ? trimmed.slice("require ".length).trim() : trimmed;
  if (!coords || coords.startsWith("//")) return null;

  const parts = coords.split(/\s+/);
  const name = parts[0];
  if (!name || name.startsWith("//")) return null;

  const dep: Dependency = { name };
  if (parts[1] !== undefined) dep.version = parts[1];
  return dep;
}

// ─── npm / package.json ───────────────────────────────────────────────────────

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function parseNpm(raw: string, filePath: string): Dependency[] {
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(raw) as PackageJson;
  } catch (err) {
    throw new DependencyParseError(filePath, err instanceof Error ? err.message : String(err));
  }

  const results: Dependency[] = [];
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    results.push({ name, version, scope: "production" });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
    results.push({ name, version, scope: "dev" });
  }
  return results;
}
