function workspace
    set -l dir (pwd)

    osascript -e "
        tell application \"Ghostty\"
            activate

            set cfg to new surface configuration
            set initial working directory of cfg to \"$dir\"

            set win to front window
            set paneLeft to terminal 1 of selected tab of win

            set paneTopRight to split paneLeft direction right with configuration cfg
            set paneBottomRight to split paneTopRight direction down with configuration cfg

            input text \"lazygit\" to paneTopRight
            send key \"enter\" to paneTopRight

            input text \"cx\" to paneLeft
            send key \"enter\" to paneLeft

            focus paneLeft
        end tell
    "
end
