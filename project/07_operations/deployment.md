# デプロイ

## デプロイ先

- Vercel
- プロジェクト: `unmute-ai`
- ドメイン: `unmute-ai.com`

## 自動デプロイ

Vercel の GitHub 連携により、以下が自動実行される:

- **main ブランチへの push** → プロダクションデプロイ
- **PR 作成** → プレビューデプロイ

ビルドコマンド: `prisma generate && next build`

## データベース

- **Vercel Postgres (Neon)** — ap-southeast-1 (Singapore)
- Prisma ORM + `@prisma/adapter-neon`

### マイグレーション

マイグレーションはローカルから実行:

```bash
npx prisma migrate deploy
```

`prisma.config.ts` が `DATABASE_URL_UNPOOLED` (直接接続) を使用してマイグレーションを実行する。

## 環境変数

Vercel ダッシュボード (Settings > Environment Variables) で管理:

| 変数名 | 用途 |
|--------|------|
| `DATABASE_URL` | Neon pooling 接続文字列 |
| `DATABASE_URL_UNPOOLED` | Neon 直接接続文字列 (マイグレーション用) |
| `GEMINI_API_KEY` | Gemini APIキー |
| `AUTH_SECRET` | Auth.js セッション暗号化キー |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth 2.0 |
| `AUTH_TRUST_HOST` | `true` |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット |
| `STRIPE_PRO_PRICE_ID` / `STRIPE_MAX_PRICE_ID` | Stripe 料金プラン ID |

## ビルド

- `prisma generate && next build` (Vercel のビルドコマンド)
- Dockerfile 不要（Vercel がネイティブに Next.js をビルド・実行）
