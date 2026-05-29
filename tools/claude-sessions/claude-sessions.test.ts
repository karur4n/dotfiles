import { expect, test } from "bun:test"
import * as mod from "./claude-sessions.ts"

test("module exports Session type usage compiles and error classes exist", () => {
  expect(typeof mod.NotAGitRepoError).toBe("function")
  expect(typeof mod.MissingDependencyError).toBe("function")
})
