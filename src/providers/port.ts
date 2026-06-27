import { execa } from "execa";
import { PortProviderError } from "../errors/index.js";

export interface PortInfo {
  port: number;
  protocol: "tcp" | "udp";
  address: string;
  pid: number | null;
  process: string | null;
}

export interface IPortProvider {
  getListeningPorts(): Promise<PortInfo[]>;
}

export class LsofPortProvider implements IPortProvider {
  async getListeningPorts(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execa("lsof", [
        "-nP",
        "-iTCP",
        "-iUDP",
        "-sTCP:LISTEN",
        "-F",
        "pnPt",
      ]);
      return parseLsofOutput(stdout);
    } catch (err) {
      throw new PortProviderError("Failed to list open ports", { cause: err });
    }
  }
}

interface ParseState {
  pid: number | null;
  process: string | null;
}

function parseLsofOutput(stdout: string): PortInfo[] {
  const results: PortInfo[] = [];
  const state: ParseState = { pid: null, process: null };

  for (const line of stdout.split("\n")) {
    if (!line) continue;
    applyLsofLine(line, state, results);
  }

  return deduplicatePorts(results);
}

function applyLsofLine(line: string, state: ParseState, results: PortInfo[]): void {
  const field = line[0];
  const value = line.slice(1);

  if (field === "p") {
    state.pid = Number.parseInt(value, 10);
  } else if (field === "n") {
    state.process = value;
  } else if (field === "P") {
    const portEntry = parsePortField(value, state);
    if (portEntry) results.push(portEntry);
  }
}

function parsePortField(value: string, state: ParseState): PortInfo | null {
  const [address, portStr] = splitAddressPort(value);
  const port = portStr !== undefined ? Number.parseInt(portStr, 10) : Number.NaN;
  if (Number.isNaN(port)) return null;

  return {
    port,
    protocol: "tcp",
    address: address ?? "*",
    pid: state.pid,
    process: state.process,
  };
}

function splitAddressPort(nameField: string): [string | undefined, string | undefined] {
  const lastColon = nameField.lastIndexOf(":");
  if (lastColon === -1) return [nameField, undefined];
  return [nameField.slice(0, lastColon), nameField.slice(lastColon + 1)];
}

function deduplicatePorts(ports: PortInfo[]): PortInfo[] {
  const seen = new Set<number>();
  return ports.filter((p) => {
    if (seen.has(p.port)) return false;
    seen.add(p.port);
    return true;
  });
}
