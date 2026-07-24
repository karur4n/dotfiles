---
name: wiki-ingest
description: Ingest a raw source (markdown, PDF, or image) into the personal LLM wiki. Reads the source, extracts key information in Japanese, creates or updates relevant wiki pages with cross-references, and appends an entry to log.md while refreshing index.md. Use whenever the user drops a new raw file in the vault and says "これを wiki に取り込んで", "ingest this", "wiki に追加", "読み込んで wiki 更新", or references a file under llm-wiki/raw/ that should be summarized into the wiki. Also use when the user gives a web URL or article to add to the wiki, or asks to 調査して wiki に取り込んで — the source is fetched into raw/ first. Always consult schema.md for conventions before editing — never guess the frontmatter or index format.
---

# wiki:ingest

生ソース 1 本を wiki に取り込む。LLM が bookkeeping (要約・相互参照・index/log 更新) を全部引き受け、人間はソース供給と方針指示に専念できる状態にする。

## 前提ファイル

実行前に必ず読む:

1. `<vault>/llm-wiki/wiki/config.json` — vault 内設定 (wiki_dir/raw_dir/language)
2. `<vault>/llm-wiki/wiki/schema.md` — frontmatter / index / log の規約
3. `<vault>/llm-wiki/wiki/index.md` — 既存ページ一覧 (重複判定・cross-ref 候補抽出)

vault パスはユーザー指示かコンテキスト (CLAUDE.md / cwd / 直近の会話) から決める。config に vault パスは書いていない (config 自身が vault 内にあるため)。

カテゴリ一覧は `ls <vault>/llm-wiki/wiki/` で取る。config には載せない (wiki の subdir が single source of truth)。新しいカテゴリが必要ならユーザー確認のうえ `llm-wiki/wiki/<new-category>/` を新規作成する。

未整備なら `wiki:bootstrap` を先に動かすようユーザーに案内する。

### raw_layout: nested / flat

config の `raw_layout` フィールドで raw の物理配置が決まる（未設定なら `nested` 扱い）。

- **`nested`** (既定): raw はカテゴリ別サブフォルダに置く。`<raw_dir>/<category>/<filename>`。分類は物理パスが single source of truth
- **`flat`**: raw はサブフォルダを持たず `<raw_dir>/<filename>` に直置き。分類は各ファイルの frontmatter `raw_source: <category>` が single source of truth。inbox (未分類) も物理フォルダではなく `raw_source: inbox` で表す

以降の手順は raw_layout で分岐する。パス例は `nested` を基準に書いているので、`flat` の vault では `<raw_dir>/<category>/<filename>` を `<raw_dir>/<filename>`（+ frontmatter `raw_source: <category>`）に読み替える。

## 入力

ユーザーが指す raw ファイルのパス。次のいずれか:

- **markdown** (`llm-wiki/raw/<category>/*.md`、flat なら `llm-wiki/raw/*.md`): 全文読む
- **PDF** (`llm-wiki/raw/assets/*.pdf`): `Read` ツールでページを指定して読む。10 ページ超えるなら範囲分割
- **画像** (`llm-wiki/raw/assets/*.png|.jpg|.gif|.webp`): Read で可視化。OCR はしない前提 (見て分かる情報だけ拾う)。画像は wiki 本文に `![[llm-wiki/raw/assets/<file>.png]]` で埋め込み、frontmatter `sources` にも同 wikilink を追加
- **web URL / 「調査して取り込んで」依頼**: raw ファイルが未存在の場合、**最初に primary source を取得して raw に保存**（1 URL = 1 raw）。nested: `defuddle parse <URL> --md -o llm-wiki/raw/<category>/<YYYY-MM-DD>-<slug>.md`。flat: `defuddle parse <URL> --md -o llm-wiki/raw/<YYYY-MM-DD>-<slug>.md` で保存後、frontmatter に `raw_source: <category>` を追加。その後 raw を読んで通常ワークフローへ。LLM が web 検索結果を合成したレポートを raw に書いてはいけない（primary source 性が失われ、wiki 本文の主張根拠を遡れなくなる）。raw → wiki の順序は例外なし
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
4. **raw のカテゴリ確定 (inbox の場合)**
   - **nested**: ソースが `llm-wiki/raw/inbox/` 配下にあるなら、確定したカテゴリの `llm-wiki/raw/<category>/` に移動する。Bash の `mv` を使い、同名ファイルが既にあれば衝突を避けるためユーザーに確認。画像など `llm-wiki/raw/inbox/Attachments/` 配下のアセットも一緒に参照しているなら、対応するカテゴリの `llm-wiki/raw/<category>/assets/` (無ければ作る) に移動する。この移動を **ページ編集より先に行う** ことで、wiki 側の `sources:` wikilink と本文の `![[]]` 埋め込みが最初から最終パスを指す。inbox 以外 (既にカテゴリ確定済みの場所にある raw) は触らない
   - **flat**: ファイルは動かさない。frontmatter の `raw_source:` を `inbox` から確定カテゴリ名に書き換えるだけ（Edit ツールで該当行のみ差し替え）。`raw_source:` が既に inbox 以外の値なら (カテゴリ確定済み) 触らない
5. **ページ編集**
   - 新規: `<vault>/llm-wiki/wiki/<category>/<title>.md` を schema の frontmatter 規約で作る
   - 更新: 既存ページの該当セクションに追記。`updated:` を当日に更新。`sources:` に新しい raw を追加
   - 相互参照: ソースで言及される概念が既存ページにあれば本文に `[[Page]]` を埋める。逆方向 (既存ページから新ページへの See Also) も忘れず挿入
6. **index.md 更新** — 新規ページならカテゴリ節に追記。既存更新なら `Updated:` 日付を差し替え、summary が変わっていれば同期
7. **log.md に prepend** — ファイル先頭 (`# Wiki Log` 見出しの直下、他エントリの前) に挿入:

```markdown
## [YYYY-MM-DD] ingest | <タイトル>
- raw 追加: <relative path>   ← nested で inbox から移動した場合は移動先パスを記載。flat で raw_source を確定した場合は確定後の値も併記
- wiki 新規作成: <path> — <1 行要約>
- wiki 更新: <path> — <変更点>
- index.md 更新
```

新しいものが常に上に来るので、vault 開いたとき最新履歴がすぐ読める。この順序は schema.md で明示されている規約に従う (vault により prepend / append が違う場合は schema に従う)。

8. **ユーザーに報告** — 触ったファイル一覧と要点を 5 行以内で伝える。nested で inbox から移動した場合は移動元/移動先を、flat で raw_source を確定した場合はその値を 1 行添える

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

`<vault>/llm-wiki/wiki/schema.md` が存在しない場合 (bootstrap 未実行、または vault がもともと手運用):

1. 既存ページを 3-5 本サンプリング (異なるカテゴリから)。frontmatter の実際のキーセットを観察
2. index.md と log.md のエントリ書式を観察 (並び順が prepend か append か、ここで判定)
3. 観察結果に沿って新規ページを書く (idealな schema を強制しない)
4. ingest 完了後にユーザーに「schema.md が無いので wiki:bootstrap を推奨」と 1 行で案内 (強制はしない)

## frontmatter 書式 (schema.md から再掲)

```yaml
---
title: ページ名
category: wiki-<ディレクトリ名>   # llm-wiki/wiki/<ディレクトリ名>/ 配下のページ
sources:
  - "[[llm-wiki/raw/<category>/<filename>]]"   # flat なら "[[llm-wiki/raw/<filename>]]"
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

## 図式化のすすめ (Mermaid)

構造的な関係（フロー、エンティティ間の関連、状態遷移、時系列）が出てきたら、文章だけで詰めずに Mermaid 図を本文に埋め込む。Obsidian は Mermaid 標準対応で vault 内でそのまま描画されるため、ソース md に書けば閲覧側で追加設定不要。

埋め込み書式（コードフェンス）:

````markdown
```mermaid
flowchart LR
    A --> B
```
````

図種別の使い分け:

- **flowchart** — フロー・分岐・処理の流れ。最頻出。`LR` / `TD` を内容に合わせて選ぶ
- **erDiagram** — DB テーブル間の関係、エンティティ整理。属性・PK/FK/UK・カーディナリティを 1 枚に
- **sequenceDiagram** — サービス間/プロセス間のやりとり、API コールフロー
- **stateDiagram-v2** — ステートマシン、ライフサイクル（draft → review → published 等）
- **timeline** — リリース履歴、組織変遷など時系列ストーリー

書き方のコツ:

- 1 ページ **2-4 個まで**を目安。図は本文を補強する位置に置き、置き換えにしない
- ノードラベルに括弧 `()` や記号を含めるときは `"..."` でクオート（例: `A["foo (bar)"]`）。クオートしないとパースエラーで全体が描画されない
- 色分けは `classDef` で意味を持たせる（例: 成功パス＝緑、エラー＝赤、外部システム＝青）。装飾でなく分類軸として使う
- ラベルの `<br/>` で改行可
- 図の直後に **「読み方」「ポイント」を 1-2 行**で添える。図単独で理解できる図はそもそも貴重なので、文章補強を惜しまない

避けたいパターン:

- 中身が箇条書きで十分な内容を無理に図にする（情報密度が下がるだけ）
- 図 1 枚に詰め込みすぎる（5 ノード × 7 矢印を超えたら 2 枚に割る）
- Mermaid 記法外（PlantUML/Graphviz 等）を採用しない。Obsidian で描画されず可搬性が落ちる

## 矛盾検出

新ソースが既存ページの記述と食い違う場合:

- 事実が古い: 新ソースで上書きしつつ、本文に `> 以前は X とされていたが、YYYY-MM-DD の <source> で Y に更新` と注記
- 見解が異なる: 両論併記。どちらが正しいかを勝手に決めない
- どう扱うか判断に迷うならユーザーに聞く

## やらないこと

- llm-wiki/raw/ 下のファイル**内容**は一切改変しない (immutable)。ただし inbox 相当 (raw_source: inbox、または nested の `llm-wiki/raw/inbox/`) はカテゴリ未確定の staging area の扱いで、ingest 時にカテゴリが確定したら nested は `llm-wiki/raw/<category>/` へ **移動**、flat は frontmatter `raw_source:` を **書き換え** (どちらも本文は触らない)。inbox 以外の raw ファイルは移動も frontmatter 変更もしない
- ユーザーが読んでいないのに勝手に 10 個のソースを一気に取り込まない
- 既存 wiki ページを full rewrite しない (差分追記に留める)。大きく書き換える必要があるならユーザーに提案してから

## 報告テンプレ

取り込み完了時、以下の形式で短く返す:

```
取り込み完了: <ソース名>

- 新規: llm-wiki/wiki/<category>/<title>.md
- 更新: llm-wiki/wiki/<category>/<other>.md (cross-ref 追加)
- index.md, log.md 更新

ポイント:
- <1 行目>
- <2 行目>
```
