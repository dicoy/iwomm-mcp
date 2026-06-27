import simpleGit, { type SimpleGitOptions } from "simple-git";
import { GitNotARepositoryError } from "../errors/index.js";

export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface IGitProvider {
  getStatus(repoPath: string): Promise<GitStatus>;
  getRecentCommits(repoPath: string, limit?: number): Promise<CommitInfo[]>;
  isRepository(repoPath: string): Promise<boolean>;
}

export class SimpleGitProvider implements IGitProvider {
  private git(repoPath: string) {
    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      binary: "git",
      maxConcurrentProcesses: 6,
    };
    return simpleGit(options);
  }

  async isRepository(repoPath: string): Promise<boolean> {
    try {
      await this.git(repoPath).revparse(["--git-dir"]);
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(repoPath: string): Promise<GitStatus> {
    const g = this.git(repoPath);
    try {
      const [status, branch] = await Promise.all([g.status(), g.branch()]);

      return {
        branch: status.current ?? branch.current ?? "unknown",
        isClean: status.isClean(),
        staged: status.staged,
        unstaged: [...status.modified, ...status.deleted],
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch (err) {
      throw new GitNotARepositoryError(repoPath);
    }
  }

  async getRecentCommits(repoPath: string, limit = 10): Promise<CommitInfo[]> {
    try {
      const log = await this.git(repoPath).log({ maxCount: limit });
      return log.all.map((entry) => ({
        hash: entry.hash.slice(0, 8),
        message: entry.message,
        author: entry.author_name,
        date: entry.date,
      }));
    } catch (err) {
      throw new GitNotARepositoryError(repoPath);
    }
  }
}
