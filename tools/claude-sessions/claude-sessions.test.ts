import { expect, test } from "bun:test"
import * as mod from "./claude-sessions.ts"
import { parseWorktreePorcelain } from "./claude-sessions.ts"
import { mkdtemp, mkdir, writeFile, rm, utimes } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

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

import { formatRelativeTime, truncate } from "./claude-sessions.ts"

test("formatRelativeTime renders coarse buckets", () => {
  const now = new Date("2026-05-29T12:00:00Z")
  expect(formatRelativeTime(new Date("2026-05-29T11:59:30Z"), now)).toBe("30s ago")
  expect(formatRelativeTime(new Date("2026-05-29T11:30:00Z"), now)).toBe("30m ago")
  expect(formatRelativeTime(new Date("2026-05-29T09:00:00Z"), now)).toBe("3h ago")
  expect(formatRelativeTime(new Date("2026-05-26T12:00:00Z"), now)).toBe("3d ago")
  expect(formatRelativeTime(new Date("2026-05-08T12:00:00Z"), now)).toBe("3w ago")
})

test("formatRelativeTime clamps future timestamps to 0s", () => {
  const now = new Date("2026-05-29T12:00:00Z")
  expect(formatRelativeTime(new Date("2026-05-29T12:01:00Z"), now)).toBe("0s ago")
})

test("truncate collapses whitespace and adds ellipsis past the limit", () => {
  expect(truncate("  hello   world  ", 80)).toBe("hello world")
  expect(truncate("abcdefghij", 5)).toBe("abcd…")
})

import { formatRow } from "./claude-sessions.ts"
import type { Session } from "./claude-sessions.ts"

const sampleSession: Session = {
  sessionId: "16541be5-0aa9-4c07-a38f-57db77e72c04",
  cwd: "/Users/me/repo/.wt/feature/packages/api",
  branch: "feature",
  worktreePath: "/Users/me/repo/.wt/feature",
  updatedAt: new Date("2026-05-29T09:00:00Z"),
  messageCount: 42,
  lastUserPrompt: "implement the   thing\nplease",
  aiTitle: null,
}

test("formatRow puts sessionId in a leading tab-delimited hidden field", () => {
  const now = new Date("2026-05-29T12:00:00Z")
  const row = formatRow(sampleSession, now)
  const [id, visible] = row.split("\t")
  expect(id).toBe("16541be5-0aa9-4c07-a38f-57db77e72c04")
  expect(visible).toContain("feature")
  expect(visible).toContain("3h ago")
  expect(visible).toContain("42")
  expect(visible).toContain("16541be5")
  expect(visible).toContain("implement the thing please")
})

test("formatRow shows a placeholder for empty branch", () => {
  const now = new Date("2026-05-29T12:00:00Z")
  const row = formatRow({ ...sampleSession, branch: "" }, now)
  expect(row.split("\t")[1]).toContain("(no branch)")
})

test("formatRow prefers aiTitle over the last user prompt as the label", () => {
  const now = new Date("2026-05-29T12:00:00Z")
  const row = formatRow({ ...sampleSession, aiTitle: "PR #35190 ロジック実装" }, now)
  const visible = row.split("\t")[1]
  expect(visible).toContain("PR #35190 ロジック実装")
  expect(visible).not.toContain("implement the thing please")
})

import { extractLatestAiTitle } from "./claude-sessions.ts"

test("extractLatestAiTitle returns the most recent ai-title", () => {
  const tail = [
    JSON.stringify({ type: "ai-title", aiTitle: "old title", sessionId: "s" }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "x" } }),
    JSON.stringify({ type: "ai-title", aiTitle: "new title", sessionId: "s" }),
  ].join("\n")
  expect(extractLatestAiTitle(tail)).toBe("new title")
})

test("extractLatestAiTitle tolerates a truncated leading line from tail slice", () => {
  const tail =
    'le":"truncated"}\n' +
    JSON.stringify({ type: "ai-title", aiTitle: "real title", sessionId: "s" })
  expect(extractLatestAiTitle(tail)).toBe("real title")
})

test("extractLatestAiTitle returns null when no ai-title is present", () => {
  const tail = JSON.stringify({ type: "user", message: { role: "user", content: "hi" } })
  expect(extractLatestAiTitle(tail)).toBeNull()
})

import { collectSessions } from "./claude-sessions.ts"

test("collectSessions returns only sessions whose cwd is inside a worktree, newest first", async () => {
  const projects = await mkdtemp(join(tmpdir(), "cs-projects-"))
  const wt = "/virtual/repo/.wt/feature"
  try {
    const dirA = join(projects, "encoded-A")
    await mkdir(dirA, { recursive: true })
    const fileA = join(dirA, "aaaaaaaa-0000-0000-0000-000000000000.jsonl")
    await writeFile(
      fileA,
      [
        JSON.stringify({ type: "system", cwd: wt + "/packages/api", gitBranch: "feature" }),
        JSON.stringify({ type: "user", message: { role: "user", content: "do A" } }),
        JSON.stringify({ type: "ai-title", aiTitle: "title for A", sessionId: "aaaaaaaa-0000-0000-0000-000000000000" }),
      ].join("\n") + "\n",
    )

    const dirB = join(projects, "encoded-B")
    await mkdir(dirB, { recursive: true })
    await writeFile(
      join(dirB, "bbbbbbbb-0000-0000-0000-000000000000.jsonl"),
      JSON.stringify({ type: "system", cwd: "/somewhere/else", gitBranch: "x" }) + "\n",
    )

    const sessions = await collectSessions(projects, ["/virtual/repo", wt])
    expect(sessions.length).toBe(1)
    expect(sessions[0].sessionId).toBe("aaaaaaaa-0000-0000-0000-000000000000")
    expect(sessions[0].worktreePath).toBe(wt)
    expect(sessions[0].branch).toBe("feature")
    expect(sessions[0].lastUserPrompt).toBe("do A")
    expect(sessions[0].aiTitle).toBe("title for A")
    expect(sessions[0].messageCount).toBe(3)
    expect(sessions[0].updatedAt instanceof Date).toBe(true)
  } finally {
    await rm(projects, { recursive: true, force: true })
  }
})

test("collectSessions returns empty array when projects dir is missing", async () => {
  const sessions = await collectSessions("/nonexistent/projects/dir", ["/virtual/repo"])
  expect(sessions).toEqual([])
})

test("collectSessions sorts matching sessions newest-first by mtime", async () => {
  const projects = await mkdtemp(join(tmpdir(), "cs-sort-"))
  const wt = "/virtual/repo"
  try {
    const dir = join(projects, "encoded")
    await mkdir(dir, { recursive: true })

    const older = join(dir, "11111111-0000-0000-0000-000000000000.jsonl")
    const newer = join(dir, "22222222-0000-0000-0000-000000000000.jsonl")
    const line = (prompt: string) =>
      [
        JSON.stringify({ type: "system", cwd: wt, gitBranch: "main" }),
        JSON.stringify({ type: "user", message: { role: "user", content: prompt } }),
      ].join("\n") + "\n"
    await writeFile(older, line("older work"))
    await writeFile(newer, line("newer work"))

    // set explicit mtimes: older = 2026-01-01, newer = 2026-02-01
    await utimes(older, new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))
    await utimes(newer, new Date("2026-02-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"))

    const sessions = await collectSessions(projects, [wt])
    expect(sessions.length).toBe(2)
    expect(sessions[0].sessionId).toBe("22222222-0000-0000-0000-000000000000")
    expect(sessions[1].sessionId).toBe("11111111-0000-0000-0000-000000000000")
  } finally {
    await rm(projects, { recursive: true, force: true })
  }
})
