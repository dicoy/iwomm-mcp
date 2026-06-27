import type { IPortProvider, PortInfo } from "../../providers/port.js";
import type { Input } from "./schema.js";

export async function getOpenPortsHandler(
  input: Input,
  portProvider: IPortProvider,
): Promise<string> {
  let ports = await portProvider.getListeningPorts();

  if (input.filter_process) {
    const lower = input.filter_process.toLowerCase();
    ports = ports.filter((p) => p.process?.toLowerCase().includes(lower));
  }

  if (ports.length === 0) {
    return input.filter_process
      ? `No listening ports found for process matching "${input.filter_process}".`
      : "No listening ports found.";
  }

  ports.sort((a, b) => a.port - b.port);

  const rows = ports.map((p) => ({
    Port: p.port,
    Protocol: p.protocol.toUpperCase(),
    Address: p.address,
    PID: p.pid ?? "-",
    Process: p.process ?? "-",
  }));

  return formatTable(rows);
}

function formatTable(rows: Record<string, string | number>[]): string {
  const firstRow = rows[0];
  if (!firstRow) return "";
  const keys = Object.keys(firstRow);

  const widths = keys.map((k) => Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)));

  const header = keys.map((k, i) => k.padEnd(widths[i] ?? 0)).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");
  const dataRows = rows.map((r) =>
    keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i] ?? 0)).join("  "),
  );

  return [header, separator, ...dataRows].join("\n");
}
