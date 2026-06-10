---
name: wiki-lint
description: Health-check the personal LLM wiki for contradictions, stale claims, orphan pages, missing cross-references, concepts that deserve their own page, and gaps worth filling with future ingests. Produces a prioritized remediation report in Japanese and optionally applies fixes for low-risk items. Use when the user says "wiki lint", "wiki 健康診断", "wiki を点検", "wiki の整合性チェック", or on a periodic basis (e.g. weekly) to keep the knowledge base from decaying. Always check this before claiming the wiki is in good shape.
---

# wiki:lint

wiki 全体を俯瞰してヘルスチェックを走らせ、治すべき箇所を優先度付きで返す。人間が気づきにくい bookkeeping の歪みを LLM が検出するのがこのスキルの役割。

## 前提ファイル

1. `<vault>/llm-wiki/wiki/config.json` — vault 内設定
2. `<vault>/llm-wiki/wiki/schema.md` — 規約準拠判定の基準
3. `<vault>/llm-wiki/wiki/index.md`, `<vault>/llm-wiki/wiki/log.md`
4. `<vault>/llm-wiki/wiki/<category>/*.md` — 必要に応じて全読み

vault パスはユーザー指示かコンテキストから決める。

## 検査項目

優先度付きで以下を走査する。各項目に **該当ページ一覧 + 修正案 + 優先度 (high/med/low)** を付ける。

### 1. 規約違反 (high)

- frontmatter 必須キー欠落 (`title`, `category`, `sources`, `created`, `updated`, `summary`)
- `updated` が `created` より古い
- frontmatter の `summary` と `index.md` の entry summary 不一致 (ingest 時に同期すべきもの)
- ファイル名と frontmatter の `title` 不一致
- `sources` の wikilink 先の raw ファイルが存在しない
- `category` の値が schema 規約 (`wiki-<ディレクトリ名>`) と不一致 — ただし自動修正はしない (既存運用との断絶リスクがあるため提案のみ)
- frontmatter 系統の混在 (例: 一部ページが `type: wiki-article` 系、他が `title+category+...` 系) — 実態として報告。正規化は user 判断
- `summary` 本文が空 / `,` だけ / コード片 / 壊れた文字列

### 2. 矛盾 (high)

- 同トピックを扱う複数ページで事実関係が食い違っている
- 新しい ingest が古いページの主張を訂正せずに併存している
- 数値・日付などの具体情報で矛盾

検出は tag / summary ベースで関連ページを集めた後、同テーマに見えるページ間で断定文を比較する。不確実な場合は「要確認」としてフラグのみ。

### 3. 陳腐化 (med)

- `updated` が 3 ヶ月以上前で、かつ同テーマの raw が最近追加されている
- 「予定」「TBD」「検討中」などの仮メモが残っている
- リンク切れ: `[[...]]` の参照先が index.md に無い

### 4. 孤立ページ (med)

- 他ページから 1 本も参照されていない wiki ページ (raw からの sources を除く)
- index.md に未登録
- tags が 1 つも付いていない

孤立が悪いわけではない (独立したトピックはあり得る) ので、修正案は「cross-ref 追加の検討」にとどめる。

### 5. 欠けている概念 (med)

- 複数ページで繰り返し言及されるのに独自ページが存在しない用語
- 本文で太字 / 引用符で強調されているのに説明が外部参照しか無い概念
- `[[名前]]` wikilink で参照されているのにページ実体が無いもの (リンク切れかつ頻出)

tag / 固有名詞 / 頻出ワードの観点で検出。修正案は **具体的な ingest 候補** として提示する:
- 候補ページ名 (どのカテゴリに置くか)
- 推奨ソース種別 (公式ドキュメント / 論文 / Web 記事 / 自分のメモ)
- 該当する既存ページでどう cross-ref を張るべきか

lint の主な価値の一つは「次に何を ingest すべきかの提案」。

### 6. クロスリファレンス漏れ (low)

- ページ A が B の内容に触れているのに `[[B]]` が無い
- See Also セクションが無い (ページによっては不要なので断定せず提案)

### 7. ギャップ (low)

- log.md を眺めて最近の ingest カテゴリが偏っていないか (例: 健康カテゴリが半年更新なし)
- index.md の特定カテゴリのエントリ数が極端に少ない
- ユーザーが定義した「興味トピック」(config.json 拡張で将来追加) で埋まっていない領域

## 走査戦略

毎回全ページ読むと重い。以下の段階で絞る:

1. **軽い走査 (default)** — index.md + log.md + 各カテゴリ先頭 N 件の frontmatter のみ。10-30 分想定
2. **深い走査 (オプション)** — user が指定したカテゴリの全ページ本文まで読む。1 時間想定
3. **特定テーマのみ** — `wiki:lint "<カテゴリ名>"` のようにスコープ指定

どの戦略で走らせるか実行前にユーザーに聞く。

## 出力

Markdown レポートを返す。レポートファイルは作らず、チャット内に出す (長ければユーザーに保存希望を聞く)。

```markdown
# wiki lint 結果 (YYYY-MM-DD)

走査範囲: <全体 | カテゴリ> / <軽い走査 | 深い走査>
ページ数: <N>

## High

### 規約違反
- llm-wiki/wiki/<path>.md — <違反内容> — 修正案: <提案>

### 矛盾
- llm-wiki/wiki/<A>.md vs llm-wiki/wiki/<B>.md — <矛盾点> — 修正案: <提案>

## Med

### 陳腐化
...

### 孤立
...

### 欠けている概念
...

## Low
...

## 次のアクション候補

- ingest 候補: <テーマ>
- 修正を自動適用して良いもの: <list>
```

## 自動修正

low リスクのもの (例: ファイル名と title の軽い齟齬、index.md の Updated 日付ずれ) は user 承認後に一括修正可。high / med は必ず確認を挟む。修正したら log.md に append:

```markdown

## [YYYY-MM-DD] lint | <概要>
- 走査範囲: <scope>
- 検出: high <N>, med <M>, low <L>
- 自動修正: <list>
```

## やらないこと

- 勝手に wiki ページを大量書き換えしない (lint は診断 + 提案が主業)
- 不確実な矛盾を断定しない (「要確認」で返す)
- ユーザーの興味と無関係な低優先度の指摘で報告を水増ししない
