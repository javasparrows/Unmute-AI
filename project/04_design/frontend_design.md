# フロントエンド設計

## レイアウト

- ヘッダー: タイトル、翻訳ステータス、構成チェック・履歴・設定ボタン
- 言語バー: 左言語セレクター、入れ替えボタン、右言語セレクター、ジャーナルセレクター、クリアボタン
- エディタ領域: 左右2パネル構成（原文 / 翻訳）

## エディタパネル

- `<textarea>` + ミラーDiv（段落ハイライト用）
- textarea は `bg-transparent` で背面のミラーDivのハイライトが見える
- IME対応: `onCompositionStart` / `onCompositionEnd` で日本語入力を制御

## カーソル連動（段落レベル）

- 二重改行(`\n\n`)で段落分割
- カーソル位置から段落インデックスを算出
- 対応する段落をパープル色でハイライト
- スクロール位置も同期

## コスト表示 (ヘッダー)

ヘッダーの TranslationStatus の右に Separator を挟んで配置。

- **DeepL**: Progress バー (w-20, h-1.5) + パーセンテージ表示
  - 無料枠: 500,000文字/月
  - 計算: `(characters / 500_000) * 100`
  - Tooltip: 現在の文字数 / 上限、月次リセット説明
- **Gemini**: 推定コスト (USD) をテキスト表示
  - Input: $0.075 / 1M tokens
  - Output: $0.30 / 1M tokens
  - 計算: `(inputTokens / 1M) * 0.075 + (outputTokens / 1M) * 0.30`
  - Tooltip: トークン数内訳、レート表示
- データは localStorage (`translation-costs`) に永続化、月次自動リセット

## プロバイダセレクター (言語バー)

JournalSelector の右に Separator を挟んで配置。

- shadcn/ui Select コンポーネント (w-[130px], h-8)
- 選択肢: DeepL / Gemini
- localStorage (`translation-provider`) に永続化
- 切り替え時: 全文再翻訳を実行

## デザイン

### AstroVista カラーテーマ

OKLCH色空間を使用したカスタムカラーテーマ。

#### Light モード
| CSS変数 | 値 | 用途 |
|---|---|---|
| `--background` | `oklch(0.98 0.005 280)` | 背景 |
| `--foreground` | `oklch(0.15 0.02 280)` | テキスト |
| `--primary` | `oklch(0.55 0.18 280)` | アクセント |
| `--card` | `oklch(0.99 0.003 280)` | カード背景 |
| `--muted` | `oklch(0.94 0.01 280)` | ミュート背景 |

#### Dark モード
| CSS変数 | 値 | 用途 |
|---|---|---|
| `--background` | `oklch(0.13 0.02 280)` | 背景 |
| `--foreground` | `oklch(0.93 0.01 280)` | テキスト |
| `--primary` | `oklch(0.70 0.15 280)` | アクセント |
| `--card` | `oklch(0.16 0.02 280)` | カード背景 |
| `--muted` | `oklch(0.22 0.02 280)` | ミュート背景 |

### フォント設定

```css
--font-heading: 'Outfit', sans-serif;       /* 見出し */
--font-body: 'Merriweather', serif;         /* 本文 */
--font-mono: 'Fira Code', monospace;        /* コード */
```

### 基本方針

- shadcn/ui コンポーネント使用
- UIは基本的に日本語
