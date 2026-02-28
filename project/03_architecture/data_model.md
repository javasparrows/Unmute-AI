# データモデル

## ER図

```
languages (master)
journals  (master)  ←──┐
                       │
users 1──1 user_settings
  │
  ├── 1──N projects 1──N documents 1──N document_sentences ──→ sentence_translations (cache)
  │                       │
  │                       ├── 1──N translation_snapshots
  │                       └── 1──N structure_checks
  │
  ├── 1──N api_usage_logs
  └── 1──N audit_logs

document_shares (documents ←→ users, N:N)
```

---

## マスタテーブル

### languages

対応言語のマスタ。LanguageCode の正規化先。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| code | VARCHAR(5) | PK | "ja", "en", "zh" 等 |
| name | VARCHAR(50) | NOT NULL | "Japanese", "English" 等 |
| native_name | VARCHAR(50) | NOT NULL | "日本語", "English" 等 |

初期データ: ja, en, zh, ko, de, fr, es, pt

### journals

ジャーナル設定のマスタ。ユーザー定義ジャーナルも格納可能。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(50) | PK | "nature", "science", "general" 等 |
| name | VARCHAR(100) | NOT NULL | 表示名 |
| description | TEXT | NOT NULL, default '' | 説明文 |
| style_guide | TEXT | NOT NULL, default '' | 翻訳プロンプトに注入するスタイルガイド |
| is_system | BOOLEAN | NOT NULL, default false | システム定義 (true) / ユーザー定義 (false) |
| created_by | UUID | FK → users, NULL可 | ユーザー定義の場合の作成者 |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

---

## コアテーブル

### users

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | ログイン用メール |
| name | VARCHAR(100) | | 表示名 |
| avatar_url | TEXT | | プロフィール画像URL |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |
| deleted_at | TIMESTAMPTZ | NULL | soft delete |

### user_settings

ユーザーごとの設定。localStorage → DB移行先。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| user_id | UUID | FK → users, UNIQUE, NOT NULL | 1:1 |
| default_source_lang | VARCHAR(5) | FK → languages, NOT NULL, default 'ja' | |
| default_target_lang | VARCHAR(5) | FK → languages, NOT NULL, default 'en' | |
| default_journal | VARCHAR(50) | FK → journals, NOT NULL, default 'general' | |
| translation_provider | VARCHAR(20) | NOT NULL, default 'deepl' | 翻訳プロバイダ |
| translation_model | VARCHAR(50) | NOT NULL, default '' | モデル指定 (空 = プロバイダのデフォルト) |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |

`translation_provider` の値: `"deepl"`, `"gemini"`, `"openai"` 等
`translation_model` の値例: `""` (DeepLはモデル概念なし), `"gemini-2.5-flash-lite"`, `"gpt-4o"` 等

### projects

論文単位のグルーピング。1論文 = 1 project、各セクション = 1 document。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| user_id | UUID | FK → users, NOT NULL | 所有者 |
| title | VARCHAR(200) | NOT NULL | プロジェクト名 |
| description | TEXT | NOT NULL, default '' | 説明 |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |
| deleted_at | TIMESTAMPTZ | NULL | soft delete |

インデックス: `(user_id, updated_at DESC)`

### documents

翻訳ドキュメント。全文テキストを保持（高速読み込み用）。
文単位のデータは `document_sentences` が正とする。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| project_id | UUID | FK → projects, NOT NULL | 所属プロジェクト |
| user_id | UUID | FK → users, NOT NULL | 所有者 |
| title | VARCHAR(200) | NOT NULL, default '' | セクション名 (Introduction等) |
| sort_order | INT | NOT NULL, default 0 | プロジェクト内の表示順 |
| source_text | TEXT | NOT NULL, default '' | 原文（全文、表示用キャッシュ） |
| translated_text | TEXT | NOT NULL, default '' | 翻訳文（全文、表示用キャッシュ） |
| source_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| target_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| journal | VARCHAR(50) | FK → journals | |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |
| deleted_at | TIMESTAMPTZ | NULL | soft delete |

