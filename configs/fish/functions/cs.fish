function cs --description 'Claude セッションを選んで、その cwd へ cd しつつ resume'
    # ~/.config/fish は dotfiles リポジトリへの symlink。関数の位置からリポジトリ root を解決し、
    # ghq のパスをハードコードせずにツールを参照する。
    set -l repo (path resolve (status dirname)/../../..)
    set -l out (bun $repo/tools/claude-sessions/claude-sessions.ts --print)
    or return $status                      # 非 git / 依存不足は CLI 側がメッセージを出して非0終了
    test (count $out) -lt 2; and return    # Esc キャンセル時は出力なし
    cd $out[1]; and claude --resume $out[2]
end
