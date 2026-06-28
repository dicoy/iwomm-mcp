import { readFile } from "node:fs/promises";
import { EnvFileNotFoundError } from "../errors/index.js";
import { isSecretKey } from "../utils/secret-patterns.js";

export interface EnvEntry {
  key: string;
  value: string | null;
  isSecret: boolean;
}

export interface EnvSummary {
  path: string;
  entries: EnvEntry[];
}

export interface IEnvProvider {
  parse(filePath: string, revealPatterns?: string[]): Promise<EnvSummary>;
}

export class FsEnvProvider implements IEnvProvider {
  async parse(filePath: string, revealPatterns: string[] = []): Promise<EnvSummary> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      throw new EnvFileNotFoundError(filePath);
    }

    const entries: EnvEntry[] = [];

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const rawValue = trimmed
        .slice(eqIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");

      const isSecret = isSecretKey(key);
      const isRevealed = revealPatterns.some((pattern) => matchesGlob(key, pattern));

      entries.push({
        key,
        value: isSecret && !isRevealed ? null : rawValue,
        isSecret,
      });
    }

    return { path: filePath, entries };
  }
}

function matchesGlob(key: string, pattern: string): boolean {
  if (pattern.endsWith("*")) {
    return key.startsWith(pattern.slice(0, -1));
  }
  return key === pattern;
}
