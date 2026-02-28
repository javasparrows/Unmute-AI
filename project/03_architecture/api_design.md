# API設計

## POST /api/translate

ストリーミング翻訳。Gemini APIにテキストを送り、翻訳結果をストリーミングで返す。

**リクエスト:**
```json
{
  "text": "翻訳対象テキスト",
  "sourceLang": "ja",
  "targetLang": "en",
  "journal": "nature"
}
```

**レスポンス:** Text stream (翻訳結果がチャンクで返る)

## POST /api/translate-sentence

文単位の翻訳。変更があった文のみを受け取り翻訳する。
フロントエンドから最大4並列で呼び出される（チャンク分割）。

**リクエスト:**
```json
{
  "sentences": ["文1", "文2", "文3"],
  "sourceLang": "ja",
  "targetLang": "en",
  "provider": "deepl",
  "journal": "nature"
}
```

**レスポンス:**
```json
{
  "translations": ["Translation 1", "Translation 2", "Translation 3"],
  "usage": {
    "provider": "deepl",
    "characters": 42
  }
}
```

**整合性保証:**
- `translations[i]` は必ず `sentences[i]` の翻訳（1:1対応）
- 空文字列の入力にはに空文字列を返す
- 並列呼び出し時は呼び出し側が `Promise.all` + `flatMap` で順序を復元

## POST /api/align-sentences

翻訳後のソース文とターゲット文のN:M対応関係（アラインメント）を取得する。
ハイライト同期の精度を保証するための専用エンドポイント。

**リクエスト:**
```json
{
  "sourceSentences": ["原文1。", "原文2。原文3。"],
  "targetSentences": ["Translation 1.", "Translations 2 and 3."],
  "sourceLang": "ja",
  "targetLang": "en"
}
```

**レスポンス:**
```json
{
  "alignment": [
    { "source": [0], "target": [0] },
    { "source": [1, 2], "target": [1] }
  ],
  "usage": {
    "provider": "gemini",
    "inputTokens": 150,
    "outputTokens": 30
  }
}
```

**制約:**
- `alignment` の全 `source` インデックスの和集合 = `[0, sourceSentences.length)`
- `alignment` の全 `target` インデックスの和集合 = `[0, targetSentences.length)`
- 各インデックスは1つのペアにのみ出現（重複なし）
- ペアはソース順にソートされている（交差なし）
- 常にGeminiを使用（言語理解が必要なため）

**バリデーション失敗時:**
- 位置ベースの1:1フォールバックマッピングを返す
  `[{source:[0], target:[0]}, {source:[1], target:[1]}, ...]`

## POST /api/detect-language

テキストの言語を自動検出する。

**リクエスト:**
```json
{
  "text": "検出対象テキスト"
}
```

**レスポンス:**
```json
{
  "language": "ja"
}
```

## POST /api/check-structure

段落ごとの論理構成を分析する。

**リクエスト:**
```json
{
  "text": "分析対象テキスト",
  "lang": "en"
}
```

**レスポンス:**
```json
{
  "overallScore": 7,
  "summary": "全体の評価コメント",
  "paragraphs": [
    {
      "paragraphIndex": 0,
      "role": "Introduction/Background",
      "logicFlow": "論理フローの説明",
      "suggestions": ["改善提案1", "改善提案2"],
      "score": 7
    }
  ]
}
```
