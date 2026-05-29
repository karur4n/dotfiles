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

import { findContainingWorktree } from "./claude-sessions.ts"

test("findContainingWorktree matches exact worktree path", () => {
  const wts = ["/Users/me/repo", "/Users/me/repo/.wt/feature"]
  expect(findContainingWorktree("/Users/me/repo", wts)).toBe("/Users/me/repo")
})

test("findContainingWorktree matches a subdirectory of a worktree", () => {
  const wts = ["/Users/me/repo", "/Users/me/repo/.wt/feature"]
  expect(
    findContainingWorktree("/Users/me/repo/.wt/feature/packages/api", wts),
  ).toBe("/Users/me/repo/.wt/feature")
})

test("findContainingWorktree prefers the longest (most specific) match", () => {
  const wts = ["/Users/me/repo", "/Users/me/repo/.wt/feature"]
  expect(
    findContainingWorktree("/Users/me/repo/.wt/feature", wts),
  ).toBe("/Users/me/repo/.wt/feature")
})

test("findContainingWorktree returns null when cwd is outside all worktrees", () => {
  const wts = ["/Users/me/repo"]
  expect(findContainingWorktree("/Users/other/proj", wts)).toBeNull()
})

test("findContainingWorktree does not match sibling prefix collisions", () => {
  const wts = ["/Users/me/repo"]
  expect(findContainingWorktree("/Users/me/repo-2", wts)).toBeNull()
})
