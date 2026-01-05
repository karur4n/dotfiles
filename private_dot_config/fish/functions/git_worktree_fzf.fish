function git_worktree_fzf
    set selected_worktree (git worktree list | fzf --layout reverse)
    if test -n "$selected_worktree"
        set worktree_path (string split " " $selected_worktree)[1]

        cd $worktree_path
        commandline -f repaint
    end
end
