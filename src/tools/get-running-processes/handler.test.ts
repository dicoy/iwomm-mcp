import { describe, expect, it, vi } from "vitest";
import type { IProcessProvider, ProcessInfo } from "../../providers/process.js";
import { getRunningProcessesHandler } from "./handler.js";

const makeProcess = (overrides: Partial<ProcessInfo> = {}): ProcessInfo => ({
  pid: 1234,
  name: "node",
  command: "node server.js",
  cpuPercent: 1.2,
  memPercent: 2.3,
  ...overrides,
});

const makeProvider = (overrides: Partial<IProcessProvider> = {}): IProcessProvider => ({
  list: vi.fn(),
  findByPort: vi.fn(),
  findByName: vi.fn(),
  ...overrides,
});

describe("getRunningProcessesHandler", () => {
  it("lists all processes when no filter is given", async () => {
    const provider = makeProvider({
      list: vi
        .fn()
        .mockResolvedValue([makeProcess(), makeProcess({ pid: 5678, name: "postgres" })]),
    });

    const result = await getRunningProcessesHandler({}, provider);

    expect(provider.list).toHaveBeenCalledOnce();
    expect(provider.findByPort).not.toHaveBeenCalled();
    expect(result).toContain("node");
    expect(result).toContain("1234");
    expect(result).toContain("postgres");
  });

  it("filters by port when filter_port is given", async () => {
    const provider = makeProvider({
      findByPort: vi.fn().mockResolvedValue([makeProcess({ pid: 9000 })]),
    });

    const result = await getRunningProcessesHandler({ filter_port: 3000 }, provider);

    expect(provider.findByPort).toHaveBeenCalledWith(3000);
    expect(provider.list).not.toHaveBeenCalled();
    expect(result).toContain("9000");
  });

  it("filters by name when filter_name is given", async () => {
    const provider = makeProvider({
      findByName: vi.fn().mockResolvedValue([makeProcess({ name: "postgres" })]),
    });

    const result = await getRunningProcessesHandler({ filter_name: "postgres" }, provider);

    expect(provider.findByName).toHaveBeenCalledWith("postgres");
    expect(result).toContain("postgres");
  });

  it("returns a human-readable message when no processes match", async () => {
    const provider = makeProvider({
      findByPort: vi.fn().mockResolvedValue([]),
    });

    const result = await getRunningProcessesHandler({ filter_port: 9999 }, provider);

    expect(result).toContain("9999");
    expect(result).toContain("No processes found");
  });

  it("truncates very long commands", async () => {
    const longCommand = `node ${"a".repeat(200)}`;
    const provider = makeProvider({
      list: vi.fn().mockResolvedValue([makeProcess({ command: longCommand })]),
    });

    const result = await getRunningProcessesHandler({}, provider);

    expect(result.length).toBeLessThan(longCommand.length + 200);
  });
});
