import { describe, expect, it, vi } from "vitest";
import { EnvFileNotFoundError } from "../../errors/index.js";
import type { EnvSummary, IEnvProvider } from "../../providers/env.js";
import { getEnvSummaryHandler } from "./handler.js";

const makeProvider = (summary: Partial<EnvSummary> = {}): IEnvProvider => ({
  parse: vi.fn().mockResolvedValue({
    path: "/project/.env",
    entries: [],
    ...summary,
  }),
});

describe("getEnvSummaryHandler", () => {
  it("shows public keys with their values", async () => {
    const provider = makeProvider({
      entries: [{ key: "NODE_ENV", value: "development", isSecret: false }],
    });

    const result = await getEnvSummaryHandler({ path: ".env", reveal_patterns: [] }, provider);

    expect(result).toContain("NODE_ENV=development");
  });

  it("masks secret values by default", async () => {
    const provider = makeProvider({
      entries: [{ key: "DATABASE_PASSWORD", value: null, isSecret: true }],
    });

    const result = await getEnvSummaryHandler({ path: ".env", reveal_patterns: [] }, provider);

    expect(result).toContain("DATABASE_PASSWORD=");
    expect(result).toContain("••••••••");
    expect(result).not.toContain("supersecret");
  });

  it("reveals a secret when its key matches a reveal_pattern", async () => {
    const provider = makeProvider({
      entries: [{ key: "API_TOKEN", value: "tok_live_abc123", isSecret: true }],
    });

    const result = await getEnvSummaryHandler(
      { path: ".env", reveal_patterns: ["API_TOKEN"] },
      provider,
    );

    expect(result).toContain("tok_live_abc123");
  });

  it("reports total count and separates public from secrets", async () => {
    const provider = makeProvider({
      entries: [
        { key: "NODE_ENV", value: "test", isSecret: false },
        { key: "PORT", value: "3000", isSecret: false },
        { key: "SECRET_KEY", value: null, isSecret: true },
      ],
    });

    const result = await getEnvSummaryHandler({ path: ".env", reveal_patterns: [] }, provider);

    expect(result).toContain("3 keys");
    expect(result).toContain("Public config");
    expect(result).toContain("Secrets");
  });

  it("returns a message for an empty file", async () => {
    const provider = makeProvider({ entries: [] });

    const result = await getEnvSummaryHandler({ path: ".env", reveal_patterns: [] }, provider);

    expect(result).toContain("empty");
  });

  it("propagates EnvFileNotFoundError from provider", async () => {
    const provider: IEnvProvider = {
      parse: vi.fn().mockRejectedValue(new EnvFileNotFoundError("/project/.env")),
    };

    await expect(
      getEnvSummaryHandler({ path: ".env", reveal_patterns: [] }, provider),
    ).rejects.toThrow(EnvFileNotFoundError);
  });
});
