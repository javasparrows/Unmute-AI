# GCP → Vercel 完全移行タスク

## タスク一覧

- [x] **Task 1**: Vercel プロジェクト作成 & GitHub リポジトリ連携
- [x] **Task 2**: Vercel Postgres 作成 & データ移行
- [x] **Task 3**: Prisma 接続設定を Vercel Postgres 向けに変更
- [x] **Task 4**: next.config.ts から `output: "standalone"` を削除
- [x] **Task 5**: Vercel に環境変数を設定
- [x] **Task 6**: Vercel でデプロイ確認
- [x] **Task 7**: カスタムドメイン `unmute-ai.com` を Vercel に設定
- [x] **Task 8**: 不要ファイル削除 (Dockerfile, .dockerignore, deploy.yml, ci.yml, gcp-resource-rename.md)
- [x] **Task 9**: project/ ドキュメントを Vercel 構成に更新
- [x] **Task 10**: GCP リソース全削除 (Cloud Run, AR, Cloud SQL, Secret Manager)
- [x] **Task 11**: 最終確認 & git commit/merge

---

## Task 1: Vercel プロジェクト作成 & GitHub リポジトリ連携

```bash
# Vercel CLI インストール確認
vercel --version

# プロジェクトを Vercel にリンク (対話的に設定)
cd /Users/yukik/Work/Tohoku/tompei-project/writing_paper_other_language
vercel link
```

**結果**: [ ]

---

## Task 2: Vercel Postgres 作成 & データ移行

```bash
# Vercel Postgres を作成
vercel storage create postgres

# 既存 Cloud SQL からデータをエクスポート
pg_dump "postgresql://postgres:postgres@localhost:5433/translation_editor" \
  --no-owner --no-acl --clean --if-exists > /tmp/unmute-ai-dump.sql

# Vercel Postgres にインポート
# (接続文字列は Vercel ダッシュボードから取得)
psql "<VERCEL_POSTGRES_URL>" < /tmp/unmute-ai-dump.sql
```

**結果**: [ ]

---

## Task 3: Prisma 接続設定を Vercel Postgres 向けに変更

Vercel Postgres (Neon) はサーバーレス環境のため、接続方法を調整する。

- `prisma/schema.prisma`: `directUrl` を追加
- `src/lib/prisma.ts`: `@prisma/adapter-pg` (直接PG接続) → 標準の PrismaClient に変更（Neon は自前のコネクションプーリングを提供するため）

**結果**: [ ]

---

## Task 4: next.config.ts から `output: "standalone"` を削除

`output: "standalone"` は Docker/Cloud Run 向け。Vercel ではデフォルト動作が最適。

**結果**: [ ]

---

## Task 5: Vercel に環境変数を設定

Vercel Postgres を作成すると `DATABASE_URL` と `POSTGRES_URL_NON_POOLING` は自動設定される。
残りを手動で設定:

```bash
vercel env add GEMINI_API_KEY
vercel env add AUTH_SECRET
vercel env add AUTH_GOOGLE_ID
vercel env add AUTH_GOOGLE_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRO_PRICE_ID
vercel env add STRIPE_MAX_PRICE_ID
vercel env add AUTH_TRUST_HOST
```

**結果**: [ ]

---

## Task 6: Vercel でデプロイ確認

```bash
vercel deploy
```

動作確認:
- LP 表示
- ログイン (Google OAuth)
- エディタ動作

**結果**: [ ]

---

## Task 7: カスタムドメイン `unmute-ai.com` を Vercel に設定

```bash
vercel domains add unmute-ai.com
```

Cloudflare DNS を Vercel の指示に従って更新。
GCP Cloud Run のドメインマッピングを削除:

```bash
gcloud beta run domain-mappings delete --domain=unmute-ai.com \
  --project=translater-488810 --region=europe-west1 --quiet
```

**結果**: [ ]

---

## Task 8: 不要ファイル削除

以下を削除:
- `Dockerfile`
- `.dockerignore`
- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `project/07_operations/gcp-resource-rename.md`

**結果**: [ ]

---

## Task 9: project/ ドキュメント更新

以下のファイルを Vercel 構成に更新:
- `project/00_overview.md` — 技術スタック記述
- `project/02_requirements/non_functional_requirements.md` — NFR-3 デプロイ
- `project/03_architecture/tech_stack.md` — 全面書き換え
- `project/03_architecture/system_architecture.md` — デプロイアーキテクチャ部分
- `project/07_operations/deployment.md` — 全面書き換え

**結果**: [ ]

---

## Task 10: GCP リソース全削除

```bash
# Cloud Run サービス削除
gcloud run services delete unmute-ai \
  --project=translater-488810 --region=europe-west1 --quiet

# Artifact Registry リポジトリ削除
gcloud artifacts repositories delete unmute-ai \
  --location=europe-west1 --project=translater-488810 --quiet

# Cloud Run ドメインマッピング削除 (Task 7 で実施済みの場合はスキップ)
# gcloud beta run domain-mappings delete --domain=unmute-ai.com ...
```

> **注意**: Cloud SQL (lexora-db) と Secret Manager は、データバックアップ確認後に手動で削除を検討。

**結果**: [ ]

---

## Task 11: 最終確認 & git commit/merge

- `unmute-ai.com` で LP 表示確認
- ログイン → ダッシュボード → エディタの動作確認
- git commit & PR & merge

**結果**: [ ]
