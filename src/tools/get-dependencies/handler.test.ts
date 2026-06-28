import { describe, expect, it, vi } from "vitest";
import { DependencyFileNotFoundError } from "../../errors/index.js";
import type { IDependenciesProvider } from "../../providers/dependencies.js";
import { getDependenciesHandler } from "./handler.js";

const makeProvider = (overrides: Partial<IDependenciesProvider> = {}): IDependenciesProvider => ({
  read: vi.fn(),
  ...overrides,
});

describe("getDependenciesHandler", () => {
  it("shows build system label and total count in the header", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        buildSystem: "maven",
        dependencies: [
          {
            name: "org.springframework.boot:spring-boot-starter-web",
            version: "3.2.1",
            scope: "compile",
          },
          {
            name: "org.springframework.boot:spring-boot-starter-test",
            version: "3.2.1",
            scope: "test",
          },
        ],
      }),
    });

    const result = await getDependenciesHandler({ path: "pom.xml" }, provider);

    expect(result).toContain("Maven");
    expect(result).toContain("2 dependencies");
  });

  it("groups dependencies by scope", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        buildSystem: "maven",
        dependencies: [
          { name: "org.springframework.boot:spring-boot-starter-web", scope: "compile" },
          { name: "org.springframework.boot:spring-boot-starter-test", scope: "test" },
        ],
      }),
    });

    const result = await getDependenciesHandler({ path: "pom.xml" }, provider);

    const compileIdx = result.indexOf("compile");
    const testIdx = result.indexOf("test");
    expect(compileIdx).toBeGreaterThan(-1);
    expect(testIdx).toBeGreaterThan(-1);
    expect(compileIdx).toBeLessThan(testIdx);
  });

  it("shows (managed) for dependencies without an explicit version", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        buildSystem: "gradle-kotlin",
        dependencies: [
          { name: "org.springframework.boot:spring-boot-starter-web", scope: "implementation" },
        ],
      }),
    });

    const result = await getDependenciesHandler({ path: "build.gradle.kts" }, provider);

    expect(result).toContain("(managed)");
  });

  it("shows Gradle Kotlin DSL label", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({
        buildSystem: "gradle-kotlin",
        dependencies: [{ name: "com.example:lib", version: "1.0.0", scope: "implementation" }],
      }),
    });

    const result = await getDependenciesHandler({ path: "build.gradle.kts" }, provider);

    expect(result).toContain("Gradle (Kotlin DSL)");
  });

  it("reports no dependencies found for an empty file", async () => {
    const provider = makeProvider({
      read: vi.fn().mockResolvedValue({ buildSystem: "go", dependencies: [] }),
    });

    const result = await getDependenciesHandler({ path: "go.mod" }, provider);

    expect(result).toContain("no dependencies found");
  });

  it("propagates DependencyFileNotFoundError from the provider", async () => {
    const provider = makeProvider({
      read: vi.fn().mockRejectedValue(new DependencyFileNotFoundError("pom.xml")),
    });

    await expect(getDependenciesHandler({ path: "pom.xml" }, provider)).rejects.toThrow(
      DependencyFileNotFoundError,
    );
  });
});
