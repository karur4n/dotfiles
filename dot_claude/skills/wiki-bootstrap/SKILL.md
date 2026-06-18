---
name: wiki-bootstrap
description: Initialize a personal LLM wiki for an Obsidian vault. Creates <vault>/llm-wiki/wiki/config.json and <vault>/llm-wiki/wiki/schema.md (both inside the vault — no external pointers). Use when the user mentions "wiki bootstrap", "wiki 初期化", "wiki セットアップ", "personal wiki を始めたい", or when the user asks to start a new personal knowledge base maintained by Claude. Always run this before wiki:ingest/query/lint if the config or schema does not exist yet — the other skills depend on it.
---

# wiki:bootstrap

ユーザーの Obsidian vault に対して「LLM が運用するパーソナル wiki」を初期化する。実体は2つのファイルを作ること:

1. `<vault>/llm-wiki/wiki/config.json` — vault 内設定 (vault 自身が SSOT、外部にパスを持たない)
2. `<vault>/llm-wiki/wiki/schema.md` — wiki 運用規約 (frontmatter / cross-ref / index / log 等)

config を vault 内に置く理由: vault そのものが実体なので、外部 (`~/my-wiki/` 等) にポインタを置かない。vault を別マシンに移しても設定が追従する。

他の wiki skill (`wiki:ingest`, `wiki:query`, `wiki:lint`) はこの2ファイルを前提に動く。

## 実行前の確認

1. **vault パス** — 既存 Obsidian vault を再利用するか、新規作成か聞く。iCloud パスは長いので絶対パスで受け取る。
2. **`llm-wiki/wiki/` サブディレクトリ** — vault 内 `llm-wiki/wiki/` 直下を wiki ルートとする。既存 `llm-wiki/wiki/` があれば規約をそこから読み取り、schema.md に逆輸入する (破壊禁止)。
3. **初期カテゴリ** — `llm-wiki/raw/` のトップレベルディレクトリ名を初期カテゴリ候補として提示。ユーザーが採用を選んだら `<vault>/llm-wiki/wiki/<category>/` を空ディレクトリで作る (`.gitkeep` 置いて ok)。bootstrap 後は wiki 下の subdir がカテゴリの実体なので、以降 config に記録は不要。

## config.json

`<vault>/llm-wiki/wiki/config.json` に書く:

```json
{
  "wiki_dir": "llm-wiki/wiki",
  "raw_dir": "llm-wiki/raw",
  "language": "ja"
}
```

- **vault パスは config に書かない**。config そのものが vault 内にあるので、config ファイルの位置から vault ルートを 2 階層上に辿れば決まる
- カテゴリも config に書かない。`<vault>/<wiki_dir>/` 直下のサブディレクトリ名がカテゴリの single source of truth
- 他 skill は `<vault>/llm-wiki/wiki/config.json` を読み、`ls <vault>/<wiki_dir>/` で現在のカテゴリ一覧を取得する

## schema.md

`<vault>/llm-wiki/wiki/schema.md` を生成する。これは wiki 運用規約を LLM 自身が読み返すための設計書。既存 vault に規約があるなら踏襲、無ければ以下のデフォルトを書き込む:

### Frontmatter

全 wiki ページに以下を付ける (欠落不可):

```yaml
---
title: ページ名
category: wiki-<ディレクトリ名>   # llm-wiki/wiki/<ディレクトリ名>/ 配下のページ
sources:
  - "[[llm-wiki/raw/<category>/<filename>]]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - <tag>
summary: 1-2 文でページの核を説明 (index.md に転載される)
---
```

- `category` の値は `wiki-<ディレクトリ名>` で統一。Obsidian Bases で `category.contains("<ディレクトリ名>")` のように filter できる
- `sources` は raw ファイルへの Obsidian wikilink。複数 ok
- `summary` は index.md で表示されるので、検索で引きたくなるワードを含める。本文・index・frontmatter の 3 箇所で同じ文字列を保つ (ingest/lint で同期を維持)
- `tags` はカテゴリ横断で追跡したい概念に付ける (例: `software-dev`, `health`)

### 既存ページの揺れを尊重

既存 vault では frontmatter が複数系統混在することがある (例: `title+category+sources+...` 系と `type: wiki-article + generated` 系)、`category` 値も `topic` 等の汎用値と日本語カテゴリ名の直入れが揺れていることがある。

- **新規ページは `wiki-<ディレクトリ名>` 統一規約で作る**
- **既存ページは強制正規化しない** — 運用の断絶リスクがあるため、lint で検出・提案にとどめ、修正するかはユーザー判断
- schema.md には「観察された揺れ」もそのまま記録する (推測で綺麗に揃えて書かない)

### 本文構造

