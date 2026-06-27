import { readFile } from "node:fs/promises";
import { EnvFileNotFoundError } from "../errors/index.js";

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

const SECRET_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /passwd/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /cert/i,
];

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

      const isSecret = SECRET_KEY_PATTERNS.some((re) => re.test(key));
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
