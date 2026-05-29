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

import { extractCwdBranch } from "./claude-sessions.ts"

test("extractCwdBranch finds the first line carrying a cwd", () => {
  const head = [
    JSON.stringify({ type: "last-prompt", leafUuid: "x" }),
    JSON.stringify({ type: "permission-mode", permissionMode: "default" }),
    JSON.stringify({ type: "system", cwd: "/Users/me/repo/.wt/f", gitBranch: "f" }),
  ].join("\n")
  expect(extractCwdBranch(head)).toEqual({
    cwd: "/Users/me/repo/.wt/f",
    branch: "f",
  })
})

test("extractCwdBranch returns empty branch when gitBranch missing", () => {
  const head = JSON.stringify({ type: "system", cwd: "/Users/me/repo" })
  expect(extractCwdBranch(head)).toEqual({ cwd: "/Users/me/repo", branch: "" })
})

test("extractCwdBranch skips malformed lines and a truncated tail line", () => {
  const head =
    "{not json}\n" +
    JSON.stringify({ type: "system", cwd: "/Users/me/repo", gitBranch: "main" }) +
    "\n{partial truncated"
  expect(extractCwdBranch(head)).toEqual({ cwd: "/Users/me/repo", branch: "main" })
})

test("extractCwdBranch returns null when no cwd present", () => {
  const head = JSON.stringify({ type: "last-prompt", leafUuid: "x" })
  expect(extractCwdBranch(head)).toBeNull()
})

import { extractLastUserPrompt } from "./claude-sessions.ts"

test("extractLastUserPrompt returns the last string-content user message", () => {
  const tail = [
    JSON.stringify({ type: "user", message: { role: "user", content: "first" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "ok" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "second" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "done" } }),
  ].join("\n")
  expect(extractLastUserPrompt(tail)).toBe("second")
})

test("extractLastUserPrompt extracts text part from array content", () => {
  const tail = JSON.stringify({
    type: "user",
    message: { role: "user", content: [{ type: "text", text: "hello there" }] },
  })
  expect(extractLastUserPrompt(tail)).toBe("hello there")
})

test("extractLastUserPrompt skips tool_result user messages", () => {
  const tail = [
    JSON.stringify({ type: "user", message: { role: "user", content: "real prompt" } }),
    JSON.stringify({
      type: "user",
      message: { role: "user", content: [{ type: "tool_result", content: "x" }] },
    }),
  ].join("\n")
  expect(extractLastUserPrompt(tail)).toBe("real prompt")
})

test("extractLastUserPrompt skips meta messages", () => {
  const tail = [
    JSON.stringify({ type: "user", message: { role: "user", content: "keep me" } }),
    JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: "meta noise" } }),
  ].join("\n")
  expect(extractLastUserPrompt(tail)).toBe("keep me")
})

test("extractLastUserPrompt tolerates a truncated leading line from tail slice", () => {
  const tail =
    'tial":"truncated json from slice boundary"}\n' +
    JSON.stringify({ type: "user", message: { role: "user", content: "good" } })
  expect(extractLastUserPrompt(tail)).toBe("good")
})

test("extractLastUserPrompt returns null when no user prompt present", () => {
  const tail = JSON.stringify({ type: "assistant", message: { role: "assistant", content: "x" } })
  expect(extractLastUserPrompt(tail)).toBeNull()
})
