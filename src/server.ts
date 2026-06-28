import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tryLoadConfig } from "./config/loader.js";
import { FsConfigFileProvider } from "./providers/config-file.js";
import { FsDependenciesProvider } from "./providers/dependencies.js";
import { DockerodeProvider } from "./providers/docker.js";
import { FsEnvProvider } from "./providers/env.js";
import { SimpleGitProvider } from "./providers/git.js";
import { FsLogProvider } from "./providers/log.js";
import { LsofPortProvider } from "./providers/port.js";
import { NodeProcessProvider } from "./providers/process.js";
import { type Providers, registerTools } from "./registry/tool-registry.js";

export async function createServer(rootPath = process.cwd()): Promise<McpServer> {
  const config = await tryLoadConfig(rootPath);

  const providers: Providers = {
    process: new NodeProcessProvider(),
    docker: new DockerodeProvider(),
    git: new SimpleGitProvider(),
    env: new FsEnvProvider(),
    log: new FsLogProvider(),
    port: new LsofPortProvider(),
    configFile: new FsConfigFileProvider(),
    dependencies: new FsDependenciesProvider(),
  };

  const server = new McpServer({
    name: "iwomm-mcp",
    version: "0.1.0",
  });

  registerTools(server, providers, config, rootPath);

  return server;
}
