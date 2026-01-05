local wezterm = require("wezterm")

local module = {}

function module.apply_to_config(config)
	config.dpi = 109
	config.dpi_by_screen = {
		-- default
		["Built-in Retina Display"] = 180,
		-- office
		["DELL U3824DW"] = 109,
		-- home
		["DELL P3222QE"] = 180,
	}

	config.font_size = 11
	config.line_height = 1.2
	config.color_scheme = "Tokyo Night"
	config.font = wezterm.font_with_fallback({
		{
			family = "UDEV Gothic 35NF",
			assume_emoji_presentation = false,
		},
		{
			family = "Apple Color Emoji",
		},
	})

	config.window_decorations = "RESIZE|INTEGRATED_BUTTONS"

	--
	-- Tab
	--
	config.show_close_tab_button_in_tabs = false
	config.show_new_tab_button_in_tab_bar = false

	config.window_frame = {
		font = wezterm.font_with_fallback({
			{
				family = "UDEV Gothic 35NF",
				weight = "Bold",
				assume_emoji_presentation = false,
			},
			{
				family = "Apple Color Emoji",
			},
		}),

		font_size = 11.0,

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
