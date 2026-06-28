import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContextConfig } from "../config/schema.js";
import type { IConfigFileProvider } from "../providers/config-file.js";
import type { IDockerProvider } from "../providers/docker.js";
import type { IEnvProvider } from "../providers/env.js";
import type { IGitProvider } from "../providers/git.js";
import type { ILogProvider } from "../providers/log.js";
import type { IPortProvider } from "../providers/port.js";
import type { IProcessProvider } from "../providers/process.js";
import { checkServiceHealthHandler } from "../tools/check-service-health/handler.js";
import { InputSchema as CheckServiceHealthSchema } from "../tools/check-service-health/schema.js";
import { getConfigSummaryHandler } from "../tools/get-config-summary/handler.js";
import { InputSchema as GetConfigSummarySchema } from "../tools/get-config-summary/schema.js";
import { getDockerStateHandler } from "../tools/get-docker-state/handler.js";
import { InputSchema as GetDockerStateSchema } from "../tools/get-docker-state/schema.js";
import { getEnvSummaryHandler } from "../tools/get-env-summary/handler.js";
import { InputSchema as GetEnvSummarySchema } from "../tools/get-env-summary/schema.js";
import { getGitStatusHandler } from "../tools/get-git-status/handler.js";
import { InputSchema as GetGitStatusSchema } from "../tools/get-git-status/schema.js";
import { getOpenPortsHandler } from "../tools/get-open-ports/handler.js";
import { InputSchema as GetOpenPortsSchema } from "../tools/get-open-ports/schema.js";
import { getProjectStructureHandler } from "../tools/get-project-structure/handler.js";
import { InputSchema as GetProjectStructureSchema } from "../tools/get-project-structure/schema.js";
import { getRecentLogsHandler } from "../tools/get-recent-logs/handler.js";
import { InputSchema as GetRecentLogsSchema } from "../tools/get-recent-logs/schema.js";
import { getRunningProcessesHandler } from "../tools/get-running-processes/handler.js";
import { InputSchema as GetRunningProcessesSchema } from "../tools/get-running-processes/schema.js";

export interface Providers {
  process: IProcessProvider;
  docker: IDockerProvider;
  git: IGitProvider;
  env: IEnvProvider;
  log: ILogProvider;
  port: IPortProvider;
  configFile: IConfigFileProvider;
}

export function registerTools(
  server: McpServer,
  providers: Providers,
  config: McpContextConfig | null,
  rootPath: string,
): void {
  server.tool(
    "get_running_processes",
    "List running processes on this machine, optionally filtered by port or name",
    GetRunningProcessesSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getRunningProcessesHandler(input, providers.process) }],
    }),
  );

  server.tool(
    "get_docker_state",
    "List Docker containers with their status, ports, and health. Optionally include recent logs.",
    GetDockerStateSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getDockerStateHandler(input, providers.docker) }],
    }),
  );

  server.tool(
    "get_git_status",
    "Show the git status of a repository: branch, dirty files, ahead/behind, and recent commits",
    GetGitStatusSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getGitStatusHandler(input, providers.git) }],
    }),
  );

  server.tool(
    "get_env_summary",
    "Read a .env file and return all keys. Secret values are masked by default.",
    GetEnvSummarySchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getEnvSummaryHandler(input, providers.env) }],
    }),
  );

  server.tool(
    "get_open_ports",
    "List all TCP/UDP ports currently listening on this machine",
    GetOpenPortsSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getOpenPortsHandler(input, providers.port) }],
    }),
  );

  server.tool(
    "get_recent_logs",
    "Tail the last N lines of a log file or a named service defined in .mcp-context.yml",
    GetRecentLogsSchema.shape,
    async (input) => ({
      content: [
        {
          type: "text",
          text: await getRecentLogsHandler(input, providers.log, config, rootPath),
        },
      ],
    }),
  );

  server.tool(
    "get_project_structure",
    "Return the directory tree of a project, respecting .gitignore by default",
    GetProjectStructureSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getProjectStructureHandler(input) }],
    }),
  );

  server.tool(
    "get_config_summary",
    "Read a config file and return all keys with secret values masked. Supports Spring Boot application.yml, application.properties, and .env files.",
    GetConfigSummarySchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await getConfigSummaryHandler(input, providers.configFile) }],
    }),
  );

  server.tool(
    "check_service_health",
    "Make an HTTP request to a service health endpoint and report status and latency",
    CheckServiceHealthSchema.shape,
    async (input) => ({
      content: [{ type: "text", text: await checkServiceHealthHandler(input) }],
    }),
  );
}
