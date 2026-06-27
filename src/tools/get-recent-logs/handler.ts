import { resolve } from "node:path";
import type { McpContextConfig } from "../../config/schema.js";
import type { ILogProvider } from "../../providers/log.js";
import type { Input } from "./schema.js";

export async function getRecentLogsHandler(
  input: Input,
  logProvider: ILogProvider,
  config: McpContextConfig | null,
  rootPath: string,
): Promise<string> {
  let logLines: string[];
  let source: string;

  if (input.file !== undefined) {
    const filePath = resolve(rootPath, input.file);
    logLines = await logProvider.tailFile(filePath, input.lines);
    source = filePath;
  } else if (input.service !== undefined) {
    if (!config) {
      return `Cannot resolve service "${input.service}": no .mcp-context.yml found in ${rootPath}`;
    }
    logLines = await logProvider.tailService(input.service, input.lines, config, rootPath);
    source = `service:${input.service}`;
  } else {
    return "No log source specified.";
  }

  if (logLines.length === 0) {
    return `${source} — no log output found.`;
  }

  return [`# ${source} (last ${logLines.length} lines)`, "", ...logLines].join("\n");
}
