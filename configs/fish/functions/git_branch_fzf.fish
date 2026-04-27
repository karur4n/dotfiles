function git_branch_fzf
    set -l selected (
        git for-each-ref --sort=-committerdate \
            --format='%(refname:short) %(worktreepath)' refs/heads/ \
        | awk '{
            if (NF >= 2) printf "%-40s ⇢ %s\n", $1, $2
            else print $1
        }' \
        | fzf --layout reverse
    )
    if test -z "$selected"
        return
    end

    set -l branch (string split -m 1 ' ' -- $selected)[1]
    set -l wt_path (git for-each-ref --format='%(worktreepath)' "refs/heads/$branch")

    if test -n "$wt_path"
        cd $wt_path
    else
        git switch $branch
    end
    commandline -f repaint
end
