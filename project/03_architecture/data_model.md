# データモデル

## クライアント側の状態

| データ | 保存先 | 説明 |
|---|---|---|
| 左パネルテキスト | React state | 編集中の原文 |
| 右パネルテキスト | React state | 翻訳結果 / 編集中の翻訳 |
| 左言語コード | localStorage | LanguageCode ("ja", "en", etc.) |
| 右言語コード | localStorage | LanguageCode |
| ジャーナル設定 | localStorage | ジャーナルID ("nature", "science", etc.) |
| 翻訳履歴 | localStorage | HistoryEntry[] (最大50件、2MB制限) |

## 型定義

- `LanguageCode`: "ja" | "en" | "zh" | "ko" | "de" | "fr" | "es" | "pt"
- `HistoryEntry`: { id, timestamp, sourceText, translatedText, sourceLang, targetLang, journal? }
- `Journal`: { id, name, description, styleGuide }
- `ParagraphFeedback`: { paragraphIndex, role, logicFlow, suggestions, score }
- `StructureCheckResult`: { overallScore, summary, paragraphs }

## 備考

- 元の要件では「修正履歴は本来DBを作るべきか？」という検討事項あり
- 現時点ではlocalStorageで実装。将来的にDB移行も検討可能
