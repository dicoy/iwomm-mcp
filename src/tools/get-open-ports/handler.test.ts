import { describe, expect, it, vi } from "vitest";
import type { IPortProvider, PortInfo } from "../../providers/port.js";
import { getOpenPortsHandler } from "./handler.js";

const makePort = (overrides: Partial<PortInfo> = {}): PortInfo => ({
  port: 3000,
  protocol: "tcp",
  address: "127.0.0.1",
  pid: 1234,
  process: "node",
  ...overrides,
});

const makeProvider = (ports: PortInfo[] = []): IPortProvider => ({
  getListeningPorts: vi.fn().mockResolvedValue(ports),
});

describe("getOpenPortsHandler", () => {
  it("returns a message when no ports are listening", async () => {
    const result = await getOpenPortsHandler({}, makeProvider([]));
    expect(result).toContain("No listening ports found");
  });

  it("returns a message scoped to the filter when no ports match", async () => {
    const provider = makeProvider([makePort({ process: "node" })]);
    const result = await getOpenPortsHandler({ filter_process: "postgres" }, provider);
    expect(result).toContain("postgres");
    expect(result).toContain("No listening ports found");
  });

  it("renders a table with port info", async () => {
    const provider = makeProvider([makePort({ port: 3000, process: "node", pid: 42 })]);
    const result = await getOpenPortsHandler({}, provider);

    expect(result).toContain("3000");
    expect(result).toContain("node");
    expect(result).toContain("42");
  });

  it("sorts ports numerically ascending", async () => {
    const provider = makeProvider([
      makePort({ port: 9000 }),
      makePort({ port: 3000 }),
      makePort({ port: 5432 }),
    ]);

    const result = await getOpenPortsHandler({}, provider);
    const positions = [3000, 5432, 9000].map((p) => result.indexOf(String(p)));

    expect(positions[0]).toBeLessThan(positions[1] ?? 0);
    expect(positions[1]).toBeLessThan(positions[2] ?? 0);
  });

  it("filters by process name (case-insensitive)", async () => {
    const provider = makeProvider([
      makePort({ port: 5432, process: "postgres" }),
      makePort({ port: 3000, process: "node" }),
    ]);

    const result = await getOpenPortsHandler({ filter_process: "POST" }, provider);

    expect(result).toContain("5432");
    expect(result).not.toContain("3000");
  });

  it("renders a dash for ports with no pid or process", async () => {
    const provider = makeProvider([makePort({ pid: null, process: null })]);
    const result = await getOpenPortsHandler({}, provider);

    const dashCount = (result.match(/-/g) ?? []).length;
    expect(dashCount).toBeGreaterThanOrEqual(2);
  });
});
