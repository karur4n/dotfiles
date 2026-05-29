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

PATH に通すには、任意の bin ディレクトリへシンボリックリンクを張る:

```sh
ln -s "$PWD/tools/claude-sessions/claude-sessions.ts" ~/.local/bin/claude-sessions
```

- 新しい順に並ぶ。右ペインに最終プロンプト全文などのプレビューが出る。
- Enter で選択 → そのセッションの worktree で resume。Esc で何もせず終了。

各行の表示: `ブランチ  相対更新時刻  メッセージ数  短縮sessionId  最終ユーザープロンプト`

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
