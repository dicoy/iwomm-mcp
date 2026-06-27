import Dockerode from "dockerode";
import { DockerNotAvailableError } from "../errors/index.js";

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: PortBinding[];
  health: string | null;
}

export interface PortBinding {
  privatePort: number;
  publicPort: number | null;
  type: string;
}

export interface IDockerProvider {
  isAvailable(): Promise<boolean>;
  listContainers(): Promise<ContainerSummary[]>;
  getContainerLogs(id: string, lines?: number): Promise<string>;
}

export class DockerodeProvider implements IDockerProvider {
  private readonly docker = new Dockerode();

  async isAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async listContainers(): Promise<ContainerSummary[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map((c) => ({
        id: c.Id.slice(0, 12),
        name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
        image: c.Image,
        status: c.Status,
        state: c.State,
        ports: (c.Ports ?? []).map((p) => ({
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort ?? null,
          type: p.Type,
        })),
        health: c.Status.includes("healthy")
          ? "healthy"
          : c.Status.includes("unhealthy")
            ? "unhealthy"
            : null,
      }));
    } catch (err) {
      throw new DockerNotAvailableError();
    }
  }

  async getContainerLogs(id: string, lines = 50): Promise<string> {
    try {
      const container = this.docker.getContainer(id);
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true,
      });
      return stripDockerStreamHeaders(stream as unknown as Buffer);
    } catch (err) {
      throw new DockerNotAvailableError();
    }
  }
}

function stripDockerStreamHeaders(buffer: Buffer): string {
  const lines: string[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (offset + size > buffer.length) break;
    lines.push(
      buffer
        .subarray(offset, offset + size)
        .toString("utf-8")
        .trimEnd(),
    );
    offset += size;
  }

  return lines.length > 0 ? lines.join("\n") : buffer.toString("utf-8");
}
