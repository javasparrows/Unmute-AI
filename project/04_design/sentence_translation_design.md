# 文単位翻訳設計

## 概要

テキスト全体を毎回翻訳APIに投げるのではなく、**変更があった文だけ**を翻訳して差し替える。
翻訳後に **文アラインメントAPI** でソース↔ターゲットの対応関係を取得し、ハイライト同期に使用する。
翻訳プロバイダはStrategy Patternで抽象化し、DeepL / Gemini を設定で切り替え可能にする。

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

### 各プロバイダの特性

| | DeepL | Gemini |
|---|---|---|
| API | REST (translate/v2) | Vercel AI SDK |
| context対応 | `context` パラメータ (前文のみ) | プロンプトで自由に渡せる |
| journal style | 非対応 (プレーン翻訳のみ) | プロンプトにstyleGuide注入 |
| 出力安定性 | 高 (決定的) | 中 (LLM特有のゆらぎ) |
| レイテンシ | ~100ms | ~500ms |
| コスト | 文字数課金 (無料枠50万字/月) | トークン課金 |

---

## 2. 全体フロー（手動同期 + 並列翻訳 + アラインメント）

### シーケンス

```
 ユーザーがパネルを編集（テキスト保存のみ）
         │
         ▼
 ユーザーが同期ボタン（→ or ←）を押下
         │
         ▼
 ① 文分割 + スナップショット差分検出 (フロントエンド)
    前回同期時のスナップショット vs 現在のテキストを比較
    → changedIndices[] を算出
    → 変更がなければ処理終了
         │
         ▼
 ② 並列翻訳 (サーバーサイド, 最大4並列)
    変更文をチャンク分割 → Promise.all で並列API呼び出し
    → チャンク順に結合して翻訳結果を復元
         │
         ▼
 ③ ターゲットテキスト構築 (フロントエンド)
    翻訳結果 + 未変更文 → 完全なターゲットテキストを組み立て
         │
         ▼
 ④ 文アラインメント (サーバーサイド)
    POST /api/align-sentences
    ソース全文 vs ターゲット全文 → N:M対応マップを取得
         │
         ▼
 ⑤ 結果反映 (フロントエンド)
    ターゲットパネルにテキスト設定
    アラインメントマップを保存 → ハイライト同期に使用
    スナップショットを更新
```

---

## 3. 並列翻訳アルゴリズム

### 問題

文が多い場合（20文以上）、1回のAPI呼び出しではレイテンシが大きい。

### 解法: チャンク分割 + 順序保証付き並列実行

**核心のアイデア**: 配列をチャンクに分割し、各チャンクを並列でAPIに投げる。
結果は `Promise.all` の返り値が入力順を保証するため、`flat()` するだけで元の順序が復元される。

```typescript
const MAX_CONCURRENCY = 4;

function splitIntoChunks<T>(arr: T[], numChunks: number): T[][] {
  const chunks: T[][] = [];
  const chunkSize = Math.ceil(arr.length / numChunks);
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

async function translateParallel(
  sentences: string[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  provider: TranslationProvider,
  journal?: string,
): Promise<{ translations: string[]; usage: TranslationUsage }> {
  const numChunks = Math.min(MAX_CONCURRENCY, sentences.length);
  const chunks = splitIntoChunks(sentences, numChunks);

  // Promise.all は入力配列の順序を保証する
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetch("/api/translate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentences: chunk,
          sourceLang,
          targetLang,
          provider,
          journal,
        }),
      }).then((res) => res.json() as Promise<SentenceTranslationResponse>)
    )
  );

  // チャンク順に flat() → 元の文順序が完全に復元される
  const translations = results.flatMap((r) => r.translations);
  const usage = mergeUsage(results.map((r) => r.usage));

  return { translations, usage };
}
```

### 順序保証の証明

