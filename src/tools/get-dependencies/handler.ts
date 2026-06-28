import type {
  BuildSystem,
  Dependency,
  IDependenciesProvider,
} from "../../providers/dependencies.js";
import type { Input } from "./schema.js";

const BUILD_SYSTEM_LABELS: Record<BuildSystem, string> = {
  maven: "Maven",
  "gradle-groovy": "Gradle (Groovy DSL)",
  "gradle-kotlin": "Gradle (Kotlin DSL)",
  go: "Go modules",
  npm: "npm",
};

export async function getDependenciesHandler(
  input: Input,
  provider: IDependenciesProvider,
): Promise<string> {
  const { buildSystem, dependencies } = await provider.read(input.path);

  if (dependencies.length === 0) {
    return `File: ${input.path}\nBuild system: ${BUILD_SYSTEM_LABELS[buildSystem]}\n\n(no dependencies found)`;
  }

  const byScope = groupByScope(dependencies);
  const total = dependencies.length;
  const header = `File: ${input.path}\nBuild system: ${BUILD_SYSTEM_LABELS[buildSystem]} · ${total} ${total === 1 ? "dependency" : "dependencies"}`;

  const sections = [...byScope.entries()].map(([scope, deps]) => {
    const nameWidth = Math.max(...deps.map((d) => d.name.length));
    const lines = deps.map((d) => {
      const version = d.version ?? "(managed)";
      return `  ${d.name.padEnd(nameWidth)}  ${version}`;
    });
    return `${scope} (${deps.length}):\n${lines.join("\n")}`;
  });

  return `${header}\n\n${sections.join("\n\n")}`;
}

function groupByScope(deps: Dependency[]): Map<string, Dependency[]> {
  const map = new Map<string, Dependency[]>();
  for (const dep of deps) {
    const scope = dep.scope ?? "default";
    const group = map.get(scope) ?? [];
    group.push(dep);
    map.set(scope, group);
  }
  return map;
}
