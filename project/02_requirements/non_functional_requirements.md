# 非機能要件

## NFR-1: UI言語

- 基本的にUIは日本語で表示する

## NFR-2: デザインテーマ

- light purpleを基調としたカラースキーム

## NFR-3: デプロイ

- Google Cloud Run にデプロイ
- GitHub Actions による CI/CD パイプライン（main push → 自動デプロイ）
- Prismaマイグレーションはデプロイ前にCI/CDパイプライン内で実行
- Workload Identity Federation による keyless GCP認証

## NFR-4: データ保存

- 修正履歴の保存（localStorageまたはDB）
  - 元の要件では「本来はDBを作るべきか？」という検討事項あり

## NFR-5: パフォーマンス

- リアルタイム翻訳のレスポンスが体感的に遅くならないこと
- ストリーミングレスポンスで即座にフィードバックを返す
