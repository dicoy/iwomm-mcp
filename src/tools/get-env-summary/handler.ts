import { resolve } from "node:path";
import type { IEnvProvider } from "../../providers/env.js";
import type { Input } from "./schema.js";

export async function getEnvSummaryHandler(
  input: Input,
  envProvider: IEnvProvider,
): Promise<string> {
  const filePath = resolve(input.path);
  const summary = await envProvider.parse(filePath, input.reveal_patterns);

  if (summary.entries.length === 0) {
    return `${filePath} is empty or has no valid entries.`;
  }

  const secrets = summary.entries.filter((e) => e.isSecret);
  const nonSecrets = summary.entries.filter((e) => !e.isSecret);

  const lines: string[] = [`File: ${summary.path}`, `Total: ${summary.entries.length} keys`, ""];

  if (nonSecrets.length > 0) {
    lines.push("Public config:");
    for (const entry of nonSecrets) {
      lines.push(`  ${entry.key}=${entry.value ?? ""}`);
    }
    lines.push("");
  }

  if (secrets.length > 0) {
    lines.push(`Secrets (${secrets.length} keys, values masked):`);
    for (const entry of secrets) {
      const display = entry.value !== null ? entry.value : "••••••••";
      lines.push(`  ${entry.key}=${display}`);
    }
  }

  return lines.join("\n").trimEnd();
}
