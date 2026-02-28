# 文単位翻訳設計

## 概要

テキスト全体を毎回翻訳APIに投げるのではなく、**変更があった文だけ**を翻訳して差し替える。
翻訳プロバイダはStrategy Patternで抽象化し、DeepL / Gemini / OpenAI を設定で切り替え可能にする。

---

## 1. 翻訳プロバイダ抽象化 (Strategy Pattern)

### インターフェース

```typescript
// src/lib/translation/types.ts

export interface TranslateParams {
  sentence: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  context?: {
    before?: string;  // 直前の文（文脈用）
    after?: string;   // 直後の文（文脈用）
  };
  journal?: string;
  styleGuide?: string;
}

export interface TranslateResult {
  translatedText: string;
}

export interface TranslationProvider {
  readonly name: string;   // "deepl", "gemini", "openai"
  readonly model: string;  // "", "gemini-2.5-flash-lite", "gpt-4o"
  translate(params: TranslateParams): Promise<TranslateResult>;
}
```

### プロバイダ実装

```
src/lib/translation/
  ├── types.ts                  # インターフェース定義
  ├── provider-factory.ts       # プロバイダ生成ファクトリ
  ├── providers/
  │   ├── deepl-provider.ts     # DeepL API実装
  │   ├── gemini-provider.ts    # Gemini API実装
  │   └── openai-provider.ts    # OpenAI API実装
  └── sentence-translator.ts    # キャッシュ + 差分検出 + プロバイダ呼び出しの統合
```

### ファクトリ

```typescript
// src/lib/translation/provider-factory.ts

export function createTranslationProvider(
  provider: string,
  model: string,
): TranslationProvider {
  switch (provider) {
    case "deepl":
      return new DeepLProvider();
    case "gemini":
      return new GeminiProvider(model || "gemini-2.5-flash-lite");
    case "openai":
      return new OpenAIProvider(model || "gpt-4o");
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 各プロバイダの特性

| | DeepL | Gemini | OpenAI |
|---|---|---|---|
| API | REST (translate/v2) | Vercel AI SDK | Vercel AI SDK |
| context対応 | `context` パラメータ (前文のみ) | プロンプトで自由に渡せる | プロンプトで自由に渡せる |
| journal style | 非対応 (プレーン翻訳のみ) | プロンプトにstyleGuide注入 | プロンプトにstyleGuide注入 |
| 出力安定性 | 高 (決定的) | 中 (LLM特有のゆらぎ) | 中 |
| レイテンシ | ~100ms | ~500ms | ~500ms |
| コスト | 文字数課金 (無料枠50万字/月) | トークン課金 | トークン課金 |

**DeepLの場合**: journal/styleGuideは無視される（DeepLは汎用翻訳のため）。
ジャーナルスタイル適用が必要な場合は、DeepL翻訳後にGeminiでリファイン、
もしくはGemini/OpenAIに切り替えることを推奨。

---

## 2. 文単位翻訳フロー

### 全体シーケンス

```
 ユーザーが左パネルを編集
         │
         ▼
 ① 文分割 (フロントエンド)
    テキスト → 文リスト
    ロジック: /[.。!?！？]\s*/g + 段落境界 (highlight-sentence.ts と共通)
         │
         ▼
 ② 差分検出 (フロントエンド)
    previousSentences[] vs currentSentences[] を比較
    → changedIndices[] を算出
         │
         ▼
 ③ API呼び出し (変更文ごと)
    POST /api/translate-sentence
    { sentence, context, sourceLang, targetLang, journal, provider, model }
         │
         ▼
 ④ サーバー側処理
    4a. sentence_translations でキャッシュ検索
        キー: hash(sentence) + lang + journal + provider
    4b. HIT → cached result を返却、hit_count++, last_used_at更新
    4c. MISS → provider.translate() → 結果をキャッシュ保存 → 返却
    4d. api_usage_logs に記録
         │
         ▼
 ⑤ 結果反映 (フロントエンド)
    右パネルの該当文のみ差し替え
    document_sentences を更新
```

### API endpoint

```
POST /api/translate-sentence

Request:
{
  sentence: string,
  context?: { before?: string, after?: string },
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  journal?: string,
  provider?: string,   // 省略時はユーザー設定のデフォルト
  model?: string       // 省略時はプロバイダのデフォルト
}

Response:
{
  translatedSentence: string,
  cacheHit: boolean,
  provider: string,
  model: string
}
```

---

## 3. 差分検出アルゴリズム

### 問題

単純なindex比較では文の挿入・削除で全後続文が「変更」と判定される。

```
before: ["文A.", "文B.", "文C."]
after:  ["文A.", "文NEW.", "文B.", "文C."]

index比較 → index1: "文B."→"文NEW.", index2: "文C."→"文B.", index3: 新規"文C."
            ❌ 3文が変更扱い（実際は1文追加だけ）
```

### 解法: ハッシュベースのマッチング

```typescript
function detectChanges(
  prev: string[],
  curr: string[],
): { added: number[]; removed: number[]; modified: number[] } {
  const prevSet = new Map<string, number[]>();  // hash → indices
  const currSet = new Map<string, number[]>();

  // 1. 各文のハッシュを計算し、完全一致を対応づけ
  // 2. 対応がつかなかった curr の文 → added or modified
  // 3. 対応がつかなかった prev の文 → removed
  // 4. modified = 位置は近いが内容が変わったもの（編集距離で判定）
}
```

結果:
```
before: ["文A.", "文B.", "文C."]
after:  ["文A.", "文NEW.", "文B.", "文C."]

→ added: [1] ("文NEW.")  ← この1文だけ翻訳APIに投げる
→ removed: []
→ modified: []
```

---

## 4. ペースト時の一括処理

大量テキストのペースト時は多数の文が一度に追加される。

```
ペーストされたテキスト → 文分割 → 20文
         │
         ▼
  並列リクエスト (concurrency: 5)
  Promise.allSettled([
    translateSentence(文1),
    translateSentence(文2),  ← キャッシュHITなら即返却
    translateSentence(文3),
    ...
  ])
         │
         ▼
  完了した文から順次右パネルに反映
  進捗: "翻訳中... 15/20文完了"
```

---

## 5. プロバイダ切り替え時の動作

### ユーザーが設定画面でプロバイダを変更した場合

```
DeepL → Gemini に切り替え
         │
         ▼
  現在の document_sentences をすべて再翻訳？
         │
    ┌────┴────┐
    即座に      遅延
    │           │
    全文再翻訳    次に編集した文から
    (API費用大)   新プロバイダで翻訳
                 (既存文はDeepL翻訳のまま)
```

**推奨: 遅延方式**
- 切り替え直後は何もしない
- ユーザーが文を編集したとき、その文だけ新プロバイダで翻訳
- 「全文を再翻訳」ボタンをUIに設置（任意実行）
- `document_sentences.provider` で各文がどのプロバイダで翻訳されたか追跡可能

### キャッシュの扱い

- 旧プロバイダのキャッシュは削除しない
- 将来DeepLに戻したとき、キャッシュがそのまま使える
- `sentence_translations` のUNIQUEキーに `provider` が含まれるため衝突しない

---

## 6. 環境変数

```env
# DeepL
DEEPL_API_KEY=...
DEEPL_API_URL=https://api-free.deepl.com  # or https://api.deepl.com (Pro)

# Gemini (既存)
GEMINI_API_KEY=...

# OpenAI (将来用)
OPENAI_API_KEY=...
```

未設定のプロバイダはファクトリで `Error: DEEPL_API_KEY is not configured` を返す。
UI側では設定済みのプロバイダのみ選択可能にする。
