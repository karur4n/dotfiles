function git-worktree-remove --description "Remove the current git worktree"
    # Get the current worktree path
    set -l current_wt (git rev-parse --show-toplevel 2>/dev/null)
    if test $status -ne 0
        echo "エラー: gitリポジトリ内ではありません"
        return 1
    end

    # Get the main working tree path
    set -l main_wt (git worktree list --porcelain | head -1 | string replace 'worktree ' '')

    # Don't delete the main working tree
    if test "$current_wt" = "$main_wt"
        echo "エラー: メインのworking treeは削除できません"
        return 1
    end

    # Get the branch name
    set -l branch (git branch --show-current 2>/dev/null)
    if test -z "$branch"
        echo "エラー: ブランチ名を取得できません (detached HEAD?)"
        return 1
    end

    echo "worktree '$current_wt' ($branch) を削除中..."

    # Move to the main working tree first
    cd $main_wt

    # Remove the worktree using git-wt
    if git wt -d $branch
        echo "worktree が正常に削除されました"
    else
        echo "worktreeの削除に失敗しました"
        return 1
    end
end
