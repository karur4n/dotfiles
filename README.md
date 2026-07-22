# dotfiles

chezmoi の symlink モードで管理する dotfiles。ホームには実体をコピーせず、このリポジトリへの symlink を張る。

## 構成

- `dot_*` / `private_dot_*` — chezmoi が home に symlink するエントリ(`dot_claude` → `~/.claude` など)
- `configs/` — 設定の実体。chezmoi の管理対象外(`.chezmoiignore`)で、`private_dot_config/` 内の `symlink_*.tmpl` がここへの symlink を生成する(`~/.config/fish` → `configs/fish` など)
- `mise.toml` — このリポジトリで使うツール(bun, node など)

## セットアップ

```sh
brew install chezmoi ghq
ghq get karur4n/dotfiles
chezmoi init --source ~/ghq/github.com/karur4n/dotfiles --apply
```

`chezmoi apply` で home への symlink が揃う。以後の設定変更はこのリポジトリのファイルを直接編集すればそのまま反映される。

## マシンごとに1回必要な作業

chezmoi の外で登録が必要なもの。

- Hammerspoon: `ln -s ~/ghq/github.com/karur4n/dotfiles/configs/hammerspoon ~/.hammerspoon`
- herdr plugin: [configs/herdr/plugins/claude-branch/README.md](configs/herdr/plugins/claude-branch/README.md) の手順で integration install と plugin link を行う