インデックス: `(project_id, sort_order)`, `(user_id, updated_at DESC)`

---

## 文単位翻訳

### document_sentences

ドキュメントの文単位分割データ。翻訳の最小単位。
文境界検出ロジック: `/[.。!?！？]\s*/g` + 段落境界

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| document_id | UUID | FK → documents, NOT NULL | |
| position | INT | NOT NULL | 0始まりの文順序 |
| source_text | TEXT | NOT NULL | 原文の1文 |
| translated_text | TEXT | NOT NULL, default '' | 翻訳済みの1文 |
| provider | VARCHAR(20) | NOT NULL, default '' | この翻訳を生成したプロバイダ |
| model | VARCHAR(50) | NOT NULL, default '' | 使用モデル |
| sentence_translation_id | UUID | FK → sentence_translations, NULL可 | 使用したキャッシュエントリ |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |

UNIQUE制約: `(document_id, position)`
インデックス: `(document_id, position)`

### sentence_translations

文単位の翻訳キャッシュ。同一文+同一プロバイダの重複翻訳を防ぐ。
キャッシュキー: source_text_hash + source_lang + target_lang + journal + provider

**プロバイダごとに別キャッシュエントリ** とする。同じ原文でもDeepLとGeminiでは翻訳結果が異なるため。
プロバイダ切り替え時、旧プロバイダのキャッシュは残り、再度切り替えたときに再利用される。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| source_text_hash | CHAR(64) | NOT NULL | SHA-256(正規化済みsource_text) |
| source_text | TEXT | NOT NULL | 原文（ハッシュ衝突時の照合用） |
| translated_text | TEXT | NOT NULL | 翻訳結果 |
| source_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| target_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| journal | VARCHAR(50) | FK → journals | NULL = ジャーナル指定なし |
| provider | VARCHAR(20) | NOT NULL | "deepl", "gemini", "openai" |
| model | VARCHAR(50) | NOT NULL, default '' | "gemini-2.5-flash-lite", "gpt-4o" 等 |
| hit_count | INT | NOT NULL, default 1 | キャッシュヒット回数 |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| last_used_at | TIMESTAMPTZ | NOT NULL, default now | |

UNIQUE制約: `(source_text_hash, source_lang, target_lang, journal, provider)`

---

## 履歴・チェック

### translation_snapshots

翻訳の履歴スナップショット。保存ポリシー: 1ドキュメントあたり最大100件、超過時は最古を自動削除。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| document_id | UUID | FK → documents, NOT NULL | |
| source_text | TEXT | NOT NULL | スナップショット時の原文 |
| translated_text | TEXT | NOT NULL | スナップショット時の翻訳文 |
| source_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| target_lang | VARCHAR(5) | FK → languages, NOT NULL | |
| journal | VARCHAR(50) | FK → journals | |
| provider | VARCHAR(20) | NOT NULL | スナップショット時のプロバイダ |
| model | VARCHAR(50) | NOT NULL, default '' | スナップショット時のモデル |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

インデックス: `(document_id, created_at DESC)`
保存ポリシー: アプリ側で `INSERT` 時に件数チェック → 100件超過分を `DELETE`

### structure_checks

論理構成チェックの結果。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| document_id | UUID | FK → documents, NOT NULL | |
| overall_score | SMALLINT | NOT NULL | 全体スコア (1-10) |
| summary | TEXT | NOT NULL | 全体フィードバック |
| paragraphs | JSONB | NOT NULL | ParagraphFeedback[] |
| provider | VARCHAR(20) | NOT NULL | チェックに使用したプロバイダ |
| model | VARCHAR(50) | NOT NULL, default '' | 使用モデル |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

インデックス: `(document_id, created_at DESC)`

---

