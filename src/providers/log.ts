import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { McpContextConfig } from "../config/schema.js";
import { LogFileNotFoundError, ServiceLogsNotConfiguredError } from "../errors/index.js";

export interface ILogProvider {
  tailFile(filePath: string, lines: number): Promise<string[]>;
  tailService(
    serviceName: string,
    lines: number,
    config: McpContextConfig,
    rootPath: string,
  ): Promise<string[]>;
}

export class FsLogProvider implements ILogProvider {
  async tailFile(filePath: string, lines: number): Promise<string[]> {
    if (!existsSync(filePath)) {
      throw new LogFileNotFoundError(filePath);
    }

    const fileSize = (await stat(filePath)).size;
    if (fileSize === 0) return [];

    return readLastLines(filePath, lines);
  }

  async tailService(
    serviceName: string,
    lines: number,
    config: McpContextConfig,
    rootPath: string,
  ): Promise<string[]> {
    const service = config.services[serviceName];
    if (!service?.logs) {
      throw new ServiceLogsNotConfiguredError(serviceName);
    }

    const logPath = service.logs.startsWith("/") ? service.logs : `${rootPath}/${service.logs}`;

    return this.tailFile(logPath, lines);
  }
}

async function readLastLines(filePath: string, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const buffer: string[] = [];
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });

    rl.on("line", (line) => {
      buffer.push(line);
      if (buffer.length > count) buffer.shift();
    });

    rl.on("close", () => resolve(buffer));
    rl.on("error", reject);
    stream.on("error", reject);
  });
}
