/**
 * Standalone demo that calls each MCP tool handler directly and prints
 * its output — exactly what Claude sees when it calls the server.
 *
 * Run with: npm run demo
 */
import { DevEnvError } from "../src/errors/index.js";
import { DockerodeProvider } from "../src/providers/docker.js";
import { FsEnvProvider } from "../src/providers/env.js";
import { SimpleGitProvider } from "../src/providers/git.js";
import { NodeProcessProvider } from "../src/providers/process.js";
import { getDockerStateHandler } from "../src/tools/get-docker-state/handler.js";
import { getEnvSummaryHandler } from "../src/tools/get-env-summary/handler.js";
import { getGitStatusHandler } from "../src/tools/get-git-status/handler.js";
import { getProjectStructureHandler } from "../src/tools/get-project-structure/handler.js";
import { getRunningProcessesHandler } from "../src/tools/get-running-processes/handler.js";

// ─── colour helpers ──────────────────────────────────────────────────────────

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

// ─── section runner ──────────────────────────────────────────────────────────

async function section(label: string, fn: () => Promise<string>): Promise<void> {
  const bar = "━";
  const fill = Math.max(2, 56 - label.length);
  console.log(`\n${c.cyan(c.bold(`${bar}${bar}`))}  ${c.bold(label)}  ${c.dim(bar.repeat(fill))}`);

  try {
    const result = await fn();
    console.log(`\n${result}`);
  } catch (err) {
    if (err instanceof DevEnvError) {
      // Typed error — name is the subclass name, message explains what happened.
      console.log(`\n${c.red("✗")}  ${c.bold(c.red(err.name))}`);
      console.log(`   ${c.dim(err.message)}`);
    } else {
      throw err;
    }
  }
}

// ─── providers ───────────────────────────────────────────────────────────────

const git = new SimpleGitProvider();
const proc = new NodeProcessProvider();
const env = new FsEnvProvider();
const docker = new DockerodeProvider();

// ─── demo ────────────────────────────────────────────────────────────────────

console.log();
console.log(c.bold("╔══════════════════════════════════════════════════════════╗"));
console.log(c.bold("║") + "    mcp-devenv  ·  what Claude sees about your machine    " + c.bold("║"));
console.log(c.bold("╚══════════════════════════════════════════════════════════╝"));

await section('get_project_structure  ·  path: "."', () =>
  getProjectStructureHandler({ path: ".", max_depth: 3, respect_gitignore: true }),
);

await section('get_git_status  ·  path: "."', () =>
  getGitStatusHandler({ path: ".", include_recent_commits: true }, git),
);

// ── error demo: /tmp is not a git repository ─────────────────────────────────
await section('get_git_status  ·  path: "/tmp"', () =>
  getGitStatusHandler({ path: "/tmp", include_recent_commits: false }, git),
);

// ── filter to just the running mcp-devenv server ─────────────────────────────
await section('get_running_processes  ·  filter_name: "mcp"', () =>
  getRunningProcessesHandler({ filter_name: "mcp" }, proc),
);

// ── env masking: secrets hidden, safe vars shown ──────────────────────────────
await section('get_env_summary  ·  path: "demo/env.example"', () =>
  getEnvSummaryHandler({
    path: "demo/env.example",
    reveal_patterns: ["NODE_ENV", "PORT", "LOG_LEVEL", "APP_*"],
  }, env),
);

await section("get_docker_state", () =>
  getDockerStateHandler({ include_logs: false }, docker),
);

console.log(`\n${c.dim("─".repeat(60))}`);
console.log(c.dim("Each section above is a single MCP tool call."));
console.log(c.dim("Errors are typed — Claude gets the class name, not a stack trace."));
console.log();
