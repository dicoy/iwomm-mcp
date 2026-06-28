import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import yaml from "js-yaml";
import { ConfigFileNotFoundError, ConfigFileParseError } from "../errors/index.js";
import { isSecretKey } from "../utils/secret-patterns.js";

export type ConfigFormat = "yaml" | "properties" | "dotenv";

export interface ConfigEntry {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface ConfigSummary {
  format: ConfigFormat;
  entries: ConfigEntry[];
}

export interface IConfigFileProvider {
  read(filePath: string): Promise<ConfigSummary>;
}

export class FsConfigFileProvider implements IConfigFileProvider {
  async read(filePath: string): Promise<ConfigSummary> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      throw new ConfigFileNotFoundError(filePath);
    }

    const ext = extname(filePath).toLowerCase();
    const format: ConfigFormat =
      ext === ".yml" || ext === ".yaml" ? "yaml" : ext === ".properties" ? "properties" : "dotenv";

    const pairs = format === "yaml" ? parseYaml(raw, filePath) : parseKeyValue(raw);

    return {
      format,
      entries: pairs.map(([key, value]) => ({ key, value, isSecret: isSecretKey(key) })),
    };
  }
}

function parseYaml(raw: string, filePath: string): [string, string][] {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new ConfigFileParseError(filePath, err instanceof Error ? err.message : String(err));
  }
  return flattenObject(parsed);
}

function flattenObject(obj: unknown, prefix = ""): [string, string][] {
  if (obj === null || obj === undefined) return prefix ? [[prefix, ""]] : [];
  if (typeof obj !== "object") return [[prefix, String(obj)]];
  if (Array.isArray(obj)) {
    return [[prefix, obj.map((v) => String(v ?? "")).join(", ")]];
  }
  const result: [string, string][] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result.push(...flattenObject(v, prefix ? `${prefix}.${k}` : k));
  }
  return result;
}

function parseKeyValue(raw: string): [string, string][] {
  const result: [string, string][] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) result.push([key, value]);
  }
  return result;
}
