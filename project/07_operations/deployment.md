# デプロイ

## デプロイ先

- Google Cloud Run (europe-west1)
- プロジェクト: `translater-488810`
- サービス名: `lexora`

## CI/CD パイプライン

### 自動デプロイ (deploy.yml)

mainブランチへのpushで自動実行:

1. GCP認証 (Workload Identity Federation)
2. Cloud SQL Auth Proxy起動
3. `prisma migrate deploy` (失敗時はデプロイ中止)
4. Docker build → Artifact Registry へ push
5. Cloud Run へデプロイ

### PR検証 (ci.yml)

mainへのPRで自動実行:

1. `yarn install`
2. `prisma generate`
3. `yarn lint`
4. `yarn build`

## 環境変数・シークレット

### GitHub Secrets (必須)

| Secret名 | 用途 |
|----------|------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIFプロバイダーリソース名 |
| `GCP_SERVICE_ACCOUNT_EMAIL` | GCPサービスアカウントメール |
| `CLOUD_SQL_CONNECTION_NAME` | Cloud SQLインスタンス接続名 |
| `DATABASE_URL` | マイグレーション用DB接続文字列 (127.0.0.1経由) |

### Cloud Run ランタイム環境変数

GCP Secret Manager で管理し、Cloud Run サービスに紐付け:

- `GEMINI_API_KEY`: Gemini APIキー
- `DATABASE_URL`: Cloud SQL接続文字列
- `AUTH_SECRET`: Auth.jsセッション暗号化キー
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google OAuth 2.0

## GCP前提条件 (手動・1回限り)

1. API有効化: Cloud Run, Artifact Registry, Cloud SQL Admin, Secret Manager, IAM
2. Artifact Registry リポジトリ作成 (`lexora`, europe-west1)
3. Service Account作成 + 必要なロール付与
4. Workload Identity Federation設定 (GitHub Actions連携)
5. GCP Secret Manager にランタイムシークレット登録
6. GitHub リポジトリに Secrets 登録

## ビルド

- `yarn build` でプロダクションビルド (Next.js standalone output)
- Docker マルチステージビルド: dependencies → builder (prisma generate + build) → runner
- Node.js 24 LTS ベースイメージ