```
入力:  [S0, S1, S2, S3, S4, S5, S6, S7]  (8文)

分割:  chunk0 = [S0, S1]    → translate → [T0, T1]
       chunk1 = [S2, S3]    → translate → [T2, T3]
       chunk2 = [S4, S5]    → translate → [T4, T5]
       chunk3 = [S6, S7]    → translate → [T6, T7]

Promise.all 結果: [result0, result1, result2, result3]
                   (入力順を保証)

flatMap:  [T0, T1, T2, T3, T4, T5, T6, T7]
           ↕   ↕   ↕   ↕   ↕   ↕   ↕   ↕
          [S0, S1, S2, S3, S4, S5, S6, S7]

∴ translations[i] は必ず sentences[i] の翻訳
```

これは `Promise.all` の仕様 (ES2015) と `Array.prototype.flatMap` の仕様により数学的に保証される。
各チャンク内でも既存の `/api/translate-sentence` が入力順を保持するため、全体で順序が崩れることはない。

### 少数文の場合

- 1〜4文: チャンク数 = 文数 → 各チャンク1文ずつ、並列数 = 文数
- 5〜8文: チャンク数 = 4 → 各チャンク2文ずつ
- 9〜12文: チャンク数 = 4 → 各チャンク3文ずつ
- 以降同様

---

## 4. 文アラインメント

### 概要

翻訳後、ソース文リストとターゲット文リストのN:M対応関係を取得する。
これにより、翻訳で文の統合・分割が発生してもハイライトが正しく動作する。

### API endpoint

```
POST /api/align-sentences

Request:
{
  "sourceSentences": ["原文1。", "原文2。原文3。"],
  "targetSentences": ["Translation 1.", "Translations 2 and 3."],
  "sourceLang": "ja",
  "targetLang": "en"
}

Response:
{
  "alignment": [
    { "source": [0], "target": [0] },
    { "source": [1, 2], "target": [1] }
  ]
}
```

### アラインメントの制約と保証

1. **全カバー**: ソースの全インデックスとターゲットの全インデックスがそれぞれ1つ以上のペアに出現する
2. **重複なし**: 各インデックスは1つのペアにのみ属する
3. **順序保持**: ペアは出現順にソートされている（交差しない）

### LLMプロンプト

```typescript
function buildAlignmentPrompt(
  sourceSentences: string[],
  targetSentences: string[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
): { system: string; user: string } {
  const system = `You are an expert bilingual linguist.
Given a list of source sentences and their translations, determine the alignment between them.

RULES:
1. Each source sentence maps to one or more target sentences, and vice versa.
2. Every source index and every target index must appear in exactly one alignment pair.
3. Pairs must be in order (no crossing alignments).
4. Output ONLY a valid JSON array. No markdown fences, no extra text.

Output format: [{"source": [0], "target": [0]}, {"source": [1,2], "target": [1]}, ...]`;

  const user = JSON.stringify({
    sourceLang,
    targetLang,
    source: sourceSentences.map((s, i) => ({ index: i, text: s })),
    target: targetSentences.map((s, i) => ({ index: i, text: s })),
  });

  return { system, user };
}
```

### バリデーション

LLMの出力は必ずバリデーションする:

```typescript
function validateAlignment(
  alignment: SentenceAlignment[],
  sourceCount: number,
  targetCount: number,
): boolean {
  const seenSource = new Set<number>();
  const seenTarget = new Set<number>();

  for (const pair of alignment) {
    for (const s of pair.source) {
      if (s < 0 || s >= sourceCount || seenSource.has(s)) return false;
      seenSource.add(s);
    }
    for (const t of pair.target) {
      if (t < 0 || t >= targetCount || seenTarget.has(t)) return false;
      seenTarget.add(t);
    }
  }

  return seenSource.size === sourceCount && seenTarget.size === targetCount;
}
```

バリデーション失敗時のフォールバック: 位置ベースの1:1マッピング（従来動作）。

### フロントエンド側のアラインメントマップ

```typescript
interface SentenceAlignment {
  source: number[];
  target: number[];
}

interface AlignmentMap {
  pairs: SentenceAlignment[];
  sourceToTarget: Map<number, number[]>;  // source idx → target indices
  targetToSource: Map<number, number[]>;  // target idx → source indices
}

function buildAlignmentMap(pairs: SentenceAlignment[]): AlignmentMap {
  const sourceToTarget = new Map<number, number[]>();
  const targetToSource = new Map<number, number[]>();

  for (const pair of pairs) {
    for (const s of pair.source) {
      sourceToTarget.set(s, pair.target);
    }
    for (const t of pair.target) {
      targetToSource.set(t, pair.source);
    }
  }

  return { pairs, sourceToTarget, targetToSource };
}
```

