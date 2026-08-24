local wezterm = require("wezterm")

local config = wezterm.config_builder()
local act = wezterm.action

local appearance = require("appearance")
appearance.apply_to_config(config)

config.window_close_confirmation = "NeverPrompt"

--
-- Key bindings
--
-- This WezTerm is a host for herdr. Tabs, panes and workspaces all belong to
-- herdr, so WezTerm owns only window-level keys and translates Cmd chords into
-- herdr's prefix sequences.
-- NOTE: the translation lives here rather than in herdr's own config so that
-- config stays prefix-only and keeps working from Ghostty and over ssh.
config.disable_default_key_bindings = true

-- NOTE: must stay false. With the kitty keyboard protocol on, herdr panes drop
-- ESC presses (3 of 5 fast taps), which breaks Claude Code's double-Esc rewind
-- and interrupts. https://github.com/herdrdev/herdr/issues/1266
config.enable_kitty_keyboard = false

-- TEMPORARY: logs raw key events so we can confirm how Cmd+Shift+[ arrives.
-- Remove once the bracket bindings are verified.
config.debug_key_events = true

local herdr_prefix = { mods = "CTRL", key = "t" }

-- Cmd chord -> herdr prefix sequence.
local function herdr(key, mods)
	return act.Multiple({
		act.SendKey(herdr_prefix),
		act.SendKey({ key = key, mods = mods or "NONE" }),
	})
end

config.keys = {
	--
	-- WezTerm window
	--
	{ mods = "SUPER", key = "q", action = act.QuitApplication },
	{ mods = "SUPER", key = "v", action = act.PasteFrom("Clipboard") },
	{ mods = "SUPER", key = "+", action = act.IncreaseFontSize },
	{ mods = "SUPER", key = "-", action = act.DecreaseFontSize },
	{ mods = "SUPER", key = "0", action = act.ResetFontSize },

	-- 主に Claude Code で Shift + Enter で改行するための設定
	{ mods = "SHIFT", key = "Enter", action = act.SendString("\n") },

	--
	-- Tab
	--
	{ mods = "SUPER", key = "t", action = herdr("c") }, -- new_tab
	{ mods = "SUPER|SHIFT", key = "w", action = herdr("x", "SHIFT") }, -- close_tab
	{ mods = "ALT", key = "LeftArrow", action = herdr("p") }, -- previous_tab
	{ mods = "ALT", key = "RightArrow", action = herdr("n") }, -- next_tab

	--
	-- Workspace
	--
	{ mods = "SUPER", key = "n", action = herdr("n", "SHIFT") }, -- new_workspace
	{ mods = "SUPER|ALT", key = "w", action = herdr("d", "SHIFT") }, -- close_workspace
	-- NOTE: a shifted key arrives as the shifted character with SHIFT still set
	-- (Cmd+Shift+n logs as Char('N') + SHIFT|SUPER), so Cmd+Shift+[ is "{", not
	-- "[". Binding key = "[" here can never match.
	{ mods = "SUPER|SHIFT", key = "{", action = herdr("UpArrow") }, -- previous_workspace
	{ mods = "SUPER|SHIFT", key = "}", action = herdr("DownArrow") }, -- next_workspace
	{ mods = "SUPER", key = "p", action = herdr("w") }, -- workspace_picker

	--
	-- Pane
	--
	{ mods = "SUPER", key = "w", action = herdr("x") }, -- close_pane
	{ mods = "SUPER", key = "d", action = herdr("v") }, -- split_vertical
	{ mods = "SUPER|SHIFT", key = "d", action = herdr("-") }, -- split_horizontal
	{ mods = "SUPER|ALT", key = "LeftArrow", action = herdr("h", "SHIFT") }, -- focus_pane_left
	{ mods = "SUPER|ALT", key = "DownArrow", action = herdr("j") }, -- focus_pane_down
	{ mods = "SUPER|ALT", key = "UpArrow", action = herdr("k") }, -- focus_pane_up
	{ mods = "SUPER|ALT", key = "RightArrow", action = herdr("l") }, -- focus_pane_right
	{ mods = "SUPER|SHIFT", key = "Enter", action = herdr("z") }, -- zoom
	{ mods = "SUPER", key = "r", action = herdr("r") }, -- resize_mode

	--
	-- App
	--
	{ mods = "SUPER", key = ",", action = herdr("s") }, -- settings
	{ mods = "SUPER", key = "k", action = herdr("g") }, -- goto
	{ mods = "SUPER", key = "b", action = herdr("b") }, -- toggle_sidebar
	{ mods = "SUPER", key = "/", action = herdr("?") }, -- help
	{ mods = "SUPER|SHIFT", key = "r", action = herdr("r", "SHIFT") }, -- reload_config
}

return config
