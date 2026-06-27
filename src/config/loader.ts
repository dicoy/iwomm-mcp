import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { ConfigNotFoundError, ConfigParseError } from "../errors/index.js";
import { type McpContextConfig, McpContextConfigSchema } from "./schema.js";

const CONFIG_FILENAME = ".mcp-context.yml";

export async function loadConfig(rootPath: string): Promise<McpContextConfig> {
  const configPath = join(rootPath, CONFIG_FILENAME);

  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    throw new ConfigNotFoundError(configPath);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new ConfigParseError(configPath, err instanceof Error ? err.message : String(err));
  }

  const result = McpContextConfigSchema.safeParse(parsed ?? {});
  if (!result.success) {
    throw new ConfigParseError(configPath, result.error.message);
  }

  return result.data;
}

export async function tryLoadConfig(rootPath: string): Promise<McpContextConfig | null> {
  try {
    return await loadConfig(rootPath);
  } catch (err) {
    if (err instanceof ConfigNotFoundError) return null;
    throw err;
  }
}
