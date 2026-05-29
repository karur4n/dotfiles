#!/usr/bin/env bun

import { readdir, stat, mkdtemp, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

export type Session = {
  sessionId: string
  cwd: string
  branch: string
  worktreePath: string
  updatedAt: Date
  messageCount: number
  lastUserPrompt: string
}

export class NotAGitRepoError extends Error {}
export class MissingDependencyError extends Error {}

export function parseWorktreePorcelain(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter((p) => p.length > 0)
}

export function findContainingWorktree(
  cwd: string,
  worktrees: string[],
): string | null {
  const stripSlash = (p: string): string => p.replace(/\/+$/, "")
  const c = stripSlash(cwd)
  let best: string | null = null
  for (const w of worktrees) {
    const wn = stripSlash(w)
    if (c === wn || c.startsWith(wn + "/")) {
      if (best === null || wn.length > best.length) best = wn
    }
  }
  return best
}

export function extractCwdBranch(
  headText: string,
): { cwd: string; branch: string } | null {
  for (const line of headText.split("\n")) {
    const t = line.trim()
    if (t.length === 0) continue
    let obj: unknown
    try {
      obj = JSON.parse(t)
    } catch {
      continue
    }
    if (obj !== null && typeof obj === "object" && "cwd" in obj) {
      const rec = obj as Record<string, unknown>
      if (typeof rec.cwd === "string") {
        return {
          cwd: rec.cwd,
          branch: typeof rec.gitBranch === "string" ? rec.gitBranch : "",
        }
      }
    }
  }
  return null
}

export function formatRelativeTime(date: Date, now: Date): string {
  const sec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

export function truncate(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, " ").trim()
  return oneLine.length <= n ? oneLine : oneLine.slice(0, n - 1) + "…"
}

export function extractLastUserPrompt(tailText: string): string | null {
  const lines = tailText.split("\n")
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim()
    if (t.length === 0) continue
    let obj: unknown
    try {
      obj = JSON.parse(t)
    } catch {
      continue
    }
    if (obj === null || typeof obj !== "object") continue
    const rec = obj as Record<string, unknown>
    if (rec.type !== "user") continue
    if (rec.isMeta === true) continue
    const message = rec.message as Record<string, unknown> | undefined
    const content = message?.content
    let text: string | null = null
    if (typeof content === "string") {
      text = content
    } else if (Array.isArray(content)) {
      const hasToolResult = content.some(
        (p) => p !== null && typeof p === "object" && (p as Record<string, unknown>).type === "tool_result",
      )
      if (hasToolResult) continue
      const textPart = content.find(
        (p) =>
          p !== null &&
          typeof p === "object" &&
          (p as Record<string, unknown>).type === "text" &&
          typeof (p as Record<string, unknown>).text === "string",
      ) as { text: string } | undefined
      if (textPart) text = textPart.text
    }
    if (text !== null && text.trim().length > 0) return text.trim()
  }
  return null
}

export function formatRow(session: Session, now: Date): string {
  const branch = session.branch || "(no branch)"
  const rel = formatRelativeTime(session.updatedAt, now)
  const shortId = session.sessionId.slice(0, 8)
  const prompt = truncate(session.lastUserPrompt || "(no prompt)", 80)
  const visible =
    `${branch.padEnd(24)} ${rel.padStart(8)}  ` +
    `${String(session.messageCount).padStart(5)}msg  ${shortId}  ${prompt}`
  return `${session.sessionId}\t${visible}`
}

export function formatPreview(session: Session): string {
  return [
    `Session : ${session.sessionId}`,
    `Branch  : ${session.branch || "(no branch)"}`,
    `Worktree: ${session.worktreePath}`,
    `CWD     : ${session.cwd}`,
    `Updated : ${session.updatedAt.toISOString()}`,
    `Messages: ${session.messageCount}`,
    ``,
    `Last user prompt:`,
    `----------------`,
    session.lastUserPrompt || "(no prompt)",
  ].join("\n")
}

async function main(): Promise<void> {
  console.error("not implemented yet")
  process.exit(1)
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
