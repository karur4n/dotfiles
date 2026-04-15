---
name: wiki:ingest
description: Ingest a raw source (markdown, PDF, or image) into the personal LLM wiki. Reads the source, extracts key information in Japanese, creates or updates relevant wiki pages with cross-references, and appends an entry to log.md while refreshing index.md. Use whenever the user drops a new raw file in the vault and says "これを wiki に取り込んで", "ingest this", "wiki に追加", "読み込んで wiki 更新", or references a file under raw/ that should be summarized into the wiki. Always consult schema.md for conventions before editing — never guess the frontmatter or index format.
---

# wiki:ingest

生ソース 1 本を wiki に取り込む。LLM が bookkeeping (要約・相互参照・index/log 更新) を全部引き受け、人間はソース供給と方針指示に専念できる状態にする。

## 前提ファイル

実行前に必ず読む:

1. `<vault>/wiki/config.json` — vault 内設定 (wiki_dir/raw_dir/language)
2. `<vault>/wiki/schema.md` — frontmatter / index / log の規約
3. `<vault>/wiki/index.md` — 既存ページ一覧 (重複判定・cross-ref 候補抽出)

vault パスはユーザー指示かコンテキスト (CLAUDE.md / cwd / 直近の会話) から決める。config に vault パスは書いていない (config 自身が vault 内にあるため)。

カテゴリ一覧は `ls <vault>/wiki/` で取る。config には載せない (wiki の subdir が single source of truth)。新しいカテゴリが必要ならユーザー確認のうえ `wiki/<new-category>/` を新規作成する。

未整備なら `wiki:bootstrap` を先に動かすようユーザーに案内する。

## 入力

ユーザーが指す raw ファイルのパス。次のいずれか:

- **markdown** (`raw/<category>/*.md`): 全文読む
- **PDF** (`raw/assets/*.pdf`): `Read` ツールでページを指定して読む。10 ページ超えるなら範囲分割
- **画像** (`raw/assets/*.png|.jpg|.gif|.webp`): Read で可視化。OCR はしない前提 (見て分かる情報だけ拾う)。画像は wiki 本文に `![[raw/assets/<file>.png]]` で埋め込み、frontmatter `sources` にも同 wikilink を追加
- **複数ファイル**: ソースとしてまとめて 1 ページ化するか、別々に 1 ページずつ作るかユーザーに聞く。認識論的グルーピングを意識する (同じ問いに同じ答えが収束するソース群 → 統合、異質なものは分離)

**画像・PDF のハルシネーション回避**: Read で読み取った内容だけを本文に書く。チャートの軸が一般理論と反対を向いている等、直感に反する内容があっても勝手に「訂正」しない。そのまま言語化し、必要なら「本ソースによれば」と明示する。

## ワークフロー

1. **ソースを読む** — 要点をメモ。どのカテゴリに属するか、既存ページのどれと関連するか、矛盾する既存記述があるか
2. **関連ページ探索** — `index.md` を走査。類似タイトル・同トピックの既存ページを洗い出す。grep で本文を引いて cross-ref 候補を増やす
3. **ユーザーと擦り合わせ** — 以下を短く提示して方針確認:
   - カテゴリ (既存カテゴリから選ぶか新設)
   - 新規ページ作成 or 既存ページ更新 (どれを更新するか)
   - 強調したい論点 (ユーザーの関心に合わせる)
   - 矛盾する既存記述があれば扱いを聞く (上書き / 新旧併記 / 注記付き)
4. **ページ編集**
   - 新規: `<vault>/wiki/<category>/<title>.md` を schema の frontmatter 規約で作る
   - 更新: 既存ページの該当セクションに追記。`updated:` を当日に更新。`sources:` に新しい raw を追加
   - 相互参照: ソースで言及される概念が既存ページにあれば本文に `[[Page]]` を埋める。逆方向 (既存ページから新ページへの See Also) も忘れず挿入
5. **index.md 更新** — 新規ページならカテゴリ節に追記。既存更新なら `Updated:` 日付を差し替え、summary が変わっていれば同期
6. **log.md に prepend** — ファイル先頭 (`# Wiki Log` 見出しの直下、他エントリの前) に挿入:

