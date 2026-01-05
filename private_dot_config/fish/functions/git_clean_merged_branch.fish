function git_clean_merged_branch --description "Clean up merged branches and remove local branches deleted from remote"
    # マージ済みブランチを削除
    echo "Cleaning up merged branches..."
    git branch --merged | grep -v "\*" | grep -v "main" | grep -v "master" | xargs -n 1 git branch -d
    
    # リモートで削除されたブランチの参照を削除
    echo "Pruning remote-tracking branches..."
    git remote prune origin
    
    # リモートで削除されたブランチをローカルからも削除
    echo "Removing local branches that have been deleted from remote..."
    git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -D
    
    echo "Cleanup completed!"
end
