local wezterm = require 'wezterm'

wezterm.on('bell', function(window, pane)
  window:toast_notification('Claude Code', 'Task completed', nil, 4000)
end)

return {
  audible_bell = 'SystemBeep',  -- 音も鳴らす場合
}
