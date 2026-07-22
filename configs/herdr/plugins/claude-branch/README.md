# claude-branch

フォーカス中の pane で動いている Claude Code のセッションをフォークし、下に分割した新しい pane で起動する herdr plugin。元の会話はそのまま続けられる(Claude Code の `/branch` の herdr 版)。

## セットアップ

1. herdr の Claude Code integration を入れる(セッション ID を herdr に報告させるため。これがないと plugin がセッションを特定できない)

   ```sh
   herdr integration install claude
   ```

2. plugin をリンクする(登録先は `~/.config/herdr/plugins.json` のローカル状態なので、マシンごとに1回実行する)

   ```sh
   herdr plugin link ~/ghq/github.com/karur4n/dotfiles/configs/herdr/plugins/claude-branch
   ```

3. キーバインドは `configs/herdr/config.toml` に定義済み(`prefix+shift+b` → `herdr plugin action invoke claude.branch.split`)。chezmoi apply で反映される

## 使い方

Claude Code が動いている pane にフォーカスして `prefix+shift+b`。下に新しい pane が開き、フォークされた会話が始まる。フォーカスは元の pane に残る。

## 注意

- integration 導入前から起動している Claude Code はセッション ID が未報告のため「focused pane has no known claude session」の通知が出る。Claude Code を再起動するか `/clear` すると追跡される
- デバッグは `herdr plugin log list --plugin claude.branch`