- 1 行目: `# タイトル` (frontmatter の title と一致)
- 先頭に `## 概要` か `## Overview` を置き、2-4 段落でページ全体を俯瞰
- 2 階層目以降は自由
- クロスリファレンスは `[[ページ名]]` の Obsidian wikilink 形式でインラインに埋める
- 画像は `<vault>/llm-wiki/raw/assets/` を参照

### index.md

`<vault>/llm-wiki/wiki/index.md` はカテゴリ別の目次。以下の形式:

```markdown
---
name: wiki-index
generated: YYYY-MM-DD
---

# Knowledge Base Index

## <カテゴリ>

- [ページ名](<カテゴリ>/ページ名.md) — <summary> — Updated: YYYY-MM-DD
```

- 各 ingest/query/lint の後で必ず更新
- summary は frontmatter から転載 (同期ズレを避ける)
- Updated は frontmatter の `updated` を使う

### log.md

`<vault>/llm-wiki/wiki/log.md` は append-only の時系列記録。形式:

```markdown
## [YYYY-MM-DD] <operation> | <タイトル>
- raw 追加: <path>
- wiki 新規作成: <path> — <要約>
- wiki 更新: <path> — <変更内容>
- index.md 更新
```

- `<operation>` は小文字英単語 1 語。代表は `ingest` / `query` / `lint` / `bootstrap` で、保守作業は実態に合う動詞でよい (`migrate` / `rename` / `refactor` / `update` 等)
- 守るべきは書式 `## [YYYY-MM-DD] <op> | <タイトル>`。これで `grep "^## \[" log.md | head -5` で最近の履歴を取れる
- **新しい項目はファイル先頭に prepend** (# Wiki Log 見出しの直下、他エントリの前に挿入)。新しいものが常に上に来る。過去履歴を逆時系列で一覧できる

### ディレクトリ規約

```
<vault>/
└── llm-wiki/
    ├── raw/                  # 生ソース (immutable, 人間が追加)
    │   ├── <category>/       # カテゴリ別の markdown raw
    │   └── assets/           # 画像・PDF・その他添付 (カテゴリ跨ぎで共有)
    └── wiki/                 # LLM 生成ページ (skill が編集)
        ├── schema.md         # 本ファイル
        ├── index.md
        ├── log.md
        └── <category>/       # カテゴリ別ページ
```

- カテゴリ名は llm-wiki/raw・llm-wiki/wiki 間で一致させる
- wiki のファイル名は `<title>.md` (日本語可)
- **`llm-wiki/raw/assets/` の用途**: 画像 (png/jpg/gif/webp)、PDF、その他バイナリ添付。カテゴリ跨ぎで参照されるものなのでフラットに置く
- wiki ページから assets を参照する時は wikilink `[[llm-wiki/raw/assets/<file>]]` (画像なら `![[llm-wiki/raw/assets/<file>.png]]` で埋め込み)
- Obsidian 側の添付パス設定 (`Settings → Files and links → Attachment folder path`) を `llm-wiki/raw/assets` にしておくと、Obsidian Web Clipper の画像ダウンロードもここに集まる

## bootstrap の手順

1. vault パスをユーザーから受け取る (絶対パス、iCloud 等の空白含みもOK)
2. `<vault>/llm-wiki/wiki/config.json` の既存有無を確認。あれば上書き可否を聞く
3. wiki_dir / raw_dir (既定値で十分) を決定
4. `llm-wiki/raw/` のトップレベル subdir から初期カテゴリ候補を提示、採用分を `<vault>/<wiki_dir>/<category>/` に空作成
5. `<vault>/llm-wiki/wiki/config.json` を書き込む
6. `<vault>/<wiki_dir>/schema.md` を生成 (既存規約があれば反映)
7. `llm-wiki/wiki/index.md` と `llm-wiki/wiki/log.md` が無ければ空のものを作成 (あれば触らない)
8. 完了したら何を作ったかとこの後のおすすめ操作 (`wiki:ingest` で最初のソースを取り込むなど) を伝える

## 既存 vault を取り込む場合の注意

サンプルページから実際の規約を抽出し、schema.md に反映する:

- frontmatter キーの実態 (`title/category/sources/created/updated/tags/summary` 以外のキー、2 系統混在の有無)
- `category` 値の揺れ (汎用値 / カテゴリ名の直入れ / `wiki-<dir>` 形式 等の混在)
- cross-ref の書き方 (wikilink `[[...]]` vs relative link `[...](path)`)
- `sources` の書き方 (`[[llm-wiki/raw/<file>]]` flat vs `[[llm-wiki/raw/<category>/<file>]]` 階層)
- index/log のエントリ書式、log の並び順 (prepend or append)

最低 3-5 ページ読んで規約を確かめ、観察した揺れもそのまま記録する (綺麗にまとめすぎない)。既存の .base ファイルがあれば中身も確認 (frontmatter 依存がわかる)。
