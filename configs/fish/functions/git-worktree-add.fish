# git worktreeを追加する関数
function git-worktree-add --description "Add a new git worktree with the specified name"
    # 引数チェック
    if test (count $argv) -eq 0
        echo "使用方法: add-worktree <worktree-name>"
        echo "例: add-worktree feature/new-feature"
        return 1
    end

    set worktree_name $argv[1]
    
    # 現在のディレクトリがgitリポジトリかチェック
    if not git rev-parse --git-dir > /dev/null 2>&1
        echo "エラー: 現在のディレクトリはgitリポジトリではありません"
        return 1
    end
    
    # worktree名の妥当性チェック（スラッシュを含む場合はディレクトリ構造を作成）
    set worktree_path ".git/worktree-content/$worktree_name"
    
    # 既に存在するかチェック
    if test -d "$worktree_path"
        echo "エラー: worktree '$worktree_name' は既に存在します"
        return 1
    end
    
    # git worktree addを実行
    echo "worktree '$worktree_name' を追加中..."
    if git worktree add "$worktree_path" -b "$worktree_name"
        echo "✅ worktree '$worktree_name' が正常に追加されました"
        echo "パス: $worktree_path"
        echo ""
        echo "使用するには:"
        echo "  cd $worktree_path"
    else
        echo "❌ worktreeの追加に失敗しました"
        return 1
    end
end
