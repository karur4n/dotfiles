#!/usr/bin/env python3
"""Fork the focused pane's Claude Code session into a new pane below,
leaving the original conversation untouched (herdr-side /branch)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from typing import Any


def herdr_bin() -> str:
    return os.environ.get("HERDR_BIN_PATH") or "herdr"


def context() -> dict[str, Any]:
    try:
        return json.loads(os.environ.get("HERDR_PLUGIN_CONTEXT_JSON") or "{}")
    except json.JSONDecodeError:
        return {}


def run_json(args: list[str]) -> dict[str, Any]:
    result = subprocess.run([herdr_bin(), *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise SystemExit(result.stderr or result.stdout or f"herdr {' '.join(args)} failed")
    payload = json.loads(result.stdout)
    if "error" in payload:
        raise SystemExit(json.dumps(payload["error"]))
    return payload


def fail(body: str) -> None:
    subprocess.run([herdr_bin(), "notification", "show", "claude branch failed", "--body", body, "--sound", "request"])
    raise SystemExit(1)


def main() -> None:
    ctx = context()
    pane_id = ctx.get("focused_pane_id") or os.environ.get("HERDR_PANE_ID")
    if not pane_id:
        fail("missing focused pane id")

    pane = run_json(["pane", "get", str(pane_id)])["result"]["pane"]
    session = pane.get("agent_session") or {}
    if pane.get("agent") != "claude" or session.get("kind") != "id" or not session.get("value"):
        fail("focused pane has no known claude session")

    claude = shutil.which("claude") or os.path.expanduser("~/.local/bin/claude")
    name = f"branch-{time.strftime('%H%M%S')}"
    run_json([
        "agent", "start", name,
        "--cwd", pane["cwd"],
        "--split", "down",
        "--no-focus",
        "--", claude, "--resume", session["value"], "--fork-session",
    ])


if __name__ == "__main__":
    main()
