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