## コラボレーション

### document_shares

ドキュメントの共有設定。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| document_id | UUID | FK → documents, NOT NULL | |
| shared_with_user_id | UUID | FK → users, NOT NULL | 共有先ユーザー |
| permission | VARCHAR(10) | NOT NULL, default 'view' | "view" or "edit" |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

UNIQUE制約: `(document_id, shared_with_user_id)`

---

## 運用・監査

### api_usage_logs

API利用量トラッキング。コスト管理・利用制限用。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| user_id | UUID | FK → users, NOT NULL | |
| endpoint | VARCHAR(50) | NOT NULL | "translate-sentence", "detect-language", "check-structure" |
| provider | VARCHAR(20) | NOT NULL | "deepl", "gemini", "openai" |
| model | VARCHAR(50) | NOT NULL, default '' | 使用した具体的モデル |
| input_chars | INT | NOT NULL, default 0 | 入力文字数 |
| output_chars | INT | NOT NULL, default 0 | 出力文字数 |
| cache_hit | BOOLEAN | NOT NULL, default false | キャッシュヒットしたか |
| latency_ms | INT | | レスポンス時間 (ms) |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

インデックス: `(user_id, created_at DESC)`, `(provider, created_at DESC)`

### audit_logs

変更履歴の監査ログ。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| user_id | UUID | FK → users | 操作者 (NULL = system) |
| action | VARCHAR(50) | NOT NULL | "create", "update", "delete", "share" 等 |
| entity_type | VARCHAR(50) | NOT NULL | "document", "project", "user" 等 |
| entity_id | UUID | NOT NULL | 対象のID |
| changes | JSONB | | 変更差分 { field: { old, new } } |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

インデックス: `(entity_type, entity_id, created_at DESC)`, `(user_id, created_at DESC)`

### file_attachments

インポート/エクスポートのファイル管理。ストレージはGCS等の外部サービス。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, default gen | |
| document_id | UUID | FK → documents | 関連ドキュメント |
| user_id | UUID | FK → users, NOT NULL | アップロード者 |
| file_name | VARCHAR(255) | NOT NULL | 元のファイル名 |
| file_type | VARCHAR(20) | NOT NULL | "docx", "tex", "pdf" 等 |
| storage_path | TEXT | NOT NULL | GCS等のパス |
| file_size_bytes | BIGINT | NOT NULL | ファイルサイズ |
| direction | VARCHAR(10) | NOT NULL | "import" or "export" |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

インデックス: `(document_id, created_at DESC)`

---

## クライアント側の状態

エディタの編集中テキストはDBに逐一保存せず、React stateで管理。

| データ | 保存先 | DB同期タイミング |
|---|---|---|
| 編集中テキスト | React state | デバウンス自動保存 (30秒) + 離脱時保存 |
| 編集中テキスト (バックアップ) | localStorage | 毎編集時 (DB障害時のフォールバック) |
| ハイライト状態 | ProseMirror plugin state | 保存しない |
| 文分割リスト | React state (前回比較用) | 変更検出後にDBへ |

## 自動保存ポリシー

1. 最後の編集から **30秒後** にデバウンス自動保存 → `documents` + `document_sentences` を更新
2. ブラウザ離脱時 (`beforeunload`) に保存
3. 編集中は **localStorage にもバックアップ** (DB障害時のフォールバック)
4. 自動保存のたびに `translation_snapshots` は作成しない（明示的な「保存」操作時のみ）

## キャッシュ管理ポリシー

- `sentence_translations` の TTL: 90日間未使用 (`last_used_at` 基準) で自動削除
- 定期バッチ or cron で `DELETE FROM sentence_translations WHERE last_used_at < NOW() - INTERVAL '90 days'`
- `hit_count` が高いエントリは統計分析に活用可能
- プロバイダ切り替え時、旧プロバイダのキャッシュは削除せず保持（再切り替え時に再利用）
