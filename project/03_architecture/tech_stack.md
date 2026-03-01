# 技術スタック

## フロントエンド / フレームワーク

- **Next.js** (App Router) — `writing_paper_other_language/` ディレクトリ内に構築
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**

## AI / LLM

- **Gemini API** (gemini-2.5-flash-lite)
- `GEMINI_API_KEY` を環境変数からロード
- Vercel AI SDK (`ai` + `@ai-sdk/google`) を使用

## ドメイン

- `unmute-ai.com`

## 参考

- https://nextjs.org/docs/app/guides/ai-agents

## デプロイ / インフラ

- **Google Cloud Run** — Next.js standalone モードで実行
- **Artifact Registry** — Docker イメージの保管 (europe-west1)
- **Cloud SQL** (PostgreSQL) — データベース
- **Secret Manager** — ランタイムシークレット管理
- **GitHub Actions** — CI/CD パイプライン
- **Workload Identity Federation** — GitHub → GCP keyless認証
