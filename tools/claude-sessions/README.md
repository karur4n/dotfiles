# claude-sessions

カレント git リポジトリと、その全 worktree に紐づく Claude Code セッションを
fzf で一覧・選択し、選んだセッションを `claude --resume` で再開する CLI。

## 前提

- [Bun](https://bun.sh)
- [fzf](https://github.com/junegunn/fzf)（`brew install fzf`）
- `claude` CLI が PATH にあること

## 使い方

git リポジトリ内で実行する:

```sh
bun /path/to/tools/claude-sessions/claude-sessions.ts
```

PATH に通すには、任意の bin ディレクトリへシンボリックリンクを張る（この dotfiles では
chezmoi が `~/.local/bin/claude-sessions` を自動で張る）:

```sh
ln -s "$PWD/tools/claude-sessions/claude-sessions.ts" ~/.local/bin/claude-sessions
```

- 新しい順に並ぶ。fuzzy 検索で絞り込める。
- Enter で選択 → そのセッションの cwd（無ければ worktree ルート）で resume。Esc で何もせず終了。

各行の表示: `ブランチ  相対更新時刻  メッセージ数  短縮sessionId  ラベル`
ラベルは AI 生成タイトル（`ai-title`）。無いセッションは最終ユーザープロンプトを表示。

## シェル統合（cd してから resume）

CLI 単体実行だと、resume 後に元のディレクトリへ戻る（子プロセスは親シェルの cwd を
変更できないため）。シェル自身を worktree へ `cd` させ続けるには、git-wt と同じく
`--init` が出力するラッパー関数 `cs` を使う。`cs` は `claude-sessions --print` を呼ぶ
（`--print` は `claude` を起動せず cd 先ディレクトリと sessionId を stdout に2行で出力。
fzf の UI は tty/stderr に描画されるので stdout を受けても問題ない）。

```sh
claude-sessions --init <bash|zsh|fish>   # ラッパー関数 cs を出力
```

bash / zsh:

```sh
eval "$(claude-sessions --init bash)"    # ~/.bashrc / ~/.zshrc に追記
```

fish: この dotfiles ではオートロード関数 `configs/fish/functions/cs.fish` として設置済み
（内容は `claude-sessions --init fish` と同一）。手動なら次のどちらか:

```fish
claude-sessions --init fish > ~/.config/fish/functions/cs.fish   # オートロード（推奨・起動コスト0）
# または config.fish 等で:  claude-sessions --init fish | source
```

これで `cs` 実行 → 一覧から選ぶ → 選んだセッションの cwd に cd した状態で resume し、
Claude を抜けてもそのディレクトリに留まる。

## 仕組み

`~/.claude/projects/*/*.jsonl` を走査し、各ファイルの先頭行に記録された実 `cwd` を
`git worktree list` のパス集合に前方一致で突き合わせて、本リポジトリの worktree に
属するセッションだけを抽出する（ディレクトリ名の不可逆エンコードには依存しない）。
セッションの `cwd` が worktree のサブディレクトリ（例: モノレポの各パッケージ）でも
正しくその worktree に対応付ける。

パフォーマンスのため、更新時刻はファイルの mtime、ブランチ/cwd は先頭 64KB、
最終プロンプトは末尾 256KB のみを読む。worktree に属さないセッションは先頭行の
判定時点で早期に除外する。

## テスト

```sh
cd tools/claude-sessions && bun test
```

純粋関数（パース・マッチング・整形）とセッション収集 I/O を対象にした単体・結合
テストが入っている。git / fzf / claude を呼ぶ外殻は手動検証。
