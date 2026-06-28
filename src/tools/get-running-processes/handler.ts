import type { IProcessProvider, ProcessInfo } from "../../providers/process.js";
import type { Input } from "./schema.js";

export async function getRunningProcessesHandler(
  input: Input,
  processProvider: IProcessProvider,
): Promise<string> {
  let processes =
    input.filter_port !== undefined
      ? await processProvider.findByPort(input.filter_port)
      : await processProvider.list();

  if (input.filter_name !== undefined) {
    const lower = input.filter_name.toLowerCase();
    processes = processes.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.command.toLowerCase().includes(lower),
    );
  }

  if (input.filter_args !== undefined) {
    const lower = input.filter_args.toLowerCase();
    processes = processes.filter((p) => p.command.toLowerCase().includes(lower));
  }

  if (processes.length === 0) {
    return formatEmptyResult(input);
  }

  const rows = processes.map((p) => ({
    PID: p.pid,
    Name: p.name,
    "CPU%": p.cpuPercent.toFixed(1),
    "MEM%": p.memPercent.toFixed(1),
    Command: truncate(p.command, 80),
  }));

  return formatTable(rows);
}

function formatEmptyResult(input: Input): string {
  if (input.filter_port !== undefined) return `No processes found on port ${input.filter_port}.`;
  const parts: string[] = [];
  if (input.filter_name !== undefined) parts.push(`name "${input.filter_name}"`);
  if (input.filter_args !== undefined) parts.push(`args "${input.filter_args}"`);
  if (parts.length > 0) return `No processes found matching ${parts.join(" and ")}.`;
  return "No processes found.";
}

function formatTable(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";

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

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
