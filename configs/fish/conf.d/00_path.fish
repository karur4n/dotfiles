# Homebrew PATH (must load before other conf.d scripts)
if test -x /opt/homebrew/bin/brew
    eval "$(/opt/homebrew/bin/brew shellenv)"
end