```markdown
## [YYYY-MM-DD] ingest | <タイトル>
- raw 追加: <relative path>
- wiki 新規作成: <path> — <1 行要約>
- wiki 更新: <path> — <変更点>
- index.md 更新
```

新しいものが常に上に来るので、vault 開いたとき最新履歴がすぐ読める。この順序は schema.md で明示されている規約に従う (vault により prepend / append が違う場合は schema に従う)。

7. **ユーザーに報告** — 触ったファイル一覧と要点を 5 行以内で伝える

## iCloud vault の NFD/NFC 混在に注意

iCloud 同期の Obsidian vault では、macOS HFS+/APFS の NFD 正規化が原因で:

- ファイル名・ディレクトリ名・index.md のリンクエントリは **NFD**
- frontmatter / ファイル本文は **NFC**

が混在する。Edit tool で index.md を更新する時に NFC 入力が NFD 既存文字列にマッチせず失敗することがある。失敗した場合は Python で正規化を揃えて書き戻す:

```python
import unicodedata
nfd_str = unicodedata.normalize('NFD', '<日本語文字列>')
```

frontmatter 本体の編集ではこの問題は起きない (NFC で一貫しているため)。

## schema.md が無い vault でのフォールバック

`<vault>/wiki/schema.md` が存在しない場合 (bootstrap 未実行、または vault がもともと手運用):

1. 既存ページを 3-5 本サンプリング (異なるカテゴリから)。frontmatter の実際のキーセットを観察
2. index.md と log.md のエントリ書式を観察 (並び順が prepend か append か、ここで判定)
3. 観察結果に沿って新規ページを書く (idealな schema を強制しない)
4. ingest 完了後にユーザーに「schema.md が無いので wiki:bootstrap を推奨」と 1 行で案内 (強制はしない)

## frontmatter 書式 (schema.md から再掲)

```yaml
---
title: ページ名
category: wiki-<ディレクトリ名>   # wiki/<ディレクトリ名>/ 配下のページ
sources:
  - "[[raw/<category>/<filename>]]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - <tag>
summary: 1-2 文でページの核を説明
---
```

- `category` は schema.md の規約 (新規は `wiki-<ディレクトリ名>`) に従う。既存ページの `category` 値がこれと違っても強制正規化しない
- `created` は新規時のみ設定。更新時は触らず `updated` のみ差し替える
- `summary` を変更したら index.md のエントリ summary も同じ文字列に同期すること (ズレを作らない)

## 相互参照のコツ

単に新ページを作るだけでは wiki は死ぬ。ingest 1 本で以下全部をやって初めて「compounding」する:

- 新ページ本文内で、既存の関連トピックに `[[link]]` を張る
- 関連既存ページの本文に「See Also: [[新ページ]]」か、より自然なら本文中にリンクを埋め込む (更新内容は log に記録)
- tags で概念横断的に拾えるようにする

「関連ページが無いから張らなくていい」は危険信号。それは探索不足の可能性が高い。`index.md` 以外に本文 grep もすること。

## 矛盾検出

新ソースが既存ページの記述と食い違う場合:

- 事実が古い: 新ソースで上書きしつつ、本文に `> 以前は X とされていたが、YYYY-MM-DD の <source> で Y に更新` と注記
- 見解が異なる: 両論併記。どちらが正しいかを勝手に決めない
- どう扱うか判断に迷うならユーザーに聞く

## やらないこと

- raw/ 下のファイルは一切改変しない (immutable)
- ユーザーが読んでいないのに勝手に 10 個のソースを一気に取り込まない
- 既存 wiki ページを full rewrite しない (差分追記に留める)。大きく書き換える必要があるならユーザーに提案してから

## 報告テンプレ

取り込み完了時、以下の形式で短く返す:

```
取り込み完了: <ソース名>

- 新規: wiki/<category>/<title>.md
- 更新: wiki/<category>/<other>.md (cross-ref 追加)
- index.md, log.md 更新

ポイント:
- <1 行目>
- <2 行目>
```
