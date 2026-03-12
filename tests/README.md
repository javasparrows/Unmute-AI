# テスト

## ユニットテスト

Vitest を使用。`src/lib/__tests__/` 配下にテストファイルを配置。

```bash
# 全テスト実行
yarn test

# ウォッチモード
yarn test:watch

# 特定ファイルのみ
npx vitest run src/lib/__tests__/alignment.test.ts
```

### テストファイル一覧

| ファイル | 内容 |
|---|---|
| `alignment.test.ts` | アライメント関連: findAffectedGroups, expandWithNeighbors, mergePartialTranslation |
| `split-sentences.test.ts` | 文分割: splitSentences, detectChangedSentences, computeSentenceRanges |

## API統合テスト

`tests/scripts/` 配下のシェルスクリプトで実行。`yarn dev` でサーバー起動後に使用。

### 前提条件

1. `yarn dev` でローカルサーバーを起動
2. ブラウザでログインしてセッションCookieを取得

```bash
# Cookieの取得方法:
# 1. ブラウザでログイン
# 2. DevTools → Application → Cookies → authjs.session-token の値をコピー
```

### テストスクリプト

#### 0. テスト用セッション自動作成

Googleログイン不要で、Auth.jsのセッションをDBに直接作成してCookieを発行する。

```bash
# 出力: authjs.session-token=...
./tests/scripts/create-auth-session.sh
```

#### 1. translate-sentence API テスト

全テストケースを実行し、トークン数・時間・翻訳文数をログに記録。

```bash
# Cookie なし（認証が必要なケースは失敗するため、疎通確認用途）
./tests/scripts/test-translate-api.sh

# Cookie 指定
./tests/scripts/test-translate-api.sh http://localhost:3000 "authjs.session-token=YOUR_TOKEN"

# package.json から実行
yarn test:api
```

**テストケース:**

| # | テスト名 | 内容 | 期待ステータス |
|---|---|---|---|
| 1 | full_5_sentences_ja_en | 5文の全文翻訳 (ja→en) | 200 |
| 2 | partial_2_sentences_ja_en | 2文のみ翻訳 (ja→en) | 200 |
| 3 | full_5_sentences_en_ja | 5文の全文翻訳 (en→ja) | 200 |
| 4 | partial_2_sentences_en_ja | 2文のみ翻訳 (en→ja) | 200 |
| 5 | single_sentence | 1文のみ | 200 |
| 6 | with_empty_sentences | 空文混在のフィルタリング | 200 |
| 7 | same_language_error | 同一言語エラー | 400 |
| 8 | empty_sentences | 空配列 | 200 |

#### 2. 全文 vs 部分翻訳 比較テスト

10文の論文テキストで全文翻訳と部分翻訳(3文)のトークン数・時間を比較。
いずれかのAPI呼び出しが失敗した場合は終了コード 1 で終了。
任意で削減率・速度向上率の閾値を指定できる。

```bash
./tests/scripts/test-partial-vs-full.sh http://localhost:3000 "authjs.session-token=YOUR_TOKEN"

# 閾値付き: トークン削減率20%以上を必須にする
./tests/scripts/test-partial-vs-full.sh http://localhost:3000 "authjs.session-token=YOUR_TOKEN" 20 0

# package.json から実行
yarn test:partial-vs-full
```

#### 3. E2E一括実行（推奨）

サーバ起動 → セッション発行 → APIテスト → 部分vs全文比較 を一括実行。

```bash
yarn test:e2e:translation

# 既存Cookieを使う場合（DBセッション自動作成をスキップ）
E2E_COOKIE="authjs.session-token=YOUR_TOKEN" yarn test:e2e:translation
```

**出力例:**
```
全文翻訳:   1200 tokens, 3500ms
部分翻訳:   450 tokens, 1200ms
トークン削減率: 62.5%
速度向上率:     65.7%
```

### cURL 個別コマンド

```bash
# 変数設定
BASE=http://localhost:3000
COOKIE="authjs.session-token=YOUR_TOKEN"

# 全文翻訳 (5文)
curl -s -X POST "$BASE/api/translate-sentence" \
  -H "Content-Type: application/json" \
  -b "$COOKIE" \
  -d '{
    "sentences": ["細胞を培養した。","結果は有意であった。","この手法は先行研究に基づく。","考察を以下に述べる。","仮説は支持された。"],
    "sourceLang": "ja",
    "targetLang": "en",
    "journal": "general"
  }' | python3 -m json.tool

# 部分翻訳 (1文変更 + 前後コンテキスト)
curl -s -X POST "$BASE/api/translate-sentence" \
  -H "Content-Type: application/json" \
  -b "$COOKIE" \
  -d '{
    "sentences": ["結果は非常に有意であった。","この手法は先行研究に基づく。"],
    "sourceLang": "ja",
    "targetLang": "en",
    "journal": "general"
  }' | python3 -m json.tool

# エラーケース: 同一言語
curl -s -X POST "$BASE/api/translate-sentence" \
  -H "Content-Type: application/json" \
  -b "$COOKIE" \
  -d '{
    "sentences": ["テスト"],
    "sourceLang": "ja",
    "targetLang": "ja"
  }' | python3 -m json.tool
```

## ログ

テストログは `tests/logs/` に出力される (gitignore済み)。

- `translate_test_YYYYMMDD_HHMMSS.json` — 全テストケースの詳細ログ
- `translate_summary_YYYYMMDD_HHMMSS.txt` — サマリー
- `partial_vs_full_YYYYMMDD_HHMMSS.json` — 比較テストのログ

### ログに含まれるメトリクス

| メトリクス | 説明 |
|---|---|
| `inputTokens` | Gemini API に送信したトークン数 |
| `outputTokens` | Gemini API から受信したトークン数 |
| `translationCount` | 返された翻訳文の数 |
| `sentencesSent` | APIに送信した文の数 |
| `elapsedMs` | リクエストの所要時間 (ms) |
| `httpStatus` | APIレスポンスのHTTPステータス |
| `passed` | テストケースの成否 |

## CI（継続検証）

GitHub Actions: `.github/workflows/translation-e2e.yml`

- 実行タイミング: 手動実行 / 毎日定期実行
- 実行内容: `yarn test:e2e:translation`
- 成功条件:
  - APIテストが全ケース成功
  - `partial_vs_full` が成功
  - トークン削減率が `MIN_TOKEN_REDUCTION_PCT` 以上（workflow既定: 20%）

### 必要な GitHub Secrets

- `E2E_DATABASE_URL`
- `E2E_DATABASE_URL_UNPOOLED`
- `E2E_AUTH_SECRET`
- `E2E_GEMINI_API_KEY`
