# mcp-devenv

An [MCP](https://modelcontextprotocol.io) server that gives your AI assistant full awareness of your local dev environment — running processes, Docker containers, git state, open ports, log files, and more.

Stop copy-pasting context. Let the AI ask for what it needs.

![demo](demo/demo.gif)

---

## Tools

| Tool | What it answers |
|---|---|
| `get_running_processes` | What Node/Python/Go processes are running? What's on port 3000? |
| `get_docker_state` | Which containers are up? Are they healthy? What are their ports? |
| `get_git_status` | What branch am I on? What's dirty? Am I ahead/behind? |
| `get_env_summary` | What keys does my `.env` have? (Values masked by default) |
| `get_open_ports` | What's listening on this machine right now? |
| `get_recent_logs` | What did my API service log in the last 50 lines? |
| `get_project_structure` | What does this codebase look like? (gitignore-aware) |
| `check_service_health` | Is `http://localhost:3000/health` responding? How fast? |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Claude (AI)                          │
└───────────────────────┬─────────────────────────────────┘
                        │ MCP protocol (stdio)
┌───────────────────────▼─────────────────────────────────┐
│                    mcp-devenv                            │
│                                                          │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │   Tool Registry  │     │       Providers          │  │
│  │                  │     │                          │  │
│  │  get_git_status ─┼────▶│  IGitProvider            │  │
│  │  get_docker_*   ─┼────▶│  IDockerProvider         │  │
│  │  get_processes  ─┼────▶│  IProcessProvider        │  │
│  │  ...             │     │  IEnvProvider            │  │
│  └──────────────────┘     │  ILogProvider            │  │
│                            │  IPortProvider           │  │
│  ┌──────────────────┐     └──────────────┬───────────┘  │
│  │  .mcp-context    │                     │              │
│  │     .yml         │           concrete impls           │
│  └──────────────────┘                     │              │
└───────────────────────────────────────────┼─────────────┘
                                            │
              ┌─────────────┬───────────────┼──────────────┐
              ▼             ▼               ▼              ▼
           ps/lsof      simple-git      dockerode       fs/readline
```

**Design principles:**

- **Provider pattern** — every tool depends on an interface, not a concrete implementation. Tests mock the interface; the OS is never touched in tests.
- **One Zod schema per tool** — the same schema drives both MCP input validation and TypeScript types. No duplication.
- **Typed error hierarchy** — `DockerNotAvailableError`, `GitNotARepositoryError`, etc. Callers can catch exactly what they expect.
- **Composition root** — `createServer()` in `server.ts` is the only place that wires interfaces to implementations. Everything else is pure.

---

## Quick start

```bash
git clone https://github.com/your-handle/mcp-devenv
cd mcp-devenv
npm install
npm run build
```

### Add to Claude Code

```bash
claude mcp add devenv -- node /absolute/path/to/mcp-devenv/dist/index.js
```

Or add manually to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "devenv": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-devenv/dist/index.js"]
    }
  }
}
```

Restart Claude Code. You should see `devenv` in `/mcp`.

---

## Optional: `.mcp-context.yml`

Drop this file at the root of any project to tell `mcp-devenv` about your services:

```yaml
# .mcp-context.yml
services:
  api:
    port: 3000
    logs: ./logs/api.log
    health_endpoint: /health
  worker:
    logs: ./logs/worker.log
  postgres:
    port: 5432

env_files:
  - .env
  - .env.local

# Keys matching these patterns will have their values revealed
# (even if they look like secrets). Supports exact match and * prefix glob.
reveal_env_patterns:
  - NODE_ENV
  - APP_*
  - FEATURE_*
```

Without this file, `get_recent_logs` works only with explicit file paths. All other tools work without any config.

---

## Development

```bash
npm run dev          # build in watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # biome check
npm run lint:fix     # biome check --write
npm run test         # vitest run
npm run test:watch   # vitest (interactive)
npm run ci           # typecheck + lint + test + build
```

### Adding a new tool

1. Create `src/tools/your-tool-name/schema.ts` — Zod input schema
2. Create `src/tools/your-tool-name/handler.ts` — pure function, injected providers
3. Create `src/tools/your-tool-name/handler.test.ts` — mock the providers, not the OS
4. Register in `src/registry/tool-registry.ts` — one `server.tool(...)` call

If the tool needs a new system capability, add an interface to `src/providers/` with a corresponding implementation. The handler never imports a concrete provider class.

### Project structure

```
src/
├── config/
│   ├── loader.ts          # .mcp-context.yml parser
│   └── schema.ts          # Zod schema + inferred types
├── errors/
│   └── index.ts           # typed error hierarchy
├── providers/
│   ├── docker.ts          # IDockerProvider + DockerodeProvider
│   ├── env.ts             # IEnvProvider + FsEnvProvider
│   ├── git.ts             # IGitProvider + SimpleGitProvider
│   ├── log.ts             # ILogProvider + FsLogProvider
│   ├── port.ts            # IPortProvider + LsofPortProvider
│   └── process.ts         # IProcessProvider + NodeProcessProvider
├── registry/
│   └── tool-registry.ts   # wires tools to the MCP server
├── tools/
│   └── <tool-name>/
│       ├── schema.ts
│       ├── handler.ts
│       └── handler.test.ts
├── index.ts               # stdio transport + startup
└── server.ts              # createServer() factory
```

---

## Tech stack

| | |
|---|---|
| Runtime | Node.js 20+ |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Validation | `zod` |
| Git | `simple-git` |
| Docker | `dockerode` |
| Shell | `execa` |
| Build | `tsup` |
| Tests | `vitest` |
| Lint + format | `biome` |
| CI | GitHub Actions |