---

## 5. ハイライト同期（アラインメントベース）

### 従来の問題

```
原文:   [S0, S1, S2, S3, S4]
翻訳:   [T0, T1+T2, T3, T4]  ← S1とS2が1文に統合

位置ベース: クリックT1 → ハイライトS1 ❌ (S1+S2がT1に対応)
```

### 新しいフロー

```
原文:   [S0, S1, S2, S3, S4]
翻訳:   [T0, T1+T2, T3, T4]

alignment: [
  {source:[0], target:[0]},
  {source:[1,2], target:[1]},    ← S1+S2 が T1 に統合
  {source:[3], target:[2]},
  {source:[4], target:[3]}
]

クリック T1 → targetToSource.get(1) = [1, 2]
          → 原文パネルで S1 と S2 をハイライト ✓
```

### 状態管理の変更

```typescript
// 従来: 単一インデックスを両パネルで共有
activeSentenceIndex: number | null;

// 新: パネルごとに複数インデックス
interface HighlightState {
  leftIndices: number[];
  rightIndices: number[];
}
```

クリック時の処理:
```typescript
// 左パネルでクリック → sourceIndex を取得
function onLeftSentenceClick(sourceIndex: number) {
  const targetIndices = alignmentMap.sourceToTarget.get(sourceIndex) ?? [sourceIndex];
  setHighlight({
    leftIndices: [sourceIndex],
    rightIndices: targetIndices,
  });
}

// 右パネルでクリック → targetIndex を取得
function onRightSentenceClick(targetIndex: number) {
  const sourceIndices = alignmentMap.targetToSource.get(targetIndex) ?? [targetIndex];
  setHighlight({
    leftIndices: sourceIndices,
    rightIndices: [targetIndex],
  });
}
```

### ProseMirror Decoration の変更

`buildDecorations` を複数インデックス対応に拡張:

```typescript
function buildDecorations(
  doc: ProseMirrorNode,
  sentenceIndices: number[],  // 従来: sentenceIndex: number
  className: string,
  externalRanges: SentenceRange[] | null,
): DecorationSet {
  const decorations: Decoration[] = [];
  for (const idx of sentenceIndices) {
    // idx に対応するレンジを取得して Decoration.inline を生成
  }
  return DecorationSet.create(doc, decorations);
}
```

---

## 6. 同期フローの全体像（タイミング図）

```
同期ボタン押下
  │
  ├─── ① 差分検出 (即時, フロントエンド)
  │    changedSentences = diff(snapshot, current)
  │
  ├─── ② 並列翻訳 (サーバー, ~200-800ms)
  │    ┌─ chunk0 → /api/translate-sentence ─┐
  │    ├─ chunk1 → /api/translate-sentence ─┤
  │    ├─ chunk2 → /api/translate-sentence ─┤  Promise.all
  │    └─ chunk3 → /api/translate-sentence ─┘
  │    translations = results.flatMap(r => r.translations)
  │
  ├─── ③ ターゲットテキスト構築 (即時, フロントエンド)
  │    未変更文 + 翻訳結果 → fullTargetText
  │    → ターゲットパネルに反映 (ユーザーはここで翻訳結果を見る)
  │
  ├─── ④ アラインメント取得 (サーバー, ~300-500ms)
  │    POST /api/align-sentences
  │    sourceSentences + targetSentences → alignment pairs
  │    → バリデーション → AlignmentMap 構築
  │    → ハイライト同期が有効になる
  │
  └─── ⑤ スナップショット更新
```

**ポイント**: ③の時点でテキストは表示されるため、④のアラインメント取得はユーザー体験をブロックしない。
アラインメント完了前にクリックされた場合は、フォールバックとして位置ベースの1:1マッピングを使用。

