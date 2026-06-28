import { execa } from "execa";
import { ProcessProviderError } from "../errors/index.js";

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpuPercent: number;
  memPercent: number;
}

export interface IProcessProvider {
  list(): Promise<ProcessInfo[]>;
  findByPort(port: number): Promise<ProcessInfo[]>;
}

export class NodeProcessProvider implements IProcessProvider {
  async list(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execa("ps", ["-eo", "pid,pcpu,pmem,comm,args"]);
      return parsePsOutput(stdout);
    } catch (err) {
      throw new ProcessProviderError("Failed to list processes", { cause: err });
    }
  }

  async findByPort(port: number): Promise<ProcessInfo[]> {
    const [all, portPidMap] = await Promise.all([this.list(), getPortToPidMap()]);
    const pids = portPidMap.get(port) ?? [];
    return all.filter((p) => pids.includes(p.pid));
  }
}

async function getPortToPidMap(): Promise<Map<number, number[]>> {
  try {
    const { stdout } = await execa("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]);
    const map = new Map<number, number[]>();

    for (const line of stdout.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      const pid = Number.parseInt(parts[1] ?? "", 10);
      const nameField = parts[8] ?? "";
      const portMatch = /:(\d+)$/.exec(nameField);

      if (!Number.isNaN(pid) && portMatch?.[1] !== undefined) {
        const port = Number.parseInt(portMatch[1], 10);
        const existing = map.get(port) ?? [];
        map.set(port, [...existing, pid]);
      }
    }

    return map;
  } catch {
    return new Map();
  }
}

function parsePsOutput(stdout: string): ProcessInfo[] {
  return stdout
    .split("\n")
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = Number.parseInt(parts[0] ?? "", 10);
      const cpu = Number.parseFloat(parts[1] ?? "0");
      const mem = Number.parseFloat(parts[2] ?? "0");
      const name = parts[3] ?? "";
      const command = parts.slice(4).join(" ");

      if (Number.isNaN(pid) || pid <= 0) return [];
      return [{ pid, name, command, cpuPercent: cpu, memPercent: mem }];
    });
}
