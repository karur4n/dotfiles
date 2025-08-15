local wezterm = require("wezterm")

local module = {}

function module.apply_to_config(config)
	config.font_size = 14
	config.line_height = 1.2
	config.color_scheme = "Tokyo Night"
	config.font = wezterm.font("UDEV Gothic 35NF")

	--
	-- Tab
	--
	config.show_close_tab_button_in_tabs = false
	config.show_new_tab_button_in_tab_bar = false

	config.window_frame = {
		font = wezterm.font({ family = "UDEV Gothic 35NF", weight = "Bold" }),

		font_size = 15.0,

		active_titlebar_bg = "#333333",

		inactive_titlebar_bg = "#333333",
	}

	config.inactive_pane_hsb = {
		saturation = 0.9,
		brightness = 0.6,
	}

	config.colors = {
		tab_bar = {
			inactive_tab_edge = "#575757",
		},
	}
end

return module
