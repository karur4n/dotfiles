#!/usr/bin/env bun

import { readdir, stat } from "node:fs/promises"
import { basename, join } from "node:path"
import { existsSync } from "node:fs"

export type Session = {
  sessionId: string
  cwd: string
  branch: string
  worktreePath: string
  updatedAt: Date
  messageCount: number
  lastUserPrompt: string
  aiTitle: string | null
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

export function extractLatestAiTitle(tailText: string): string | null {
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
    if (rec.type !== "ai-title") continue
    if (typeof rec.aiTitle === "string" && rec.aiTitle.trim().length > 0) {
      return rec.aiTitle.trim()
    }
  }
  return null
}

export function formatRow(session: Session, now: Date): string {
  const branch = session.branch || "(no branch)"
  const rel = formatRelativeTime(session.updatedAt, now)
  const shortId = session.sessionId.slice(0, 8)
  const label = truncate(session.aiTitle || session.lastUserPrompt || "(no prompt)", 80)
  const visible =
    `${branch.padEnd(24)} ${rel.padStart(8)}  ` +
    `${String(session.messageCount).padStart(5)}msg  ${shortId}  ${label}`
  return `${session.sessionId}\t${visible}`
}

// The session's recorded cwd may be a (now-deleted) package subdir; the worktree
// root is always present because git just enumerated it.
export function resolveSessionDir(session: Session, cwdExists: boolean): string {
  return cwdExists ? session.cwd : session.worktreePath
}

const HEAD_BYTES = 64 * 1024
const TAIL_BYTES = 256 * 1024

async function listSessionFiles(projectsDir: string): Promise<string[]> {
  let dirents
  try {
    dirents = await readdir(projectsDir, { withFileTypes: true })
  } catch {
    return []
  }
  const files: string[] = []
  for (const d of dirents) {
    if (!d.isDirectory()) continue
    const sub = join(projectsDir, d.name)
    let entries: string[]
    try {
      entries = await readdir(sub)
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.endsWith(".jsonl")) files.push(join(sub, e))
    }
  }
  return files
}

async function countLines(path: string): Promise<number> {
  // wc -l counts newlines; a file without a trailing newline undercounts by 1
  const proc = Bun.spawn(["wc", "-l", path], { stdout: "pipe", stderr: "ignore" })
  const [out] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
  const n = parseInt(out.trim().split(/\s+/)[0] ?? "0", 10)
  return Number.isFinite(n) ? n : 0
}

async function readSessionMeta(
  file: string,
  worktrees: string[],
): Promise<Session | null> {
  const st = await stat(file)
  if (st.size === 0) return null
  const f = Bun.file(file)
  const headText = await f.slice(0, Math.min(HEAD_BYTES, st.size)).text()
  const cb = extractCwdBranch(headText)
  if (cb === null) return null
  const worktreePath = findContainingWorktree(cb.cwd, worktrees)
  if (worktreePath === null) return null
  const tailText = await f.slice(Math.max(0, st.size - TAIL_BYTES), st.size).text()
  const lastUserPrompt = extractLastUserPrompt(tailText) ?? "(prompt not found)"
  const aiTitle = extractLatestAiTitle(tailText)
  const messageCount = await countLines(file)
  const sessionId = basename(file).replace(/\.jsonl$/, "")
  return {
    sessionId,
    cwd: cb.cwd,
    branch: cb.branch,
    worktreePath,
    updatedAt: st.mtime,
    messageCount,
    lastUserPrompt,
    aiTitle,
  }
}

export async function collectSessions(
  projectsDir: string,
  worktrees: string[],
): Promise<Session[]> {
  const files = await listSessionFiles(projectsDir)
  const metas = await Promise.all(
    files.map((f) => readSessionMeta(f, worktrees).catch(() => null)),
  )
  const sessions = metas.filter((s): s is Session => s !== null)
  sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  return sessions
}

async function getWorktreePaths(): Promise<string[]> {
  const proc = Bun.spawn(["git", "worktree", "list", "--porcelain"], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) {
    throw new NotAGitRepoError(err.trim() || "git worktree list failed")
  }
  return parseWorktreePorcelain(out)
}

async function pickSession(sessions: Session[], now: Date): Promise<string | null> {
  if (!Bun.which("fzf")) {
    throw new MissingDependencyError("fzf is required. Install it with: brew install fzf")
  }
  const rows = sessions.map((s) => formatRow(s, now)).join("\n")
  const proc = Bun.spawn(
    [
      "fzf",
      "--delimiter=	",
      "--with-nth=2..",
      "--prompt=claude session> ",
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "inherit" },
  )
  await proc.stdin.write(rows)
  await proc.stdin.end()
  const [out, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ])
  if (code !== 0) return null // 130 = Esc/Ctrl-C, 1 = no match, 2 = fzf error (printed to stderr)
  const selected = out.trim()
  if (selected.length === 0) return null
  return selected.split("\t")[0]
}

async function resume(session: Session): Promise<void> {
  if (!Bun.which("claude")) {
    throw new MissingDependencyError("claude CLI not found in PATH")
  }
  const cwd = resolveSessionDir(session, existsSync(session.cwd))
  const proc = Bun.spawn(["claude", "--resume", session.sessionId], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const code = await proc.exited
  if (code !== 0) process.exit(code)
}

async function main(): Promise<void> {
  let worktrees: string[]
  try {
    worktrees = await getWorktreePaths()
  } catch (e) {
    if (e instanceof NotAGitRepoError) {
      console.error("Not a git repository (run this inside a git repo).")
      process.exit(1)
    }
    throw e
  }

  const home = process.env.HOME
  if (!home) {
    console.error("HOME environment variable is not set.")
    process.exit(1)
  }
  const projectsDir = join(home, ".claude", "projects")
  const now = new Date()
  const sessions = await collectSessions(projectsDir, worktrees)

  if (sessions.length === 0) {
    console.error("No Claude sessions found for this repository or its worktrees.")
    process.exit(0)
  }

  let selectedId: string | null
  try {
    selectedId = await pickSession(sessions, now)
  } catch (e) {
    if (e instanceof MissingDependencyError) {
      console.error(e.message)
      process.exit(1)
    }
    throw e
  }

  if (selectedId === null) process.exit(0) // cancelled

  const selected = sessions.find((s) => s.sessionId === selectedId)
  if (selected === undefined) {
    console.error("Selected session not found.")
    process.exit(1)
  }

  // --print: emit the target dir and sessionId for a shell wrapper to `cd` and resume,
  // so the parent shell stays in the worktree. stdout = exactly two lines.
  if (process.argv.slice(2).includes("--print")) {
    console.log(resolveSessionDir(selected, existsSync(selected.cwd)))
    console.log(selected.sessionId)
    return
  }

  try {
    await resume(selected)
  } catch (e) {
    if (e instanceof MissingDependencyError) {
      console.error(e.message)
      process.exit(1)
    }
    throw e
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
