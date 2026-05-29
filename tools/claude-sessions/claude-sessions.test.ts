import { expect, test } from "bun:test"
import * as mod from "./claude-sessions.ts"
import { parseWorktreePorcelain } from "./claude-sessions.ts"

test("module exports Session type usage compiles and error classes exist", () => {
  expect(typeof mod.NotAGitRepoError).toBe("function")
  expect(typeof mod.MissingDependencyError).toBe("function")
})

test("parseWorktreePorcelain extracts worktree paths", () => {
  const text = [
    "worktree /Users/me/repo",
    "HEAD abc123",
    "branch refs/heads/main",
    "",
    "worktree /Users/me/repo/.wt/feature",
    "HEAD def456",
    "branch refs/heads/feature",
    "",
  ].join("\n")
  expect(parseWorktreePorcelain(text)).toEqual([
    "/Users/me/repo",
    "/Users/me/repo/.wt/feature",
  ])
})

test("parseWorktreePorcelain handles empty input", () => {
  expect(parseWorktreePorcelain("")).toEqual([])
})
