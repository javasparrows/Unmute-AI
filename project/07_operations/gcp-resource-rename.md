# GCPリソース名変更手順: lexora → unmute-ai

## 概要

GCPではCloud RunサービスやArtifact Registryリポジトリの「リネーム」APIが存在しないため、
新リソースを作成 → 設定を移行 → 旧リソースを削除、という手順で実施する。

## 前提情報

| 項目 | 値 |
|------|-----|
| GCPプロジェクト | `translater-488810` |
| リージョン | `europe-west1` |
| 旧サービス名 | `lexora` |
| 新サービス名 | `unmute-ai` |
| 旧ARリポジトリ | `lexora` |
| 新ARリポジトリ | `unmute-ai` |
| Cloud SQL接続名 | `translater-488810:europe-west1:lexora-db` |

## 手順

### Step 1: Artifact Registry に新リポジトリ `unmute-ai` を作成

```bash
gcloud artifacts repositories create unmute-ai \
  --repository-format=docker \
  --location=europe-west1 \
  --project=translater-488810 \
  --description="Unmute AI Docker images"
```

### Step 2: 最新イメージを旧リポジトリから新リポジトリにコピー

`docker pull` → `docker tag` → `docker push` でイメージをコピーする。
同一プロジェクト内のため、レイヤーは共有（Mounted）され高速に完了する。

```bash
# Docker認証を設定
gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet

# 旧リポジトリからpull
docker pull europe-west1-docker.pkg.dev/translater-488810/lexora/lexora:latest

# 新リポジトリ向けにtag
docker tag europe-west1-docker.pkg.dev/translater-488810/lexora/lexora:latest \
  europe-west1-docker.pkg.dev/translater-488810/unmute-ai/unmute-ai:latest

# 新リポジトリにpush
docker push europe-west1-docker.pkg.dev/translater-488810/unmute-ai/unmute-ai:latest
```

### Step 3: Cloud Run に新サービス `unmute-ai` をデプロイ

旧サービスと同じ設定（環境変数、Cloud SQL接続、リソース制限、IAM）で新サービスを作成する。

```bash
gcloud run deploy unmute-ai \
  --project=translater-488810 \
  --region=europe-west1 \
  --image=europe-west1-docker.pkg.dev/translater-488810/unmute-ai/unmute-ai:latest \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --max-instances=20 \
  --concurrency=80 \
  --timeout=300 \
  --cpu-boost \
  --set-secrets="\
DATABASE_URL=database-url:latest,\
GEMINI_API_KEY=gemini-api-key:latest,\
AUTH_SECRET=auth-secret:latest,\
AUTH_GOOGLE_ID=auth-google-id:latest,\
AUTH_GOOGLE_SECRET=auth-google-secret:latest,\
NEXTAUTH_URL=nextauth-url:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
STRIPE_PRO_PRICE_ID=stripe-pro-price-id:latest,\
STRIPE_MAX_PRICE_ID=stripe-max-price-id:latest,\
AUTH_TRUST_HOST=auth-trust-host:latest" \
  --set-cloudsql-instances=translater-488810:europe-west1:lexora-db \
  --allow-unauthenticated \
  --ingress=all
```

### Step 4: 新サービスの動作確認

```bash
# URLを取得
gcloud run services describe unmute-ai \
  --project=translater-488810 \
  --region=europe-west1 \
  --format="value(status.url)"

# curlでヘルスチェック
curl -s -o /dev/null -w "%{http_code}" $(gcloud run services describe unmute-ai \
  --project=translater-488810 \
  --region=europe-west1 \
  --format="value(status.url)")
```

### Step 5: deploy.yml を新リソース名に更新

`SERVICE_NAME` と `AR_REPOSITORY` を `unmute-ai` に変更する。

### Step 6: 旧 Cloud Run サービス `lexora` を削除

```bash
gcloud run services delete lexora \
  --project=translater-488810 \
  --region=europe-west1 \
  --quiet
```

### Step 7: 旧 Artifact Registry リポジトリ `lexora` を削除

```bash
gcloud artifacts repositories delete lexora \
  --location=europe-west1 \
  --project=translater-488810 \
  --quiet
```

### Step 8: ドキュメント更新

`project/07_operations/deployment.md` のサービス名・注記を更新する。
