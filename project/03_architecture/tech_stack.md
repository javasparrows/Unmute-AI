# 技術スタック

## フロントエンド / フレームワーク

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**

## AI / LLM

- **Gemini API** (gemini-2.5-flash-lite)
- `GEMINI_API_KEY` を環境変数からロード
- Vercel AI SDK (`ai` + `@ai-sdk/google`) を使用

## データベース

- **Vercel Postgres** (Neon Serverless PostgreSQL)
- **Prisma ORM** + `@prisma/adapter-neon` (サーバーレス対応)
- リージョン: ap-southeast-1 (Singapore)

## ドメイン

- `unmute-ai.com`

## 参考

- https://nextjs.org/docs/app/guides/ai-agents

## デプロイ / インフラ

- **Vercel** — Next.js のホスティング + 自動デプロイ
- **Vercel Postgres (Neon)** — サーバーレス PostgreSQL
- **Vercel Environment Variables** — シークレット管理
- Git push to main → 自動プロダクションデプロイ
- PR → 自動プレビューデプロイ
