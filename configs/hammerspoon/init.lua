-- アプリを切り替えた際、切り替え先が別ディスプレイにある場合に限り、
-- マウスカーソルをそのウィンドウの中央へ自動で移動させるスクリプト。
-- 同じディスプレイ内でのアプリ切り替えでは、カーソルは動かない。
hs.window.filter.default:subscribe(hs.window.filter.windowFocused, function(win)
	if not win then
		return
	end

	local mouseScreen = hs.mouse.getCurrentScreen()
	local winScreen = win:screen()

	-- 別ディスプレイのウィンドウにフォーカスが移った時だけ
	if mouseScreen ~= winScreen then
		local frame = win:frame()
		local center = hs.geometry.point(frame.x + frame.w / 2, frame.y + frame.h / 2)
		hs.mouse.absolutePosition(center)
	end
end)
