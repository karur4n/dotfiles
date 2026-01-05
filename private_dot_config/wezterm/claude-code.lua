local wezterm = require("wezterm")

local module = {}

function module.apply_to_config(config)
  wezterm.on('bell', function(window, pane)
    window:toast_notification('Claude Code', 'Task completed', nil, 4000)
  end)

  config.audible_bell = 'SystemBeep'  -- 音も鳴らす場合
end

return module
