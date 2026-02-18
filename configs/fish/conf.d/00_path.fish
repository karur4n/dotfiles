fish_add_path $HOME/bin
fish_add_path $HOME/.local/bin

# obsidian
fish_add_path /Applications/Obsidian.app/Contents/MacOS

# Homebrew PATH (must load before other conf.d scripts)
if test -x /opt/homebrew/bin/brew
    eval "$(/opt/homebrew/bin/brew shellenv)"
end
