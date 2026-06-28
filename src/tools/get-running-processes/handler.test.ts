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

  it("filters by name against the full process list", async () => {
    const provider = makeProvider({
      list: vi
        .fn()
        .mockResolvedValue([
          makeProcess({ name: "java", command: "java -jar myapp.jar" }),
          makeProcess({ pid: 5678, name: "java", command: "java -jar other.jar" }),
        ]),
    });

    const result = await getRunningProcessesHandler({ filter_name: "myapp" }, provider);

    expect(provider.list).toHaveBeenCalledOnce();
    expect(result).toContain("myapp");
    expect(result).not.toContain("other");
  });

  it("filters by args when filter_args is given", async () => {
    const provider = makeProvider({
      list: vi
        .fn()
        .mockResolvedValue([
          makeProcess({ name: "java", command: "java -jar myapp.jar" }),
          makeProcess({ pid: 5678, name: "java", command: "java -jar other.jar" }),
        ]),
    });

    const result = await getRunningProcessesHandler({ filter_args: "myapp.jar" }, provider);

    expect(result).toContain("myapp");
    expect(result).not.toContain("other");
  });

  it("ANDs filter_name and filter_args together", async () => {
    const provider = makeProvider({
      list: vi
        .fn()
        .mockResolvedValue([
          makeProcess({ name: "java", command: "java -jar myapp.jar" }),
          makeProcess({ pid: 5678, name: "python", command: "python myapp.py" }),
          makeProcess({ pid: 9999, name: "java", command: "java -jar other.jar" }),
        ]),
    });

    const result = await getRunningProcessesHandler(
      { filter_name: "java", filter_args: "myapp.jar" },
      provider,
    );

    expect(result).toContain("1234");
    expect(result).not.toContain("5678");
    expect(result).not.toContain("9999");
  });

  it("returns a human-readable message when no processes match", async () => {
    const provider = makeProvider({
      findByPort: vi.fn().mockResolvedValue([]),
    });

    const result = await getRunningProcessesHandler({ filter_port: 9999 }, provider);

    expect(result).toContain("9999");
    expect(result).toContain("No processes found");
  });

  it("includes both filter criteria in the empty-result message", async () => {
    const provider = makeProvider({
      list: vi.fn().mockResolvedValue([]),
    });

    const result = await getRunningProcessesHandler(
      { filter_name: "java", filter_args: "myapp.jar" },
      provider,
    );

    expect(result).toContain(`name "java"`);
    expect(result).toContain(`args "myapp.jar"`);
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
