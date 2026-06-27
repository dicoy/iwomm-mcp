import { DockerNotAvailableError } from "../../errors/index.js";
import type { ContainerSummary, IDockerProvider } from "../../providers/docker.js";
import type { Input } from "./schema.js";

export async function getDockerStateHandler(
  input: Input,
  dockerProvider: IDockerProvider,
): Promise<string> {
  const available = await dockerProvider.isAvailable();
  if (!available) {
    throw new DockerNotAvailableError();
  }

  let containers = await dockerProvider.listContainers();

  if (input.filter_name) {
    const lower = input.filter_name.toLowerCase();
    containers = containers.filter((c) => c.name.toLowerCase().includes(lower));
  }

  if (containers.length === 0) {
    return input.filter_name
      ? `No containers found matching "${input.filter_name}".`
      : "No containers found. Docker is running but no containers exist.";
  }

  const sections = await Promise.all(
    containers.map((c) => formatContainer(c, input.include_logs, dockerProvider)),
  );

  return sections.join("\n\n---\n\n");
}

async function formatContainer(
  container: ContainerSummary,
  includeLogs: boolean,
  dockerProvider: IDockerProvider,
): Promise<string> {
  const stateIcon = container.state === "running" ? "▶" : "■";
  const healthTag = container.health ? ` [${container.health}]` : "";
  const ports =
    container.ports.length > 0
      ? container.ports
          .map((p) => (p.publicPort ? `${p.publicPort}→${p.privatePort}` : String(p.privatePort)))
          .join(", ")
      : "none";

  let output = [
    `${stateIcon} ${container.name} (${container.id})`,
    `  Image:  ${container.image}`,
    `  Status: ${container.status}${healthTag}`,
    `  Ports:  ${ports}`,
  ].join("\n");

  if (includeLogs && container.state === "running") {
    try {
      const logs = await dockerProvider.getContainerLogs(container.id, 20);
      output += `\n  Logs (last 20 lines):\n${indentLines(logs, "    ")}`;
    } catch {
      output += "\n  Logs: (unavailable)";
    }
  }

  return output;
}

function indentLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((l) => `${prefix}${l}`)
    .join("\n");
}
