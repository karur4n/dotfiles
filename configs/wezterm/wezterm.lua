local wezterm = require("wezterm")

local config = wezterm.config_builder()
local act = wezterm.action

local appearance = require("appearance")
appearance.apply_to_config(config)

local claude_code = require("claude-code")
claude_code.apply_to_config(config)

config.window_close_confirmation = "NeverPrompt"

--
-- Key bindings
--
config.disable_default_key_bindings = true

-- config.leader = { key = "Space", mods = "CTRL" }

config.keys = {
	{ mods = "SUPER", key = "q", action = act.QuitApplication },
	{ mods = "SUPER", key = "c", action = act.CopyTo("Clipboard") },
	{ mods = "SUPER", key = "v", action = act.PasteFrom("Clipboard") },
	{ mods = "SUPER|SHIFT", key = "r", action = act.ReloadConfiguration },
	{ mods = "SUPER", key = "f", action = act.Search({ CaseSensitiveString = "" }) },
	{ mods = "SUPER", key = "+", action = act.IncreaseFontSize },
	{ mods = "SUPER", key = "-", action = act.DecreaseFontSize },
	{ mods = "SUPER", key = "0", action = act.ResetFontSize },
	{
		key = "t",
		mods = "ALT",
		action = act.ShowLauncherArgs({
			flags = "FUZZY|TABS",
		}),
	},
	{
		key = "w",
		mods = "ALT",
		action = act.ShowLauncherArgs({
			flags = "FUZZY|WORKSPACES",
		}),
	},
	-- 主に Claude Code で Shift + Enter で改行するための設定
	{
		key = "Enter",
		mods = "SHIFT",
		action = act.SendString("\n"),
	},
	--
	-- Tab
	--
	{ key = "t", mods = "SUPER", action = act.SpawnTab("CurrentPaneDomain") },
	{ key = "]", mods = "SUPER|SHIFT", action = act.ActivateTabRelative(1) },
	-- { key = "RightArrow", mods = "SUPER|SHIFT", action = act.ActivateTabRelative(1) },
	{ key = "[", mods = "SUPER|SHIFT", action = act.ActivateTabRelative(-1) },
	-- { key = "LeftArrow", mods = "SUPER|SHIFT", action = act.ActivateTabRelative(-1) },
	{ mods = "SUPER", key = "1", action = act.ActivateTab(0) },
	{ mods = "SUPER", key = "2", action = act.ActivateTab(1) },
	{ mods = "SUPER", key = "3", action = act.ActivateTab(2) },
	{ mods = "SUPER", key = "4", action = act.ActivateTab(3) },
	{ mods = "SUPER", key = "5", action = act.ActivateTab(4) },
	{ mods = "SUPER", key = "6", action = act.ActivateTab(5) },
	{ mods = "SUPER", key = "7", action = act.ActivateTab(6) },
	{ mods = "SUPER", key = "8", action = act.ActivateTab(7) },
	{ mods = "SUPER", key = "9", action = act.ActivateTab(8) },
	{ mods = "SUPER", key = "0", action = act.ActivateTab(9) },

	--
	-- Pane
	--
	{ mods = "SUPER", key = "w", action = act.CloseCurrentPane({ confirm = true }) },
	{ mods = "SUPER", key = "LeftArrow", action = act.ActivatePaneDirection("Left") },
	{ mods = "SUPER", key = "RightArrow", action = act.ActivatePaneDirection("Right") },
	{ mods = "SUPER", key = "UpArrow", action = act.ActivatePaneDirection("Up") },
	{ mods = "SUPER", key = "DownArrow", action = act.ActivatePaneDirection("Down") },
	{ mods = "SUPER", key = "d", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ mods = "SUPER", key = "D", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
	{ key = "]", mods = "SUPER", action = act.ActivatePaneDirection("Next") },
	{ key = "[", mods = "SUPER", action = act.ActivatePaneDirection("Prev") },
	{ key = "p", mods = "SUPER|SHIFT", action = act.ActivateCommandPalette },
	{ key = "w", mods = "LEADER", action = act.ActivateKeyTable({
		name = "workspace",
	}) },
	{ key = "t", mods = "LEADER", action = act.ActivateKeyTable({
		name = "tab",
	}) },

	{
		key = "T",
		mods = "CTRL|SHIFT",
		action = act.PromptInputLine({
			description = "Enter new name for tab",
			initial_value = "",
			action = wezterm.action_callback(function(window, pane, line)
				-- line will be `nil` if they hit escape without entering anything
				-- An empty string if they just hit enter
				-- Or the actual line of text they wrote
				if line then
					window:active_tab():set_title(line)
				end
			end),
		}),
	},
	{
		key = "W",
		mods = "CTRL|SHIFT",
		action = act.PromptInputLine({
			description = wezterm.format({
				{ Attribute = { Intensity = "Bold" } },
				{ Foreground = { AnsiColor = "Fuchsia" } },
				{ Text = "Enter name for new workspace" },
			}),
			action = wezterm.action_callback(function(window, pane, line)
				-- line will be `nil` if they hit escape without entering anything
				-- An empty string if they just hit enter
				-- Or the actual line of text they wrote
				if line then
					window:perform_action(
						act.SwitchToWorkspace({
							name = line,
						}),
						pane
					)
				end
			end),
		}),
	},
}

wezterm.on("update-right-status", function(window, pane)
	window:set_right_status(window:active_workspace())
end)

function tab_title(tab_info)
	local title = tab_info.tab_title
	-- if the tab title is explicitly set, take that
	if title and #title > 0 then
		return title
	end
	-- Otherwise, use the title from the active pane
	-- in that tab
	return tab_info.active_pane.title
end

function tab_emoji(tab_info)
	local emojis = { "🔥", "🧊", "🆗", "😀", "🍃", "🍎", "🍌", "🍇" }

	if #emojis > tab_info.tab_index then
		return emojis[tab_info.tab_index + 1]
	end

	return ""
end

wezterm.on("format-tab-title", function(tab)
	local index = tab.tab_index + 1
	local emoji = tab_emoji(tab)
	local title = tab_title(tab)

	return index .. ": " .. emoji .. " " .. title
end)

config.key_tables = {
	-- Defines the keys that are active in our resize-pane mode.
	-- Since we're likely to want to make multiple adjustments,
	-- we made the activation one_shot=false. We therefore need
	-- to define a key assignment for getting out of this mode.
	-- 'resize_pane' here corresponds to the name="resize_pane" in
	-- the key assignments above.
	tab = {
		{
			key = "Space",
			action = act.ShowLauncherArgs({
				flags = "FUZZY|TABS",
			}),
		},
	},
	search_mode = {
		{ key = "Enter", mods = "NONE", action = act.CopyMode("PriorMatch") },
		{ key = "Escape", mods = "NONE", action = act.CopyMode("Close") },
		{ key = "n", mods = "CTRL", action = act.CopyMode("NextMatch") },
		{ key = "p", mods = "CTRL", action = act.CopyMode("PriorMatch") },
		{ key = "r", mods = "CTRL", action = act.CopyMode("CycleMatchType") },
		{ key = "u", mods = "CTRL", action = act.CopyMode("ClearPattern") },
		{
			key = "PageUp",
			mods = "NONE",
			action = act.CopyMode("PriorMatchPage"),
		},
		{
			key = "PageDown",
			mods = "NONE",
			action = act.CopyMode("NextMatchPage"),
		},
		{ key = "UpArrow", mods = "NONE", action = act.CopyMode("PriorMatch") },
		{ key = "DownArrow", mods = "NONE", action = act.CopyMode("NextMatch") },
	},
	workspace = {
		{
			key = "Space",
			action = act.ShowLauncherArgs({
				flags = "FUZZY|WORKSPACES",
			}),
		},
		{
			key = "r",
			action = act.PromptInputLine({
				description = wezterm.format({
					{ Attribute = { Intensity = "Bold" } },
					{ Foreground = { AnsiColor = "Fuchsia" } },
					{ Text = "Enter name for new workspace name" },
				}),
				action = wezterm.action_callback(function(window, pane, line)
					-- line will be `nil` if they hit escape without entering anything
					-- An empty string if they just hit enter
					-- Or the actual line of text they wrote
					if line then
						wezterm.mux.rename_workspace(wezterm.mux.get_active_workspace(), line)
					end
				end),
			}),
		},
	},
}

return config
