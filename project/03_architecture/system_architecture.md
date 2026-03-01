# システムアーキテクチャ

## 全体構成

```
[ブラウザ (Next.js Client)]
  ├── 左パネル (原文エディタ)
  ├── 同期ボタン列 (→ / ←)
  ├── 右パネル (翻訳エディタ)
  ├── 言語セレクター
  ├── ジャーナルセレクター
  ├── 履歴パネル
  └── 構成チェックダイアログ
        │
        ▼
[Next.js API Routes (Server)]
  ├── POST /api/translate-sentence  — 文単位翻訳 (最大4並列で呼び出し)
  ├── POST /api/align-sentences     — 文アラインメント (翻訳後に実行)
  ├── POST /api/translate           — ストリーミング翻訳 (レガシー)
  ├── POST /api/detect-language     — 言語自動検出
  └── POST /api/check-structure     — 論理構成チェック
        │
        ▼
[翻訳プロバイダ]
  └── Gemini API (gemini-2.5-flash) — /api/translate-sentence, /api/align-sentences から呼び出し
```

## 双方向手動同期翻訳フロー

```
┌─────────────┐ ┌──┐ ┌─────────────┐
│             │ │→ │ │             │
│   原文      │ │  │ │   翻訳      │
│             │ │← │ │             │
└─────────────┘ └──┘ └─────────────┘
```

1. ユーザーが一方のパネルを編集（テキスト保存のみ、翻訳は発生しない）
2. ユーザーが同期ボタン（→ or ←）を押下
3. 前回同期時のスナップショットと現在のテキストを比較し、変更された文のみを検出
4. 変更文をチャンク分割し、最大4並列で `/api/translate-sentence` に送信
5. `Promise.all` + `flatMap` で翻訳結果を元の順序に復元
6. もう一方のパネルに翻訳結果を反映（未変更文はそのまま保持）
7. `/api/align-sentences` でソース↔ターゲットのN:M文アラインメントを取得
8. アラインメントマップを保存 → ハイライト同期に使用
9. スナップショットを更新

## ハイライト同期（アラインメントベース）

- 翻訳後にLLMが文の意味的対応を分析し、N:Mアラインメントを構築
- 一方のパネルでクリック → マップで逆引き → 対応文を他方でハイライト
- 翻訳で文が統合・分割されても正しく動作

```
例: 原文3文 → 翻訳2文 (S1+S2 が T1 に統合)

alignment: [{source:[0], target:[0]}, {source:[1,2], target:[1]}]

翻訳パネルで T1 クリック → targetToSource(1) = [1,2]
→ 原文パネルで S1 と S2 を同時ハイライト ✓
```

## データフロー

- テキスト状態: クライアント側のReact state
- アラインメントマップ: クライアント側の React ref（同期のたびに更新）
- 言語設定・ジャーナル設定: localStorage に永続化
- 修正履歴: localStorage に保存（最大50件、2MB制限）
- コスト追跡: localStorage に永続化（月次自動リセット）

## DB層・認証フロー

### データベース

- **PostgreSQL** (Cloud SQL) via Prisma ORM
- **Prisma Adapter** (`@prisma/adapter-pg`) for direct PG connections
- テーブル: User, Account, Session, VerificationToken, Document, DocumentVersion

### 認証フロー

```
ブラウザ → /login → Google OAuth 2.0 → Auth.js callback → Session作成 → /（ダッシュボード）
```

- Auth.js v5 + PrismaAdapter
- JWT-lessセッション (DB Session)
- middleware.tsで全ルートを保護、未認証は/loginへリダイレクト

### Server Actions

- `createDocument` / `getDocuments` / `deleteDocument` / `renameDocument`
- `saveVersion` / `getVersions` / `getVersion`
- すべてのActionは認証チェック + ドキュメント所有権検証

### データフロー

```
ページロード: DB (最新バージョン) → Server Component → Client Component (useState)
保存: Client State → Server Action (saveVersion) → DB
復元: Version Panel → Server Action (getVersion) → Client State更新
```

## デプロイアーキテクチャ

```
Push to main
    │
    ▼
GitHub Actions Runner
    ├── 1. Checkout
    ├── 2. GCP認証 (Workload Identity Federation)
    ├── 3. Cloud SQL Auth Proxy起動
    ├── 4. prisma migrate deploy (失敗時はここで停止)
    ├── 5. Docker build (prisma generate含む)
    ├── 6. Artifact Registry へ push
    └── 7. Cloud Run へデプロイ
```

- **Cloud Run**: Next.js standalone モードで実行
- **Artifact Registry**: Docker イメージの保管 (`europe-west1-docker.pkg.dev`)
- **Cloud SQL Auth Proxy**: マイグレーション時のDB接続に使用
- **Workload Identity Federation**: GitHub Actions → GCP の keyless 認証
