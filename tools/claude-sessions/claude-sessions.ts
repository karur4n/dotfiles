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
