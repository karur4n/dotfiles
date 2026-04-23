function cx
    printf "\033[2J\033[3J\033[H"
    claude --permission-mode bypassPermissions $argv
end
