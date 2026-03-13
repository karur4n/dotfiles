# Make sure fzf executes preview commands with fish.
set --export SHELL (command --search fish)

# Default to reverse layout unless the user already specified one.
if not string match -qr -- '(^| )--layout(=| )' "$FZF_DEFAULT_OPTS"
    set --export FZF_DEFAULT_OPTS "--layout=reverse $FZF_DEFAULT_OPTS"
end

# Set up fzf key bindings
fzf --fish | source
