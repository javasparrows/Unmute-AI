# システムアーキテクチャ

## 全体構成

```
[ブラウザ (Next.js Client)]
  ├── 左パネル (原文エディタ)
  ├── 右パネル (翻訳エディタ)
  ├── 言語セレクター
  ├── ジャーナルセレクター
  ├── 履歴パネル
  └── 構成チェックダイアログ
        │
        ▼
[Next.js API Routes (Server)]
  ├── POST /api/translate        — ストリーミング翻訳
  ├── POST /api/detect-language  — 言語自動検出
  └── POST /api/check-structure  — 論理構成チェック
        │
        ▼
[Gemini API (gemini-2.5-flash-lite)]
```

## 双方向翻訳フロー

1. ユーザーが一方のパネルを編集
2. デバウンス（800ms）後にAPIリクエスト発火
3. ストリーミングレスポンスで反対側のパネルをリアルタイム更新
4. `translationSource` フラグで無限ループを防止

## データフロー

- テキスト状態: クライアント側のReact state
- 言語設定・ジャーナル設定: localStorage に永続化
- 修正履歴: localStorage に保存（最大50件、2MB制限）
