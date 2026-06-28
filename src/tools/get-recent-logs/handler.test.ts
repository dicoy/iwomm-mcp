import { describe, expect, it, vi } from "vitest";
import type { McpContextConfig } from "../../config/schema.js";
import { LogFileNotFoundError, ServiceLogsNotConfiguredError } from "../../errors/index.js";
import type { ILogProvider } from "../../providers/log.js";
import { getRecentLogsHandler } from "./handler.js";

const makeProvider = (overrides: Partial<ILogProvider> = {}): ILogProvider => ({
  tailFile: vi.fn().mockResolvedValue([]),
  tailService: vi.fn().mockResolvedValue([]),
  ...overrides,
});

const makeConfig = (services: McpContextConfig["services"] = {}): McpContextConfig => ({
  services,
  env_files: [".env"],
  reveal_env_patterns: [],
});

describe("getRecentLogsHandler", () => {
  it("tails a file directly when file path is given", async () => {
    const provider = makeProvider({
      tailFile: vi.fn().mockResolvedValue(["line 1", "line 2", "line 3"]),
    });

    const result = await getRecentLogsHandler(
      { file: "/var/log/app.log", lines: 50 },
      provider,
      null,
      "/project",
    );

    expect(provider.tailFile).toHaveBeenCalledOnce();
    expect(result).toContain("line 1");
    expect(result).toContain("line 3");
  });

  it("resolves service logs via config", async () => {
    const provider = makeProvider({
      tailService: vi.fn().mockResolvedValue(["[INFO] started"]),
    });
    const config = makeConfig({ api: { logs: "./logs/api.log", port: 3000 } });

    const result = await getRecentLogsHandler(
      { service: "api", lines: 50 },
      provider,
      config,
      "/project",
    );

    expect(provider.tailService).toHaveBeenCalledWith("api", 50, config, "/project");
    expect(result).toContain("[INFO] started");
    expect(result).toContain("service:api");
  });

  it("returns a helpful message when service is requested but no config exists", async () => {
    const result = await getRecentLogsHandler(
      { service: "api", lines: 50 },
      makeProvider(),
      null,
      "/project",
    );

    expect(result).toContain("api");
    expect(result).toContain(".mcp-context.yml");
  });

  it("propagates LogFileNotFoundError from provider", async () => {
    const provider = makeProvider({
      tailFile: vi.fn().mockRejectedValue(new LogFileNotFoundError("/missing.log")),
    });

    await expect(
      getRecentLogsHandler({ file: "/missing.log", lines: 50 }, provider, null, "/project"),
    ).rejects.toThrow(LogFileNotFoundError);
  });

  it("propagates ServiceLogsNotConfiguredError from provider", async () => {
    const provider = makeProvider({
      tailService: vi.fn().mockRejectedValue(new ServiceLogsNotConfiguredError("worker")),
    });
    const config = makeConfig({});

    await expect(
      getRecentLogsHandler({ service: "worker", lines: 50 }, provider, config, "/project"),
    ).rejects.toThrow(ServiceLogsNotConfiguredError);
  });

  it("returns an empty-result message when log file has no content", async () => {
    const provider = makeProvider({ tailFile: vi.fn().mockResolvedValue([]) });

    const result = await getRecentLogsHandler(
      { file: "/var/log/empty.log", lines: 50 },
      provider,
      null,
      "/project",
    );

    expect(result).toContain("no log output found");
  });
});
