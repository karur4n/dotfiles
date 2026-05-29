# claude-sessions のシェル統合（fish オートロード）。
# 内容は `claude-sessions --init fish` の出力と同一。bash/zsh は eval "$(claude-sessions --init bash)" を使う。
# 起動コストと conf.d ロード順（mise より前に走る問題）を避けるため、source ではなくオートロードで定義する。
function cs --description 'Pick a Claude session (current repo + worktrees) and resume it, cd-ing into its dir'
    set -l out (command claude-sessions --print)
    or return $status
    test (count $out) -lt 2; and return
    cd $out[1]; and claude --resume $out[2]
end
