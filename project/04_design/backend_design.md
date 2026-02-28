# バックエンド設計

## API Routes (Next.js App Router)

サーバーサイドはNext.jsのRoute Handlersで実装。

### /api/translate (POST)

- Vercel AI SDK の `streamText()` を使用
- Gemini gemini-2.5-flash-lite モデル
- システムプロンプトにジャーナルのスタイルガイドを含む
- テキストストリームレスポンスを返す

### /api/detect-language (POST)

- Vercel AI SDK の `generateText()` を使用
- テキスト先頭200文字で判定
- 対応言語コード: ja, en, zh, ko, de, fr, es, pt

### /api/check-structure (POST)

- Vercel AI SDK の `generateText()` を使用
- JSON形式でレスポンスを要求
- markdownコードフェンスの除去処理あり

## 環境変数

- `GEMINI_API_KEY`: Gemini APIキー（`.env.local` に設定）
