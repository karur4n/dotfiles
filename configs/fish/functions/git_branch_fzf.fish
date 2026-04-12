function git_branch_fzf
    set selected (git branch --sort=-committerdate --format='%(refname:short)' | fzf --layout reverse)
    if test -n "$selected"
        git switch $selected
        commandline -f repaint
    end
end
