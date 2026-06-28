import { describe, expect, it, vi } from "vitest";
import { ConfigFileNotFoundError } from "../../errors/index.js";
import type { IConfigFileProvider } from "../../providers/config-file.js";
import { getConfigSummaryHandler } from "./handler.js";

const makeProvider = (overrides: Partial<IConfigFileProvider> = {}): IConfigFileProvider => ({
  read: vi.fn(),
  ...overrides,
});

describe("getConfigSummaryHandler", () => {
  it("shows format, total keys, and masked count in the header", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        format: "yaml",
        entries: [
          { key: "server.port", value: "8080", isSecret: false },
          { key: "spring.datasource.password", value: "secret123", isSecret: true },
        ],
      }),
    });

    const result = await getConfigSummaryHandler({ path: "application.yml" }, provider);

    expect(result).toContain("YAML");
    expect(result).toContain("2 keys");
    expect(result).toContain("1 masked");
  });

  it("shows non-secret values and masks secret values", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        format: "yaml",
        entries: [
          { key: "server.port", value: "8080", isSecret: false },
          { key: "spring.datasource.password", value: "secret123", isSecret: true },
        ],
      }),
    });

    const result = await getConfigSummaryHandler({ path: "application.yml" }, provider);

    expect(result).toContain("8080");
    expect(result).not.toContain("secret123");
    expect(result).toContain("••••••••");
  });

  it("groups keys by top-level prefix with a blank line between groups", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        format: "yaml",
        entries: [
          { key: "server.port", value: "8080", isSecret: false },
          {
            key: "spring.datasource.url",
            value: "jdbc:postgresql://localhost/db",
            isSecret: false,
          },
          { key: "spring.datasource.username", value: "admin", isSecret: false },
          { key: "logging.level.root", value: "INFO", isSecret: false },
        ],
      }),
    });

    const result = await getConfigSummaryHandler({ path: "application.yml" }, provider);

    const serverIdx = result.indexOf("server.port");
    const springIdx = result.indexOf("spring.datasource.url");
    const loggingIdx = result.indexOf("logging.level.root");

    expect(serverIdx).toBeLessThan(springIdx);
    expect(springIdx).toBeLessThan(loggingIdx);
    // blank line between groups
    expect(result.slice(serverIdx, springIdx)).toContain("\n\n");
  });

  it("shows (empty) for blank values", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        format: "properties",
        entries: [{ key: "app.description", value: "", isSecret: false }],
      }),
    });

    const result = await getConfigSummaryHandler({ path: "application.properties" }, provider);

    expect(result).toContain("(empty)");
  });

  it("reports (no keys found) for an empty file", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({ format: "dotenv", entries: [] }),
    });

    const result = await getConfigSummaryHandler({ path: ".env" }, provider);

    expect(result).toContain("no keys found");
  });

  it("propagates ConfigFileNotFoundError from the provider", async () => {
    const provider = makeProvider({
      read: vi.fn().mockRejectedValue(new ConfigFileNotFoundError("missing.yml")),
    });

    await expect(getConfigSummaryHandler({ path: "missing.yml" }, provider)).rejects.toThrow(
      ConfigFileNotFoundError,
    );
  });
});
