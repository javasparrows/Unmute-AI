# 認証 (Auth.js v5) & Google OAuth 設定ガイド

> 最終更新: 2026-03-03
> 対象: Unmute AI (`https://www.unmute-ai.com`)

## 目次

1. [全体構成](#全体構成)
2. [Auth.js v5 の設定](#authjs-v5-の設定)
3. [Google Cloud Console の OAuth 設定](#google-cloud-console-の-oauth-設定)
4. [Vercel 環境変数](#vercel-環境変数)
5. [ドメイン構成 (www あり/なし)](#ドメイン構成-www-ありなし)
6. [Vercel リージョン設定](#vercel-リージョン設定)
7. [トラブルシューティング](#トラブルシューティング)
8. [作業履歴](#作業履歴)

---

## 全体構成

```
ユーザー
  ↓ Continue with Google
www.unmute-ai.com/login
  ↓ signIn("google") (Server Action)
Auth.js v5 → Google OAuth 2.0
  ↓ コールバック
www.unmute-ai.com/api/auth/callback/google
  ↓ PrismaAdapter → Neon DB にセッション保存
www.unmute-ai.com/dashboard
```

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `src/lib/auth.ts` | Auth.js v5 のメイン設定 (providers, adapter, callbacks) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API ルートハンドラ |
| `src/app/login/page.tsx` | ログインページ (Google ボタン) |
| `src/middleware.ts` | 認証チェック (未ログイン → `/login` にリダイレクト) |
| `prisma/schema.prisma` | User, Account, Session, VerificationToken モデル |

---

## Auth.js v5 の設定

### `src/lib/auth.ts` の重要ポイント

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,           // ← Vercel デプロイに必須
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  // ...
});
```

### `trustHost: true` が必要な理由

- Auth.js v5 はデフォルトで `host` ヘッダーを信頼しない
- Vercel はリバースプロキシ経由でリクエストを転送するため、`host` ヘッダーの検証に失敗する
- `trustHost: true` がないと本番環境で **「Server error: There is a problem with the server configuration」** が表示される
- 代替手段: 環境変数 `AUTH_TRUST_HOST=true` でも同等の効果がある（両方設定しても問題なし）

### Auth.js v5 の環境変数命名規則

Auth.js v5 は `AUTH_` プレフィックスを使う（v4 の `NEXTAUTH_` とは異なる）:

| v4 (NextAuth.js) | v5 (Auth.js) | 備考 |
|-------------------|--------------|------|
| `NEXTAUTH_SECRET` | `AUTH_SECRET` | セッション暗号化キー |
| `NEXTAUTH_URL` | 不要 (自動検出) | ただし Vercel では `NEXTAUTH_URL` も認識される |
| - | `AUTH_TRUST_HOST` | Vercel デプロイ時に `true` |
| `GOOGLE_CLIENT_ID` | `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

---

## Google Cloud Console の OAuth 設定

### アクセス方法

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 対象プロジェクトを選択
3. 「APIとサービス」→「認証情報」→ OAuth 2.0 クライアント ID を編集

### 承認済み JavaScript 生成元

```
https://www.unmute-ai.com
https://unmute-ai.com
```

> **www あり・なし両方を登録する**こと。ユーザーがどちらの URL からアクセスしても OAuth フローが動作するようにする。

### 承認済みリダイレクト URI

```
https://www.unmute-ai.com/api/auth/callback/google
https://unmute-ai.com/api/auth/callback/google
```

> Auth.js v5 のコールバック URL パターンは `/api/auth/callback/{provider}` 固定。

### OAuth 同意画面

- アプリ名: Unmute AI
- プライバシーポリシー URL: `https://unmute-ai.com/privacy`
- 利用規約 URL: `https://unmute-ai.com/terms`
- 公開ステータス: テスト → 本番に変更後は Google の審査が必要

### OAuth Client ID / Secret

- Client ID: `AUTH_GOOGLE_ID` として Vercel に登録
- Client Secret: `AUTH_GOOGLE_SECRET` として Vercel に登録
- **値の末尾に改行文字が入らないよう注意**（後述のトラブルシューティング参照）

---

## Vercel 環境変数

### 認証関連の必須変数 (Production)

| 変数名 | 値の例 | 備考 |
|--------|--------|------|
| `AUTH_SECRET` | `t5msOExSQ3APJ2...` | `npx auth secret` で生成可能 |
| `AUTH_GOOGLE_ID` | `359708103687-...apps.googleusercontent.com` | Google Cloud Console から取得 |
| `AUTH_GOOGLE_SECRET` | `GOCSPX-...` | Google Cloud Console から取得 |
| `AUTH_TRUST_HOST` | `true` | Vercel デプロイに必須 |
| `NEXTAUTH_URL` | `https://www.unmute-ai.com` | Auth.js v5 では通常不要だが念のため設定 |

### Vercel CLI での環境変数の追加方法

```bash
# ⚠️ echo ではなく printf を使う（末尾の改行を防ぐ）
printf 'YOUR_VALUE_HERE' | vercel env add VARIABLE_NAME production --scope ykjvs-projects --yes

# 確認
vercel env ls production --scope ykjvs-projects
```

> **重要**: `echo` コマンドは末尾に改行 (`\n`) を付加する。OAuth の Client ID に改行が含まれると `invalid_client` エラーになる。必ず `printf` を使うこと。

### Vercel CLI のプロジェクトリンク

```bash
# .vercel/project.json の内容
{
  "projectId": "prj_wovwK4qhqHVc8zdwr6g9ua8SYkUf",
  "orgId": "team_hjnOOtxwu2uOHUtcu9rObvVM",
  "projectName": "unmute-ai"
}
```

> `.vercel/project.json` が別のプロジェクトを指していると `vercel env add` が間違ったプロジェクトに追加される。`vercel project inspect unmute-ai --scope ykjvs-projects` で正しい projectId を確認できる。

---

## ドメイン構成 (www あり/なし)

### Vercel ドメイン設定

| ドメイン | 動作 |
|---------|------|
| `www.unmute-ai.com` | **プライマリ** (Production) |
| `unmute-ai.com` | 307 リダイレクト → `www.unmute-ai.com` |
| `unmute-ai.vercel.app` | Production |

### Google Safe Browsing の問題

- `unmute-ai.com` (www なし) が Google Safe Browsing に「危険なサイト」としてフラグされていた時期がある
- `www.unmute-ai.com` はフラグされていない
- 対処: Google Search Console の Security Issues から Safe Browsing の再審査リクエストを送信

### www あり/なしと OAuth の関係

- `NEXTAUTH_URL` は `https://www.unmute-ai.com` (www あり) に設定
- Google OAuth にはリダイレクト URI を **www あり・なし両方** 登録
- Vercel のドメイン設定で `unmute-ai.com` → `www.unmute-ai.com` へ 307 リダイレクトが行われるため、実際の OAuth コールバックは www あり側で処理される

---

## Vercel リージョン設定

### `vercel.json`

```json
{
  "regions": ["hnd1"]
}
```

- `hnd1` = 東京リージョン
- この設定は **Serverless Functions** (API Routes, Server Components) のデプロイ先を制御する
- 日本のユーザーがメインターゲットのため、東京リージョンに限定してレイテンシを最適化

### リージョン設定の制約

- **Serverless Functions**: `vercel.json` の `regions` で制御可能
- **Middleware / Edge Functions**: **グローバルに全 Edge ロケーションにデプロイされる（リージョン指定不可）**
- **Static Assets**: Vercel の CDN (Edge Network) から全世界に配信

### 主要リージョン一覧 (参考)

| ID | 場所 |
|----|------|
| `hnd1` | 東京 |
| `iad1` | ワシントン D.C. (US East) |
| `sfo1` | サンフランシスコ (US West) |
| `sin1` | シンガポール |
| `dxb1` | ドバイ |

---

## トラブルシューティング

### 「Server error: There is a problem with the server configuration」

**原因候補 (優先度順):**

1. **`AUTH_SECRET` が Vercel に設定されていない**
   - Auth.js v5 はセッション暗号化に `AUTH_SECRET` を必須とする
   - ローカル `.env.local` にあっても Vercel に設定されていなければ本番で動かない
2. **`trustHost: true` が `auth.ts` にない / `AUTH_TRUST_HOST=true` が未設定**
   - Vercel のリバースプロキシ環境で host 検証が失敗する
3. **`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` が未設定**
   - Google プロバイダの初期化に失敗する

**確認方法:**
```bash
vercel env ls production --scope ykjvs-projects
```

### 「The OAuth client was not found」(Error 401: invalid_client)

**原因:** `AUTH_GOOGLE_ID` の値に不正な文字（改行等）が含まれている

**確認方法:** ブラウザの URL を確認し、`client_id=` パラメータの末尾に `%0A` (改行) がないか見る

**修正方法:**
```bash
# 削除して再追加
vercel env rm AUTH_GOOGLE_ID production --scope ykjvs-projects --yes
printf '正しいClient ID' | vercel env add AUTH_GOOGLE_ID production --scope ykjvs-projects --yes
```

### 「アクセスをブロック: このアプリは Google の確認を受けていません」

**原因:** OAuth 同意画面が「テスト」モードのまま

**対処:**
1. Google Cloud Console → OAuth 同意画面 → 「アプリを公開」
2. テストモードでは追加したテストユーザーのみがログイン可能

### 「危険なサイト」警告 (Google Safe Browsing)

**原因:** ドメインが Safe Browsing にフラグされている

**対処:**
1. Google Search Console → セキュリティの問題 → 審査リクエスト
2. www あり URL (`https://www.unmute-ai.com`) を使えば回避できる場合がある
3. 審査には数日かかる

### Vercel デプロイが「Deploying outputs... Error: internal error」で失敗

**原因候補:**
1. **Vercel プラットフォーム障害** — [vercel-status.com](https://www.vercel-status.com/) を確認
2. 特に Middleware を使っているプロジェクトは Edge デプロイの障害に影響を受けやすい

**対処:**
- Vercel Status を確認し、障害が報告されていれば復旧を待つ
- 緊急時は `middleware.ts` を一時的に削除してデプロイし、復旧後に戻す
- Vercel CLI で直接デプロイ: `vercel --prod --scope ykjvs-projects --yes`

---

## 作業履歴

### 2026-03-02〜03: 初期認証設定 & OAuth 修正

**問題:** 本番環境 (`www.unmute-ai.com`) で Google ログインが動作しない

**根本原因 (複合):**
1. Vercel に `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_TRUST_HOST` が未設定だった
2. `src/lib/auth.ts` に `trustHost: true` がなかった
3. Google OAuth の承認済み URI に www あり/なしの両方が登録されていなかった
4. Vercel CLI の `echo` で環境変数に改行が混入していた
5. Vercel の dxb1 リージョン障害で Middleware 付きのデプロイが全て失敗していた

**対応:**
1. `src/lib/auth.ts` に `trustHost: true` を追加
2. `printf` (改行なし) で Vercel に認証関連の環境変数を追加
3. Google Cloud Console で www あり/なし両方の JavaScript 生成元とリダイレクト URI を登録
4. `vercel.json` で東京リージョン (`hnd1`) を指定
5. Vercel CLI (`vercel --prod`) でデプロイし動作確認

**参考記事:**
- https://ma-vericks.com/blog/next-auth-js/
- https://zenn.dev/nomhiro/articles/nextjs-authjs-v5
