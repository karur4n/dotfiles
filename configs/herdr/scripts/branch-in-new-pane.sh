#!/bin/sh
# Fork the focused pane's Claude Code session into a new pane below,
# leaving the original conversation untouched (herdr-side /branch).

set -eu

claude_bin=$(command -v claude || echo "$HOME/.local/bin/claude")

info=$(herdr agent list | python3 -c '
import json, sys
d = json.load(sys.stdin)
for a in d["result"]["agents"]:
    if a.get("focused") and a.get("agent") == "claude":
        s = a.get("agent_session") or {}
        if s.get("kind") == "id" and s.get("value"):
            print(s["value"], a["cwd"])
        break
')

if [ -z "$info" ]; then
  herdr notification show "branch failed" --body "focused pane has no known claude session" --sound request
  exit 1
fi

session_id=${info%% *}
cwd=${info#* }

herdr agent start "branch-$(date +%H%M%S)" \
  --cwd "$cwd" \
  --split down \
  --no-focus \
  -- "$claude_bin" --resume "$session_id" --fork-session