---

## 7. ペースト時の処理

ペースト時は言語自動検出のみ行い、翻訳は実行しない。

```
ペーストされたテキスト
         │
         ▼
  POST /api/detect-language → 言語検出
         │
         ▼
  言語セレクターを更新（必要に応じてスワップ）
         │
         ▼
  ユーザーが同期ボタンを押して翻訳を実行
```

---

## 8. プロバイダ切り替え時の動作

- 切り替え直後は何もしない（手動同期方式のため自動翻訳は発生しない）
- 次に同期ボタンを押したとき、スナップショットとの差分があれば新プロバイダで翻訳
- 全文を新プロバイダで翻訳したい場合は、クリア→ペースト→同期ボタンで対応

---

## 9. 環境変数

```env
# DeepL
DEEPL_API_KEY=...
DEEPL_API_URL=https://api-free.deepl.com  # or https://api.deepl.com (Pro)

# Gemini (既存)
GEMINI_API_KEY=...
```

---

## 10. コスト追跡

### localStorage スキーマ

```typescript
// key: "translation-costs"
interface TranslationCosts {
  deepl: { characters: number; lastReset: string };   // lastReset: "YYYY-MM"
  gemini: { inputTokens: number; outputTokens: number; lastReset: string };
}
```

### 月次リセット

- `getSnapshot()` 時に `lastReset` の月と現在月 (`YYYY-MM`) を比較
- 異なる場合、該当プロバイダのカウンターを `0` にリセットし `lastReset` を更新

### 料金計算

| | DeepL Free | Gemini 2.5 Flash Lite |
|---|---|---|
| 課金単位 | 文字数 | トークン数 |
| 無料枠 | 500,000文字/月 | なし (従量課金) |
| Input料金 | 無料枠内: ¥0 | $0.075 / 1M tokens |
| Output料金 | - | $0.30 / 1M tokens |
| 表示 | プログレスバー (使用率%) | 推定コスト ($) |

### 並列翻訳時のusage集約

```typescript
function mergeUsage(usages: (TranslationUsage | undefined)[]): TranslationUsage {
  // 同一プロバイダの場合、各フィールドを合算
  // characters, inputTokens, outputTokens をそれぞれ sum
}
```

### アラインメントAPIのコスト

アラインメントは常にGeminiを使用（言語理解が必要なため）。
翻訳プロバイダがDeepLの場合でも、アラインメント分のGeminiコストは別途発生する。
UIのコスト表示にアラインメント分も含める。

### API response `usage` フィールド

```typescript
interface SentenceTranslationResponse {
  translations: string[];
  usage?: {
    provider: "deepl" | "gemini";
    characters?: number;      // DeepL: 課金文字数
    inputTokens?: number;     // Gemini: 入力トークン数
    outputTokens?: number;    // Gemini: 出力トークン数
  };
}
```

## 11. 修正ファイル一覧

### 新規作成

| ファイル | 役割 |
|---|---|
| `src/app/api/align-sentences/route.ts` | 文アラインメントAPIエンドポイント |
| `src/lib/align-sentences.ts` | アラインメントプロンプト構築、バリデーション |

### 修正

| ファイル | 変更内容 |
|---|---|
| `src/hooks/use-sync-translation.ts` | 並列翻訳 + アラインメント取得を追加 |
| `src/hooks/use-sentence-sync.ts` | `activeSentenceIndex: number` → `leftIndices/rightIndices: number[]` |
| `src/extensions/highlight-sentence.ts` | `buildDecorations` を複数インデックス対応、`getSentenceIndexAtPosition` はそのまま |
| `src/components/editor/tiptap-editor.tsx` | `activeSentenceIndex` → `activeSentenceIndices: number[]` |
| `src/components/editor/editor-panel.tsx` | props変更に追従 |
| `src/components/editor/editor-page.tsx` | アラインメントマップ管理、ハイライト変換ロジック |
| `src/types/index.ts` | `SentenceAlignment`, `AlignmentMap` 型追加 |
| `src/lib/prompts.ts` | `buildAlignmentPrompt` 追加 |
