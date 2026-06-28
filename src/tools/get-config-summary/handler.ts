import type {
  ConfigEntry,
  ConfigFormat,
  IConfigFileProvider,
} from "../../providers/config-file.js";
import type { Input } from "./schema.js";

const MASK = "••••••••";
const FORMAT_LABELS: Record<ConfigFormat, string> = {
  yaml: "YAML",
  properties: "Properties",
  dotenv: "dotenv",
};

export async function getConfigSummaryHandler(
  input: Input,
  provider: IConfigFileProvider,
): Promise<string> {
  const { format, entries } = await provider.read(input.path);
  const maskedCount = entries.filter((e) => e.isSecret).length;

  const header = [
    `File: ${input.path}`,
    `Format: ${FORMAT_LABELS[format]} · ${entries.length} keys · ${maskedCount} masked`,
  ].join("\n");

  if (entries.length === 0) {
    return `${header}\n\n(no keys found)`;
  }

  const keyWidth = Math.max(...entries.map((e) => e.key.length));
  const body = formatGrouped(entries, keyWidth);

  return `${header}\n\n${body}`;
}

function formatGrouped(entries: ConfigEntry[], keyWidth: number): string {
  const groups = new Map<string, ConfigEntry[]>();
  for (const entry of entries) {
    const prefix = entry.key.split(".")[0] ?? entry.key;
    const group = groups.get(prefix) ?? [];
    group.push(entry);
    groups.set(prefix, group);
  }

  return [...groups.values()]
    .map((group) => group.map((e) => formatEntry(e, keyWidth)).join("\n"))
    .join("\n\n");
}

function formatEntry(entry: ConfigEntry, keyWidth: number): string {
  const value = entry.isSecret ? MASK : entry.value || "(empty)";
  return `${entry.key.padEnd(keyWidth)} = ${value}`;
}
