import { describe, expect, it, vi } from "vitest";
import { GitNotARepositoryError } from "../../errors/index.js";
import type { CommitInfo, GitStatus, IGitProvider } from "../../providers/git.js";
import { getGitStatusHandler } from "./handler.js";

const makeStatus = (overrides: Partial<GitStatus> = {}): GitStatus => ({
  branch: "main",
  isClean: true,
  staged: [],
  unstaged: [],
  untracked: [],
  ahead: 0,
  behind: 0,
  ...overrides,
});

const makeCommit = (overrides: Partial<CommitInfo> = {}): CommitInfo => ({
  hash: "abc12345",
  message: "feat: add new feature",
  author: "Dev",
  date: "2024-01-15",
  ...overrides,
});

const makeProvider = (overrides: Partial<IGitProvider> = {}): IGitProvider => ({
  isRepository: vi.fn().mockResolvedValue(true),
  getStatus: vi.fn().mockResolvedValue(makeStatus()),
  getRecentCommits: vi.fn().mockResolvedValue([]),
  ...overrides,
});

describe("getGitStatusHandler", () => {
  it("throws when path is not a git repository", async () => {
    const provider = makeProvider({ isRepository: vi.fn().mockResolvedValue(false) });

    await expect(
      getGitStatusHandler({ path: "/not/a/repo", include_recent_commits: false }, provider),
    ).rejects.toThrow(GitNotARepositoryError);
  });

  it("shows clean status for a clean repo", async () => {
    const provider = makeProvider();

    const result = await getGitStatusHandler(
      { path: ".", include_recent_commits: false },
      provider,
    );

    expect(result).toContain("Branch: main");
    expect(result).toContain("Status: clean");
  });

  it("lists staged, unstaged, and untracked files when dirty", async () => {
    const provider = makeProvider({
      getStatus: vi.fn().mockResolvedValue(
        makeStatus({
          isClean: false,
          staged: ["src/foo.ts"],
          unstaged: ["src/bar.ts"],
          untracked: ["README.md"],
        }),
      ),
    });

    const result = await getGitStatusHandler(
      { path: ".", include_recent_commits: false },
      provider,
    );

    expect(result).toContain("Staged");
    expect(result).toContain("src/foo.ts");
    expect(result).toContain("Modified");
    expect(result).toContain("src/bar.ts");
    expect(result).toContain("Untracked");
    expect(result).toContain("README.md");
  });

  it("includes recent commits when include_recent_commits is true", async () => {
    const provider = makeProvider({
      getRecentCommits: vi
        .fn()
        .mockResolvedValue([
          makeCommit({ message: "fix: the big bug" }),
          makeCommit({ message: "chore: cleanup" }),
        ]),
    });

    const result = await getGitStatusHandler({ path: ".", include_recent_commits: true }, provider);

    expect(provider.getRecentCommits).toHaveBeenCalledWith(expect.any(String), 5);
    expect(result).toContain("fix: the big bug");
    expect(result).toContain("chore: cleanup");
  });

  it("shows ahead/behind when not synced", async () => {
    const provider = makeProvider({
      getStatus: vi.fn().mockResolvedValue(makeStatus({ ahead: 3, behind: 1 })),
    });

    const result = await getGitStatusHandler(
      { path: ".", include_recent_commits: false },
      provider,
    );

    expect(result).toContain("↑3 ahead");
    expect(result).toContain("↓1 behind");
  });
});
