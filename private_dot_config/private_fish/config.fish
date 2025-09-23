if status is-interactive
    eval "$(/opt/homebrew/bin/brew shellenv)"
end

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH
