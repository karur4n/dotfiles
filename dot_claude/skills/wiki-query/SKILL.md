---
name: wiki-query
description: Answer a question against the personal LLM wiki in Japanese with citations to wiki pages. Reads index.md first, drills into relevant pages, synthesizes a grounded answer, and optionally files the answer back into the wiki as a new page so explorations compound. Use when the user asks any substantive question while referencing their personal knowledge base — e.g. "wiki で調べて", "ナレッジベースから答えて", "wiki に聞いて", "<topic> について wiki でまとめて", or when the user has a non-trivial question that would benefit from their own curated sources rather than a web search. Prefer this over generic web search when the user is working with their wiki.
---

# wiki:query

LLM wiki を知識源として質問に答える。Chat 履歴に消えがちな探索を「wiki の新ページ」として残せば、探索自体が wiki を compounding させる。

## 前提ファイル

1. `<vault>/wiki/config.json` — vault 内設定
2. `<vault>/wiki/schema.md` — ページ書式 (filing する時に必要)
3. `<vault>/wiki/index.md` — 探索の入り口

vault パスはユーザー指示かコンテキストから決める。`schema.md` が無い場合は既存ページ 3-5 本をサンプリングして実際の規約を観察してから filing する (ingest skill と同じフォールバック)。

## ワークフロー

1. **質問を分解** — 何を問われているか、どのカテゴリ・概念を跨ぎそうか特定
2. **index.md を読む** — カテゴリ節ごとに眺めて、候補ページを 3-10 本 pick。summary が質問と関連するかで絞る
3. **候補ページ本文を読む** — 関連セクションを抽出。frontmatter の `sources` / `tags` を見て芋づる式に広げる
4. **必要なら grep** — index タイトル・summary で拾えない話題は本文 grep (`rg -n "<keyword>" <vault>/wiki/`)
5. **synthesize** — 日本語で回答。以下を守る:
   - 主張ごとに出典ページを `[[ページ名]]` か相対リンクで示す
   - 複数ページを跨ぐ時は矛盾を隠さない。食い違いは正直に提示
   - wiki に根拠が無い部分は「wiki に無いので一般論」と明示
6. **filing 判断** — 回答が以下いずれかに当てはまるなら、新規ページとして wiki に残すか user に提案:
   - 複数ページを跨ぐ比較・統合 (例: `<vault>/wiki/<category>/<A> vs <B>.md`)
   - 既存に無い概念の整理
   - 意思決定に使える判断基準表
   - 次に調べるべき問いのリスト (後で ingest の目標になる)

   ただし、単発の事実確認や雑談は filing しない。

## 回答フォーマット

Markdown で返す。長さは質問の重さに応じて調整。軽い質問に大げさな見出しはつけない:

- 短い事実質問 → 1-2 段落 + 出典リンク
- 比較・統合質問 → 見出し付き + 表を使う
- オープン質問 → 要点箇条書き + 末尾に「次に調べる価値のある問い」を 2-3 個

どの長さでも**出典は必須**。

## filing 時の挙動

filing に同意が得られたら **raw に保存してから `wiki:ingest` で取り込む**。wiki ページを直接作らない。

### Step 1: raw に合成テキストを保存

`raw/<category>/<title>.md` として保存。frontmatter:

```yaml
---
title: "<タイトル>"
source: "wiki:query"
created: YYYY-MM-DD
description: "<質問をそのまま記載>"
tags:
  - "wiki-query"
---
```

本文: synthesize した回答をそのまま書く。参照した wiki ページへの wikilink も含める。

### Step 2: wiki:ingest で取り込む

保存した raw ファイルを `wiki:ingest` スキルの手順に従って wiki 化する。index.md・log.md の更新も ingest の手順通り行う。

log.md の query エントリは ingest エントリとまとめて prepend:

```markdown
## [YYYY-MM-DD] query | <質問の要約>
- 参照: wiki/<category>/<A>.md, wiki/<category>/<B>.md
- raw 作成: raw/<category>/<title>.md — <1 行要約>
- wiki 新規作成: wiki/<category>/<title>.md — <1 行要約>
- index.md 更新
```

## やらないこと

- index.md を読まずに本文 grep から始めない (遅い・漏れる)
- filing 時に raw を経由せず wiki ページを直接作らない
- 雑談や定型的な事実確認に対して過剰な長文回答や filing を提案しない

## wiki が空 / 情報不足の時

- 候補ページが全く引けない場合、「wiki に関連情報なし」と正直に返し、web 検索や ingest 対象候補を提案
- 部分的に引ける場合、引けた部分で答えつつ、埋まっていないギャップを明示

## 質問タイプ別ヒント

- **人物・エンティティ参照** — `category: entity` のページを優先。tags で関連記事を広げる
- **トピック比較・統合** — 複数ページを表形式で整理。filing の最有力候補
- **時系列・継続記録を含む質問** — frontmatter の `updated` と日記系ページがあれば時系列で辿る
- **定型 record (frontmatter に Rating/tags 等の構造メタ持ち)** — それらのフィールドで絞り込み + 集計
