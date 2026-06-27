import { resolve } from "node:path";
import { GitNotARepositoryError } from "../../errors/index.js";
import type { IGitProvider } from "../../providers/git.js";
import type { Input } from "./schema.js";

export async function getGitStatusHandler(
  input: Input,
  gitProvider: IGitProvider,
): Promise<string> {
  const repoPath = resolve(input.path);
  const isRepo = await gitProvider.isRepository(repoPath);

  if (!isRepo) {
    throw new GitNotARepositoryError(repoPath);
  }

  const [status, commits] = await Promise.all([
    gitProvider.getStatus(repoPath),
    input.include_recent_commits ? gitProvider.getRecentCommits(repoPath, 5) : Promise.resolve([]),
  ]);

  const lines: string[] = [];

  lines.push(`Branch: ${status.branch}`);
  lines.push(
    status.ahead > 0 || status.behind > 0
      ? `Sync:   ↑${status.ahead} ahead, ↓${status.behind} behind`
      : "Sync:   up to date",
  );
  lines.push(status.isClean ? "Status: clean" : "Status: dirty");
  lines.push("");

  if (!status.isClean) {
    if (status.staged.length > 0) {
      lines.push(`Staged (${status.staged.length}):`);
      lines.push(...status.staged.map((f) => `  + ${f}`));
      lines.push("");
    }

    if (status.unstaged.length > 0) {
      lines.push(`Modified (${status.unstaged.length}):`);
      lines.push(...status.unstaged.map((f) => `  ~ ${f}`));
      lines.push("");
    }

    if (status.untracked.length > 0) {
      lines.push(`Untracked (${status.untracked.length}):`);
      lines.push(...status.untracked.map((f) => `  ? ${f}`));
      lines.push("");
    }
  }

  if (commits.length > 0) {
    lines.push("Recent commits:");
    for (const commit of commits) {
      lines.push(`  ${commit.hash}  ${commit.message}  (${commit.author}, ${commit.date})`);
    }
  }

  return lines.join("\n").trimEnd();
}
