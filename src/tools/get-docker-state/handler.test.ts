import { describe, expect, it, vi } from "vitest";
import { DockerNotAvailableError } from "../../errors/index.js";
import type { ContainerSummary, IDockerProvider } from "../../providers/docker.js";
import { getDockerStateHandler } from "./handler.js";

const makeContainer = (overrides: Partial<ContainerSummary> = {}): ContainerSummary => ({
  id: "abc123def456",
  name: "my-api",
  image: "node:20-alpine",
  status: "Up 2 hours",
  state: "running",
  ports: [{ privatePort: 3000, publicPort: 3000, type: "tcp" }],
  health: "healthy",
  ...overrides,
});

const makeProvider = (overrides: Partial<IDockerProvider> = {}): IDockerProvider => ({
  isAvailable: vi.fn().mockResolvedValue(true),
  listContainers: vi.fn().mockResolvedValue([]),
  getContainerLogs: vi.fn().mockResolvedValue("log line 1\nlog line 2"),
  ...overrides,
});

describe("getDockerStateHandler", () => {
  it("throws when Docker is not available", async () => {
    const provider = makeProvider({ isAvailable: vi.fn().mockResolvedValue(false) });

    await expect(getDockerStateHandler({ include_logs: false }, provider)).rejects.toThrow(
      DockerNotAvailableError,
    );
  });

  it("returns a message when no containers exist", async () => {
    const provider = makeProvider();

    const result = await getDockerStateHandler({ include_logs: false }, provider);

    expect(result).toContain("No containers found");
  });

  it("formats container summary correctly", async () => {
    const provider = makeProvider({
      listContainers: vi.fn().mockResolvedValue([makeContainer()]),
    });

    const result = await getDockerStateHandler({ include_logs: false }, provider);

    expect(result).toContain("my-api");
    expect(result).toContain("node:20-alpine");
    expect(result).toContain("healthy");
    expect(result).toContain("3000→3000");
  });

  it("includes logs when include_logs is true", async () => {
    const getLogs = vi.fn().mockResolvedValue("error: something broke");
    const provider = makeProvider({
      listContainers: vi.fn().mockResolvedValue([makeContainer()]),
      getContainerLogs: getLogs,
    });

    const result = await getDockerStateHandler({ include_logs: true }, provider);

    expect(getLogs).toHaveBeenCalledWith("abc123def456", 20);
    expect(result).toContain("error: something broke");
  });

  it("does not fetch logs for stopped containers", async () => {
    const getLogs = vi.fn();
    const provider = makeProvider({
      listContainers: vi
        .fn()
        .mockResolvedValue([makeContainer({ state: "exited", status: "Exited (0) 1 hour ago" })]),
      getContainerLogs: getLogs,
    });

    await getDockerStateHandler({ include_logs: true }, provider);

    expect(getLogs).not.toHaveBeenCalled();
  });

  it("filters containers by name", async () => {
    const provider = makeProvider({
      listContainers: vi
        .fn()
        .mockResolvedValue([makeContainer({ name: "api" }), makeContainer({ name: "postgres" })]),
    });

    const result = await getDockerStateHandler(
      { include_logs: false, filter_name: "post" },
      provider,
    );

    expect(result).toContain("postgres");
    expect(result).not.toContain("api");
  });
});
