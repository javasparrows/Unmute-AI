# Unmute AI --- ガイド付き論文執筆ワークフロー設計書

Document ID: DD-GWS
Date: 2026-03-15
Status: Proposed
Scope: 論文執筆のフルジャーニーをガイドするナビゲーションシステム
Parent: DD-v2 (Detailed Design v2), Citation Auto-Pilot Design, Citation-Grounded UI/UX Design
Depends on: DD-v2-PL (Productivity Layer) --- DocumentMilestone, WritingSession, SubmissionPlan

---

## 1. 設計思想

### 1.1 パラダイムシフト: ツールからガイド付きジャーニーへ

従来の Unmute AI は「エディタ + 引用ツール + レビューツール」という**機能集合型**のプロダクトである。
研究者は各機能を自由に使えるが、**次に何をすべきか**は自分で判断する必要がある。

本設計は、この「自由だが迷いやすい」体験を**ガイド付きジャーニー**に変革する。
論文執筆の全工程を 7 つのフェーズ・27 のタスクに分解し、
研究者が常に以下の 4 つを把握できる状態を実現する:

1. **現在位置**: 「Phase 3, タスク 2/3」のように、今どこにいるか
2. **次のアクション**: 具体的に何をすればよいか
3. **残り工数**: プログレスバーと推定所要時間で、あとどれだけかかるか
4. **全体像**: 未着手タスクのプレビューで、この先何が待っているか

### 1.2 設計原則

1. **ガイドであって強制ではない**
   - フェーズの順序は推奨だが、任意のタスクにいつでもジャンプ可能
   - スキップは許可するが、警告表示で見落としを防ぐ
   - 「ガイドを非表示」オプションで上級者の自由度を確保

2. **一時的なオンボーディングではなく、永続的なナビゲーション層**
   - 初回だけ表示されるチュートリアルではない
   - 論文完成までの全工程を通じて常時表示される
   - ダッシュボードでも進捗状態を一覧表示

3. **既存機能との深い連携**
   - 新しい機能を追加するのではなく、既存機能を「正しい順序で」提示する
   - タスクをクリック → 対応する機能画面に遷移
   - 機能の利用状況からタスク完了を自動判定

4. **自動完了と手動完了の二段構え**
   - システムが検出可能な完了条件は自動判定
   - 定性的な判断はユーザーの手動完了を許容
   - 自動判定の根拠を透明に表示

### 1.3 既存設計との関係

本設計は以下の既存ドキュメントの上に構築される:

| 既存設計 | 本設計での活用 |
|---------|--------------|
| Citation-Grounded UI/UX | Write / Citations / Review の3タブ構造を維持 |
| Citation Auto-Pilot Design | Phase 5 のタスク 5.1 として組み込み |
| Detailed Design v2 (Evidence Mapping) | Phase 5 のタスク 5.2, 5.3, 5.4 として組み込み |
| Detailed Design v2 (Paragraph Flow Analysis) | Phase 6 のタスク 6.1 として組み込み |
| Detailed Design v2 (Guideline Compliance) | Phase 1.3, 3.3, 6.3 として組み込み |
| Detailed Design v2 (Evidence Export) | Phase 5.4, 7.2 として組み込み |
| Productivity Layer (Milestones) | ジャーニーのフェーズ完了をマイルストーンと連動 |
| Productivity Layer (WritingSession) | Phase 4 の執筆時間を自動記録 |
| Productivity Layer (SubmissionPlan) | Phase 7 のチェックリストと連動 |

---

## 2. ジャーニーフェーズ定義

### 2.0 フェーズ一覧

```
Phase 1: 準備 (Preparation)          --- 3 タスク  推定 1-2 時間
Phase 2: 文献調査 (Literature Review) --- 4 タスク  推定 8-16 時間
Phase 3: 構成設計 (Structure Design)  --- 3 タスク  推定 2-4 時間
Phase 4: 執筆 (Writing)              --- 5 タスク  推定 40-80 時間
Phase 5: 引用・エビデンス検証         --- 4 タスク  推定 4-8 時間
Phase 6: レビュー & 推敲             --- 4 タスク  推定 4-8 時間
Phase 7: 投稿準備 (Submission)        --- 4 タスク  推定 2-4 時間
                                       合計 27 タスク  推定 61-122 時間
```

### 2.1 Phase 1: 準備 (Preparation)

論文執筆の出発点。研究テーマの定義、ターゲットジャーナルの選定、
適用すべきガイドラインの確認を行う。

#### タスク 1.1: 研究トピック・タイトルの定義

| 項目 | 内容 |
|------|------|
| タスクID | `1.1` |
| タスク名 | 研究トピック・タイトルの定義 |
| 説明 | 論文の仮タイトルと研究トピックを設定する。Start New Paper ウィザードで入力する。タイトルは後から変更可能だが、初期設定が以降のフェーズ（検索クエリ生成、ガイドライン推奨等）の精度に影響する。 |
| 完了条件 | `Document.title` が「無題の翻訳」以外に設定されている |
| 自動判定ロジック | `document.title !== "無題の翻訳" && document.title.trim().length > 0` |
| 対応プロダクト機能 | Start New Paper ダイアログ (`start-paper-dialog.tsx`) |
| 推定所要時間 | 5 分 |
| 前提タスク | なし |

#### タスク 1.2: ターゲットジャーナルの選定

| 項目 | 内容 |
|------|------|
| タスクID | `1.2` |
| タスク名 | ターゲットジャーナルの選定 |
| 説明 | 投稿先ジャーナルを選択し、投稿要件（文字数制限、参考文献形式、図表数等）を確認する。ジャーナル選択により、構成テンプレート、引用スタイル、ガイドライン推奨が変わる。 |
| 完了条件 | `DocumentVersion.journal` が `"general"` 以外に設定されている |
| 自動判定ロジック | `latestVersion.journal !== null && latestVersion.journal !== "general"` |
| 対応プロダクト機能 | Start New Paper ダイアログ (ジャーナルセレクター)、SubmissionPlan (Productivity Layer) |
| 推定所要時間 | 15 分 |
| 前提タスク | `1.1` |

#### タスク 1.3: ガイドラインの確認

| 項目 | 内容 |
|------|------|
| タスクID | `1.3` |
| タスク名 | 研究デザインに応じたガイドラインの選択 |
| 説明 | 研究デザイン（RCT、観察研究、AI/ML 研究等）に応じた報告ガイドライン（CONSORT-AI, TRIPOD+AI, STARD-AI, CLAIM, GAMER 等）を選択する。ガイドラインは Phase 3（構成設計）と Phase 6（最終チェック）で準拠確認に使用される。 |
| 完了条件 | ジャーニーメタデータに `selectedGuidelines` が 1 つ以上設定されている、または「ガイドライン不要」が明示的に選択されている |
| 自動判定ロジック | `journey.metadata.selectedGuidelines.length > 0 \|\| journey.metadata.guidelineNotApplicable === true` |
| 対応プロダクト機能 | Guideline Compliance Checker (v2)、新規: ガイドライン選択 UI |
| 推定所要時間 | 10 分 |
| 前提タスク | `1.1` |

---

### 2.2 Phase 2: 文献調査 (Literature Review)

既存研究の調査と引用候補の構築。Unmute AI の Evidence Search 機能と
連携し、論文候補の発見 → 実在確認 → エビデンス抽出 → ギャップ分析を行う。

#### タスク 2.1: 関連論文の検索

| 項目 | 内容 |
|------|------|
| タスクID | `2.1` |
| タスク名 | 関連論文の検索 |
| 説明 | Evidence Search で研究トピックに関連する候補論文を発見する。OpenAlex, Semantic Scholar, Crossref, PubMed 等の複数プロバイダを横断検索し、候補リストを構築する。最低 5 件の候補を発見することを推奨。 |
| 完了条件 | `ManuscriptCitation` が 5 件以上存在する |
| 自動判定ロジック | `manuscriptCitations.count >= 5` |
| 対応プロダクト機能 | Evidence Search (`evidence-search.tsx`), Discover API (`/api/evidence/discover`) |
| 推定所要時間 | 2-4 時間 |
| 前提タスク | `1.1` |

#### タスク 2.2: 引用候補の検証

| 項目 | 内容 |
|------|------|
| タスクID | `2.2` |
| タスク名 | 引用候補の実在確認 |
| 説明 | 発見した候補論文を DOI/PMID で実在確認する。Verify API で CanonicalPaper を作成し、EXISTS_VERIFIED 以上の状態にする。LLM が生成した架空の引用を排除するための重要なステップ。 |
| 完了条件 | 全 `ManuscriptCitation` に紐づく `CanonicalPaper` が `EXISTS_VERIFIED` 以上 |
| 自動判定ロジック | `manuscriptCitations.every(mc => mc.paper.verificationState >= "EXISTS_VERIFIED")` |
| 対応プロダクト機能 | Verify API (`/api/evidence/verify`), Evidence Library (`evidence-library.tsx`) |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `2.1` |

#### タスク 2.3: エビデンスの抽出

| 項目 | 内容 |
|------|------|
| タスクID | `2.3` |
| タスク名 | フルテキスト取得と ClaimCard 作成 |
| 説明 | 検証済み論文のフルテキストを取得し（PMC, arXiv, Unpaywall 等）、EvidenceSnippet と ClaimCard を作成する。フルテキストが取得できない場合はアブストラクトのみで ABSTRACT_ONLY ClaimCard を作成する。 |
| 完了条件 | 全 `ManuscriptCitation` に対して `ClaimCard` が 1 件以上存在する |
| 自動判定ロジック | `manuscriptCitations.every(mc => mc.paper.claimCards.length > 0)` |
| 対応プロダクト機能 | Extract API (`/api/evidence/extract`), Fulltext Resolver (`fulltext-resolver.ts`) |
| 推定所要時間 | 2-4 時間 |
| 前提タスク | `2.2` |

#### タスク 2.4: 先行研究のギャップ分析

| 項目 | 内容 |
|------|------|
| タスクID | `2.4` |
| タスク名 | Coverage Analysis で不足分野を特定 |
| 説明 | 現在の引用リストと研究トピックを照合し、カバーできていない分野・視点を特定する。ギャップが明確になることで、追加の文献調査を効率化し、Introduction でのギャップ記述を具体化できる。 |
| 完了条件 | Coverage Analysis が 1 回以上実行済み |
| 自動判定ロジック | `agentRuns.some(r => r.agentType === "coverage" && r.status === "completed")` |
| 対応プロダクト機能 | Coverage API (`/api/evidence/coverage`), Gap Analysis Panel |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `2.3` |

---

### 2.3 Phase 3: 構成設計 (Structure Design)

論文の骨格を設計する。IMRaD 構造の設定、各セクションの段落構成、
ガイドライン準拠の事前チェックを行う。

#### タスク 3.1: アウトライン作成

| 項目 | 内容 |
|------|------|
| タスクID | `3.1` |
| タスク名 | IMRaD セクション構造の設定 |
| 説明 | Introduction, Methods, Results, Discussion（+ Abstract, References）のセクション構造を設定する。ジャーナルテンプレートに基づくデフォルト構造を提供し、カスタマイズ可能にする。 |
| 完了条件 | `DocumentVersion.sections` に 4 セクション以上が定義されている |
| 自動判定ロジック | `latestVersion.sections !== null && Object.keys(latestVersion.sections).length >= 4` |
| 対応プロダクト機能 | Section Rail (Citation-Grounded UI/UX), セクション設定 UI |
| 推定所要時間 | 30 分 |
| 前提タスク | `1.2` |

#### タスク 3.2: 各セクションの段落構成

| 項目 | 内容 |
|------|------|
| タスクID | `3.2` |
| タスク名 | 段落の役割設計 |
| 説明 | 各セクション内の段落に役割を割り当てる。例: Introduction の場合、背景 → 課題提示 → 先行研究 → ギャップ指摘 → 本研究の位置づけ。段落の役割が明確になることで、執筆時に各段落で「何を書けばよいか」が明確になる。 |
| 完了条件 | ユーザーが手動で「段落構成設計済み」とマーク、または各セクションに段落アウトラインメモが存在 |
| 自動判定ロジック | `journey.taskStatuses["3.2"].manuallyCompleted === true` (手動完了のみ) |
| 対応プロダクト機能 | 新規: 段落アウトラインエディタ（Phase 3 専用の軽量 UI） |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `3.1` |

#### タスク 3.3: ガイドライン準拠の事前チェック

| 項目 | 内容 |
|------|------|
| タスクID | `3.3` |
| タスク名 | テンプレートに基づく構成確認 |
| 説明 | Phase 1.3 で選択したガイドラインに基づき、構成が必要な項目をすべてカバーしているか事前チェックする。例: CONSORT-AI であれば、AI 介入の記述セクション、データセットの記述セクション等が構成に含まれているか確認。 |
| 完了条件 | ガイドラインチェックが実行済みで、BLOCKER 級の不足がない |
| 自動判定ロジック | `journey.metadata.guidelineNotApplicable === true \|\| (complianceRun.status === "completed" && complianceRun.output.blockers === 0)` |
| 対応プロダクト機能 | Guideline Compliance Checker (v2) |
| 推定所要時間 | 30 分 |
| 前提タスク | `1.3`, `3.1` |

---

### 2.4 Phase 4: 執筆 (Writing)

論文の本文を執筆する。最も時間のかかるフェーズであり、
各セクションを順番に執筆していく。Abstract は全体完成後に最後に書く。

#### タスク 4.1: Introduction 執筆

| 項目 | 内容 |
|------|------|
| タスクID | `4.1` |
| タスク名 | Introduction の執筆 |
| 説明 | 背景 → 課題提示 → 先行研究のレビュー → 研究ギャップの指摘 → 本研究の位置づけ・目的の順で記述する。Phase 2 で収集した ClaimCard とギャップ分析結果を参照しながら書く。 |
| 完了条件 | Introduction セクションの翻訳テキストが 500 文字以上 |
| 自動判定ロジック | `extractSectionText(latestVersion.translatedText, "INTRODUCTION").length >= 500` |
| 対応プロダクト機能 | TipTap Editor, Grounded Writer (`grounded-writer.ts`), AI-Assisted Section Writing |
| 推定所要時間 | 8-16 時間 |
| 前提タスク | `2.4`, `3.2` |

#### タスク 4.2: Methods 執筆

| 項目 | 内容 |
|------|------|
| タスクID | `4.2` |
| タスク名 | Methods の執筆 |
| 説明 | データセット・対象者の記述、手法・アルゴリズムの説明、評価指標の定義を記述する。再現性を重視し、具体的な数値とパラメータを含める。 |
| 完了条件 | Methods セクションの翻訳テキストが 500 文字以上 |
| 自動判定ロジック | `extractSectionText(latestVersion.translatedText, "METHODS").length >= 500` |
| 対応プロダクト機能 | TipTap Editor, Section Rail |
| 推定所要時間 | 8-16 時間 |
| 前提タスク | `3.2` |

#### タスク 4.3: Results 執筆

| 項目 | 内容 |
|------|------|
| タスクID | `4.3` |
| タスク名 | Results の執筆 |
| 説明 | 実験結果・解析結果を記述する。図表への参照を含め、定量的な結果を客観的に報告する。解釈は Discussion に委ねる。 |
| 完了条件 | Results セクションの翻訳テキストが 300 文字以上 |
| 自動判定ロジック | `extractSectionText(latestVersion.translatedText, "RESULTS").length >= 300` |
| 対応プロダクト機能 | TipTap Editor, Section Rail |
| 推定所要時間 | 8-16 時間 |
| 前提タスク | `3.2` |

#### タスク 4.4: Discussion 執筆

| 項目 | 内容 |
|------|------|
| タスクID | `4.4` |
| タスク名 | Discussion の執筆 |
| 説明 | 結果の解釈 → 先行研究との比較 → 研究の限界 → 研究の貢献・意義の順で記述する。Phase 2 の ClaimCard を参照し、先行研究との比較を具体的に行う。 |
| 完了条件 | Discussion セクションの翻訳テキストが 500 文字以上 |
| 自動判定ロジック | `extractSectionText(latestVersion.translatedText, "DISCUSSION").length >= 500` |
| 対応プロダクト機能 | TipTap Editor, Grounded Writer, Section Rail |
| 推定所要時間 | 8-16 時間 |
| 前提タスク | `4.3` |

#### タスク 4.5: Abstract 執筆

| 項目 | 内容 |
|------|------|
| タスクID | `4.5` |
| タスク名 | Abstract の執筆 |
| 説明 | 全セクション完成後に、全体のサマリーとして Abstract を書く。背景・目的・方法・結果・結論を簡潔にまとめる。ジャーナルの文字数制限に準拠する。 |
| 完了条件 | Abstract セクションの翻訳テキストが 100 文字以上 |
| 自動判定ロジック | `extractSectionText(latestVersion.translatedText, "ABSTRACT").length >= 100` |
| 対応プロダクト機能 | TipTap Editor, Section Rail |
| 推定所要時間 | 2-4 時間 |
| 前提タスク | `4.1`, `4.2`, `4.3`, `4.4` |

---

### 2.5 Phase 5: 引用・エビデンス検証 (Citations & Evidence)

執筆した原稿に対して、文単位で引用を挿入・検証・承認する。
Citation Auto-Pilot と Evidence Mapping System を活用する。

#### タスク 5.1: Citation Auto-Pilot

| 項目 | 内容 |
|------|------|
| タスクID | `5.1` |
| タスク名 | 文ごとの引用候補提示と挿入 |
| 説明 | Citation Auto-Pilot を実行し、原稿中の引用が必要な文に対して候補論文を提示、ワンクリックで `\cite{key}` を挿入する。Auto-Pilot は analyze → suggest → accept のフローで各文を順番に処理する。 |
| 完了条件 | Auto-Pilot が少なくとも 1 回完了（全文処理またはスキップ済み） |
| 自動判定ロジック | `agentRuns.some(r => r.agentType === "autopilot" && r.status === "completed")` |
| 対応プロダクト機能 | Citation Auto-Pilot (全体), Auto-Pilot Panel, Evidence Drawer |
| 推定所要時間 | 1-3 時間 |
| 前提タスク | `4.1` (少なくとも 1 セクション執筆済み) |

#### タスク 5.2: エビデンスマッピング

| 項目 | 内容 |
|------|------|
| タスクID | `5.2` |
| タスク名 | 各引用の根拠箇所を特定 |
| 説明 | 各 ManuscriptCitation に対して EvidenceMapping を作成する。原稿中の主張文と引用論文中の根拠箇所を対応づけ、PDF スクリーンショット付きのエビデンスチェーンを構築する。 |
| 完了条件 | 全 `ManuscriptCitation` に対して `EvidenceMapping` が 1 件以上存在する |
| 自動判定ロジック | `manuscriptCitations.every(mc => mc.evidenceMappings.length > 0)` |
| 対応プロダクト機能 | Evidence Mapping System (v2), Passage Matcher (`passage-matcher.ts`) |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `5.1` |

#### タスク 5.3: Human Verification

| 項目 | 内容 |
|------|------|
| タスクID | `5.3` |
| タスク名 | 人間の目で検証・承認 |
| 説明 | 全 EvidenceMapping を人間がレビューし、承認する。AI が生成したマッピングが正確か、引用箇所が実際に主張を支持しているかを確認する。医学 AI 研究など、エビデンスの正確性が特に重要な分野では必須のステップ。 |
| 完了条件 | 全 `EvidenceMapping` が `humanVerified = true` |
| 自動判定ロジック | `evidenceMappings.every(em => em.humanVerified === true)` |
| 対応プロダクト機能 | Evidence Mapping Verification UI, Review Center (`/documents/[id]/review`) |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `5.2` |

#### タスク 5.4: エビデンスレポート作成

| 項目 | 内容 |
|------|------|
| タスクID | `5.4` |
| タスク名 | PPTX エビデンスエクスポート |
| 説明 | 検証済みのエビデンスチェーン（原稿文 → 引用論文 → 根拠箇所 → スクリーンショット）を PowerPoint スライドにエクスポートする。指導教員のレビュー、倫理委員会への提出、監査証跡として使用する。 |
| 完了条件 | Evidence PPTX エクスポートが 1 回以上実行済み |
| 自動判定ロジック | `journey.metadata.evidencePptxExported === true` |
| 対応プロダクト機能 | Evidence Export (`render-evidence-pptx.ts`), Export Dialog (`export-dialog.tsx`) |
| 推定所要時間 | 15 分 |
| 前提タスク | `5.3` |

---

### 2.6 Phase 6: レビュー & 推敲 (Review & Polish)

原稿の品質を最終チェックする。論理的フロー分析、構成確認、
ガイドライン準拠チェック、AI による厳格な査読シミュレーションを行う。

#### タスク 6.1: 段落フロー分析

| 項目 | 内容 |
|------|------|
| タスクID | `6.1` |
| タスク名 | 論理的流れの検証 |
| 説明 | 各セクション内の段落の論理的フローを分析する。段落の役割（背景説明、データ提示、議論等）が適切な順序で配置されているか、論理的な飛躍がないかを検証する。 |
| 完了条件 | 全セクションに対して `ParagraphAnalysis` が実行済みで、overallScore が 60 以上 |
| 自動判定ロジック | `["INTRODUCTION","METHODS","RESULTS","DISCUSSION"].every(s => paragraphAnalyses.some(pa => pa.sectionType === s && pa.overallScore >= 60))` |
| 対応プロダクト機能 | Paragraph Flow Analysis (v2), Flow Analyze API (`/api/evidence/flow/analyze`) |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `4.5` |

#### タスク 6.2: 構成チェック

| 項目 | 内容 |
|------|------|
| タスクID | `6.2` |
| タスク名 | IMRaD 準拠の最終確認 |
| 説明 | 全セクションが IMRaD 構造に準拠しているか最終確認する。各セクションの長さのバランス、必須項目の記載漏れ、セクション間の整合性を検証する。 |
| 完了条件 | 構成チェックが実行済みで重大な問題がない |
| 自動判定ロジック | `journey.taskStatuses["6.2"].manuallyCompleted === true \|\| (structureCheck.status === "completed" && structureCheck.blockers === 0)` |
| 対応プロダクト機能 | Structure Check Dialog (`structure-check-dialog.tsx`) |
| 推定所要時間 | 30 分 |
| 前提タスク | `4.5` |

#### タスク 6.3: ガイドライン準拠の最終チェック

| 項目 | 内容 |
|------|------|
| タスクID | `6.3` |
| タスク名 | 全項目の充足確認 |
| 説明 | Phase 1.3 で選択したガイドライン（CONSORT-AI, TRIPOD+AI 等）の全チェック項目に対して、原稿が準拠しているか最終確認する。Phase 3.3 の事前チェックとは異なり、完成原稿に対する包括的な検証を行う。 |
| 完了条件 | ガイドラインチェックが実行済みで全項目がパス |
| 自動判定ロジック | `journey.metadata.guidelineNotApplicable === true \|\| (complianceFinalRun.status === "completed" && complianceFinalRun.output.failedItems === 0)` |
| 対応プロダクト機能 | Guideline Compliance Checker (v2) |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `4.5`, `1.3` |

#### タスク 6.4: Adversarial Review

| 項目 | 内容 |
|------|------|
| タスクID | `6.4` |
| タスク名 | AI による厳格な査読シミュレーション |
| 説明 | AI が査読者の視点で原稿を厳しく評価する。UNSUPPORTED（根拠なし主張）、MISATTRIBUTED（誤帰属）、MISSING_KEY_PAPER（重要論文の欠落）、LOGIC_GAP（論理的飛躍）、STYLE（表現の問題）を検出する。 |
| 完了条件 | Adversarial Review が実行済みで、全 BLOCKER 級の指摘が resolved |
| 自動判定ロジック | `reviewFindings.some(rf => true) && reviewFindings.filter(rf => rf.severity === "BLOCKER").every(rf => rf.resolved === true)` |
| 対応プロダクト機能 | Adversarial Review (`adversarial-review.ts`), Review Center, Review Finding List |
| 推定所要時間 | 2-4 時間 |
| 前提タスク | `5.3`, `6.1` |

---

### 2.7 Phase 7: 投稿準備 (Submission)

最終的なフォーマット調整、エクスポート、投稿チェックリストの確認を行う。

#### タスク 7.1: フォーマット調整

| 項目 | 内容 |
|------|------|
| タスクID | `7.1` |
| タスク名 | ジャーナルスタイルの適用 |
| 説明 | ターゲットジャーナルのスタイルガイドに合わせて原稿をフォーマットする。引用スタイル（APA, Vancouver, IEEE 等）、セクション見出し、図表キャプション形式などを調整する。 |
| 完了条件 | ユーザーが手動で「フォーマット完了」とマーク |
| 自動判定ロジック | `journey.taskStatuses["7.1"].manuallyCompleted === true` |
| 対応プロダクト機能 | Journal Selector, Export Settings |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `6.4` |

#### タスク 7.2: エクスポート

| 項目 | 内容 |
|------|------|
| タスクID | `7.2` |
| タスク名 | LaTeX (.tex + .bib) または Word (.docx) エクスポート |
| 説明 | 完成原稿をジャーナル投稿用の形式でエクスポートする。LaTeX の場合は .tex ファイルと .bib ファイルを生成、Word の場合は .docx ファイルを生成する。 |
| 完了条件 | LaTeX または DOCX エクスポートが 1 回以上実行済み |
| 自動判定ロジック | `journey.metadata.latexExported === true \|\| journey.metadata.docxExported === true` |
| 対応プロダクト機能 | Export Dialog (`export-dialog.tsx`), LaTeX Renderer (`render-latex.ts`), DOCX Renderer (`render-docx.ts`) |
| 推定所要時間 | 15 分 |
| 前提タスク | `7.1` |

#### タスク 7.3: 投稿チェックリスト

| 項目 | 内容 |
|------|------|
| タスクID | `7.3` |
| タスク名 | 共著者確認、利益相反、倫理審査番号等 |
| 説明 | 投稿前の最終チェックリストを確認する。共著者の承認、利益相反申告、倫理審査番号の記載、データ可用性声明、資金提供元の記載等を確認する。SubmissionPlan のチェックリストと連動。 |
| 完了条件 | `SubmissionPlan.submissionChecklist` の全項目が checked |
| 自動判定ロジック | `submissionPlan !== null && JSON.parse(submissionPlan.submissionChecklist).every(item => item.checked === true)` |
| 対応プロダクト機能 | Submission Plan (Productivity Layer), 投稿チェックリスト UI |
| 推定所要時間 | 1-2 時間 |
| 前提タスク | `7.2` |

#### タスク 7.4: 投稿

| 項目 | 内容 |
|------|------|
| タスクID | `7.4` |
| タスク名 | カバーレター準備と最終確認 |
| 説明 | カバーレターを準備し、最終確認を行う。AI にカバーレターのドラフトを生成させ、ジャーナルのスコープとの適合性、推薦査読者、利益相反のない査読者の除外等を記述する。 |
| 完了条件 | ユーザーが手動で「投稿完了」とマーク |
| 自動判定ロジック | `journey.taskStatuses["7.4"].manuallyCompleted === true` |
| 対応プロダクト機能 | 新規: カバーレター生成 UI |
| 推定所要時間 | 30 分 |
| 前提タスク | `7.3` |

---

## 3. データモデル

### 3.1 PaperJourney

Document と 1:1 で紐づくジャーニー状態管理テーブル。

```prisma
enum JourneyPhaseStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum JourneyTaskStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

model PaperJourney {
  id               String   @id @default(cuid())
  documentId       String   @unique
  document         Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  // Current position
  currentPhase     Int      @default(1)       // 1-7
  currentTaskId    String   @default("1.1")   // e.g., "3.2"

  // Phase statuses (JSON object: { "1": "completed", "2": "in_progress", ... })
  phaseStatuses    Json     @default("{\"1\":\"not_started\",\"2\":\"not_started\",\"3\":\"not_started\",\"4\":\"not_started\",\"5\":\"not_started\",\"6\":\"not_started\",\"7\":\"not_started\"}")

  // Task statuses (JSON object: { "1.1": "completed", "1.2": "in_progress", ... })
  taskStatuses     Json     @default("{}")

  // Journey metadata (selectedGuidelines, export flags, etc.)
  metadata         Json     @default("{}")

  // Visibility
  guideVisible     Boolean  @default(true)    // User can hide the guide

  // Timestamps
  startedAt        DateTime @default(now())
  lastActivityAt   DateTime @default(now())
  completedAt      DateTime?

  // Task completions (detailed records)
  taskCompletions  TaskCompletion[]

  @@index([documentId])
}
```

### 3.2 TaskCompletion

各タスクの完了記録。メタデータを含む詳細なログ。

```prisma
model TaskCompletion {
  id              String   @id @default(cuid())
  journeyId       String
  journey         PaperJourney @relation(fields: [journeyId], references: [id], onDelete: Cascade)

  taskId          String          // e.g., "2.1"
  status          JourneyTaskStatus @default(NOT_STARTED)

  // How it was completed
  autoCompleted   Boolean  @default(false)  // true = system auto-detected, false = user manually marked
  skipReason      String?  @db.Text         // Reason for skipping (if status = SKIPPED)

  // Snapshot at completion time
  metadata        Json     @default("{}")
  // Examples:
  //   Task 2.1: { "citationCount": 12 }
  //   Task 5.3: { "verifiedMappingCount": 8, "totalMappingCount": 8 }
  //   Task 6.4: { "blockerCount": 0, "majorCount": 2, "minorCount": 5 }

  // Timestamps
  startedAt       DateTime?
  completedAt     DateTime?
  skippedAt       DateTime?

  @@unique([journeyId, taskId])
  @@index([journeyId])
  @@index([journeyId, status])
}
```

### 3.3 既存モデルへのリレーション追加

```prisma
// Document model --- add relation
model Document {
  // ... existing fields ...
  paperJourney     PaperJourney?
}
```

### 3.4 JSON フィールドの型定義 (TypeScript)

```typescript
// Phase status map
interface PhaseStatusMap {
  [phaseNumber: string]: "not_started" | "in_progress" | "completed" | "skipped";
  // e.g., { "1": "completed", "2": "in_progress", "3": "not_started", ... }
}

// Task status map
interface TaskStatusMap {
  [taskId: string]: {
    status: "not_started" | "in_progress" | "completed" | "skipped";
    autoCompleted: boolean;
    manuallyCompleted: boolean;
    completedAt: string | null;    // ISO 8601
    skippedAt: string | null;      // ISO 8601
    skipReason: string | null;
  };
}

// Journey metadata
interface JourneyMetadata {
  // Phase 1
  selectedGuidelines: string[];         // e.g., ["CONSORT-AI", "TRIPOD+AI"]
  guidelineNotApplicable: boolean;

  // Phase 5
  evidencePptxExported: boolean;

  // Phase 7
  latexExported: boolean;
  docxExported: boolean;

  // User preferences
  customPhaseOrder: number[] | null;    // For future phase reordering
}

// Task completion metadata examples
interface TaskCompletionMetadata {
  // Task 2.1
  citationCount?: number;

  // Task 2.2
  verifiedPaperCount?: number;
  totalPaperCount?: number;

  // Task 5.2
  mappingCount?: number;

  // Task 5.3
  verifiedMappingCount?: number;
  totalMappingCount?: number;

  // Task 6.1
  averageFlowScore?: number;

  // Task 6.4
  blockerCount?: number;
  majorCount?: number;
  minorCount?: number;
  resolvedCount?: number;
}
```

---

## 4. 自動完了判定ロジック

### 4.1 判定エンジン

自動完了判定は `JourneyCompletionEngine` サービスが担当する。
このサービスは以下のタイミングで呼び出される:

1. **ページ読み込み時**: エディタまたはダッシュボードが開かれた際
2. **データ変更時**: 引用追加、テキスト更新、エクスポート実行等のイベント後
3. **定期ポーリング**: エディタアクティブ時、30 秒ごと

```typescript
// src/lib/journey/completion-engine.ts

interface CompletionCheckResult {
  taskId: string;
  completed: boolean;
  progress: number;     // 0.0 - 1.0
  detail: string;       // Human-readable status
}

class JourneyCompletionEngine {
  async checkAllTasks(documentId: string): Promise<CompletionCheckResult[]>;
  async checkTask(documentId: string, taskId: string): Promise<CompletionCheckResult>;
  async updateJourneyState(documentId: string): Promise<PaperJourney>;
}
```

### 4.2 全タスクの自動完了条件一覧

| タスクID | 自動判定 | 判定条件 | フォールバック |
|---------|---------|---------|-------------|
| 1.1 | 自動 | `title !== "無題の翻訳"` | --- |
| 1.2 | 自動 | `journal !== null && journal !== "general"` | --- |
| 1.3 | 自動 | `metadata.selectedGuidelines.length > 0 \|\| metadata.guidelineNotApplicable` | 手動 |
| 2.1 | 自動 | `manuscriptCitations.count >= 5` | 手動 (5件未満でも完了可) |
| 2.2 | 自動 | 全引用が verified | --- |
| 2.3 | 自動 | 全引用に ClaimCard あり | --- |
| 2.4 | 自動 | coverage AgentRun 完了 | 手動 |
| 3.1 | 自動 | sections に 4 セクション以上 | --- |
| 3.2 | 手動のみ | --- | 手動完了必須 |
| 3.3 | 自動 | compliance チェックで blocker 0 | 手動 / ガイドライン不要時 |
| 4.1 | 自動 | Introduction 500文字以上 | --- |
| 4.2 | 自動 | Methods 500文字以上 | --- |
| 4.3 | 自動 | Results 300文字以上 | --- |
| 4.4 | 自動 | Discussion 500文字以上 | --- |
| 4.5 | 自動 | Abstract 100文字以上 | --- |
| 5.1 | 自動 | autopilot AgentRun 完了 | 手動 |
| 5.2 | 自動 | 全引用に EvidenceMapping あり | --- |
| 5.3 | 自動 | 全 EvidenceMapping が humanVerified | --- |
| 5.4 | 自動 | metadata.evidencePptxExported | 手動 |
| 6.1 | 自動 | 全セクションで ParagraphAnalysis スコア 60+ | --- |
| 6.2 | 半自動 | structure check 完了 + blocker 0 | 手動 |
| 6.3 | 自動 | compliance 最終チェックで全パス | 手動 / ガイドライン不要時 |
| 6.4 | 自動 | 全 BLOCKER ReviewFinding が resolved | --- |
| 7.1 | 手動のみ | --- | 手動完了必須 |
| 7.2 | 自動 | latex or docx エクスポート実行済み | --- |
| 7.3 | 自動 | SubmissionPlan の全チェック項目 checked | --- |
| 7.4 | 手動のみ | --- | 手動完了必須 |

### 4.3 進捗計算ロジック

```typescript
// Phase progress: completed tasks / total tasks in phase
function calculatePhaseProgress(phase: number, taskStatuses: TaskStatusMap): number {
  const phaseTasks = JOURNEY_TASKS.filter(t => t.phase === phase);
  const completedCount = phaseTasks.filter(t =>
    taskStatuses[t.id]?.status === "completed"
  ).length;
  return completedCount / phaseTasks.length;
}

// Overall progress: completed tasks / total tasks
function calculateOverallProgress(taskStatuses: TaskStatusMap): number {
  const allTasks = JOURNEY_TASKS;
  const completedCount = allTasks.filter(t =>
    taskStatuses[t.id]?.status === "completed" ||
    taskStatuses[t.id]?.status === "skipped"
  ).length;
  return completedCount / allTasks.length;
}
```

---

## 5. UI 設計

### 5.1 ジャーニーナビゲーション（常時表示）

エディタのワークフロータブ（Write | Citations | Review）の上に配置する
水平プログレスバー。7 つのフェーズをドットで表示し、現在のフェーズとタスクを示す。

```
+============================================================================+
|  [<] Paper Title                            [Save] [Version] [Export] [User]|
|----------------------------------------------------------------------------|
|  [1]---[2]---[3]---[4]---[5]---[6]---[7]                                  |
|   *     *     *     O                         Phase 4: 執筆                |
|                         ^                     タスク 4.2: Methods 執筆     |
|                       現在地                   進捗: 12/27 タスク完了 (44%) |
|----------------------------------------------------------------------------|
|  Write  |  Citations  |  Review                                            |
|============================================================================|
|  Source Pane          |  Manuscript Pane       |  Evidence Drawer           |
|                       |                        |                            |
+============================================================================+

凡例:
  * = 完了 (filled dot)
  O = 進行中 (half-filled dot, pulsing)
  o = 未着手 (empty dot)
```

#### ナビゲーションバーの状態表示

```
最小表示（デフォルト）:
+------------------------------------------------------------------------+
| *--*--*--O--o--o--o  Phase 4: 執筆 / 4.2 Methods    進捗 44%  [展開 v] |
+------------------------------------------------------------------------+

展開表示（クリック時）:
+------------------------------------------------------------------------+
| Phase 4: 執筆 (Writing)                              進捗 2/5 タスク   |
|------------------------------------------------------------------------|
|  [x] 4.1 Introduction 執筆         完了 3/12 15:30                     |
|  [>] 4.2 Methods 執筆              進行中 --- 500文字以上で完了         |
|  [ ] 4.3 Results 執筆              未着手                               |
|  [ ] 4.4 Discussion 執筆           未着手                               |
|  [ ] 4.5 Abstract 執筆             未着手 (4.1-4.4 完了後)              |
|------------------------------------------------------------------------|
|  [< Phase 3]                                           [Phase 5 >]     |
+------------------------------------------------------------------------+
```

#### コンポーネント仕様

```typescript
// src/components/journey/journey-navigation-bar.tsx

interface JourneyNavigationBarProps {
  journey: PaperJourney;
  onTaskClick: (taskId: string) => void;
  onToggleExpand: () => void;
  expanded: boolean;
}

// Phase dot component
interface PhaseDotProps {
  phase: number;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  isCurrent: boolean;
  onClick: () => void;
}
```

### 5.2 フェーズ詳細パネル（展開時）

ナビゲーションバーを展開すると表示されるパネル。
現在のフェーズ内の全タスクをリスト表示する。

```
+------------------------------------------------------------------------+
|                                                                         |
|  Phase 5: 引用・エビデンス検証                                           |
|  ================================================                      |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  | [x] 5.1 Citation Auto-Pilot                          完了        |  |
|  |     文ごとの引用候補提示と挿入                                      |  |
|  |     完了: 2026-03-14 14:30  |  自動判定  |  23文中18文に引用挿入    |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  | [>] 5.2 エビデンスマッピング                          進行中      |  |
|  |     各引用の根拠箇所を特定                                          |  |
|  |     進捗: 12/18 マッピング完了 (67%)                                |  |
|  |     [=========>........]                                           |  |
|  |                                     [マッピングを続ける]            |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  | [ ] 5.3 Human Verification                            未着手      |  |
|  |     人間の目で検証・承認                                             |  |
|  |     前提: タスク 5.2 の完了                                        |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  | [ ] 5.4 エビデンスレポート作成                         未着手      |  |
|  |     PPTX エビデンスエクスポート                                     |  |
|  |     前提: タスク 5.3 の完了                                        |  |
|  |                                     [スキップ]                     |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
+------------------------------------------------------------------------+
```

#### タスクカードの状態バリエーション

```
完了タスク:
+------------------------------------------------------------------+
| [x] 2.1 関連論文の検索                                 完了       |
|     12 件の論文を検索 --- 3/10 14:30                              |
+------------------------------------------------------------------+

進行中タスク:
+------------------------------------------------------------------+
| [>] 4.2 Methods 執筆                                 進行中      |
|     [=====>................] 320/500 文字                         |
|     500文字以上で自動完了                                          |
|                                    [手動で完了にする]              |
+------------------------------------------------------------------+

スキップ済みタスク:
+------------------------------------------------------------------+
| [/] 1.3 ガイドラインの確認                            スキップ    |
|     スキップ理由: 本研究にはガイドライン不要                        |
|     ! Phase 6.3 で影響あり                                        |
|                                    [スキップを取消]               |
+------------------------------------------------------------------+

依存関係未解決タスク:
+------------------------------------------------------------------+
| [.] 4.5 Abstract 執筆                               ロック       |
|     前提未完了: 4.1, 4.3, 4.4                                     |
|     (タスク 4.1, 4.3, 4.4 を完了するとアンロック)                   |
+------------------------------------------------------------------+
```

### 5.3 次のアクション提示

ジャーニーの状態変化時に、コンテキストに応じた次のアクションを提示する。

#### 表示パターン

**フェーズ完了時 (トースト + バナー)**:
```
+------------------------------------------------------------------------+
|  Phase 3 完了！                                                  [x]   |
|  構成設計が完了しました。次は Phase 4: 執筆 に進みましょう。             |
|  最初のタスクは 4.1: Introduction 執筆 です。                          |
|                         [Phase 4 を開始]  [後で]                       |
+------------------------------------------------------------------------+
```

**タスク完了時 (インライン)**:
```
+------------------------------------------------------------------------+
|  タスク 2.1 完了: 12件の論文を検索しました                         [x]  |
|  次は 2.2: 引用候補の検証 です。DOI/PMID で実在確認しましょう。         |
|                         [検証を開始]                                    |
+------------------------------------------------------------------------+
```

**長時間未操作時 (ソフト通知)**:
```
+------------------------------------------------------------------------+
|  前回は Phase 4.2 (Methods) を作業中でした。                            |
|  Methods セクションは 320/500 文字です。続きを書きますか？               |
|                         [続ける]  [他のタスク]                          |
+------------------------------------------------------------------------+
```

**スキップ警告 (持続的バッジ)**:
```
+------------------------------------------------------------------------+
|  ! 注意: Phase 2 (文献調査) にスキップされたタスクがあります             |
|    - 2.4 ギャップ分析 (スキップ済み)                                    |
|  ギャップ分析を実行すると、Introduction の説得力が向上します。           |
|                         [ギャップ分析を実行]  [無視]                    |
+------------------------------------------------------------------------+
```

### 5.4 ダッシュボード統合

ダッシュボードのドキュメントカードにジャーニーの進捗状態を表示する。

```
既存のダッシュボードカード:
+------------------------------------------+
| Deep learning for medical imaging  (v5)   |
| 更新: 3/14 15:30                          |
+------------------------------------------+

拡張後のダッシュボードカード:
+------------------------------------------+
| Deep learning for medical imaging  (v5)   |
| Phase 5.2 --- エビデンスマッピング中       |
| [===========>...........]  67%            |
| 更新: 3/14 15:30                          |
+------------------------------------------+

新規論文作成ボタン:
+------------------------------------------+
|        + 新しい論文を始める                 |
|   (Phase 1.1 から自動開始)                 |
+------------------------------------------+
```

### 5.5 ジャーニーオーバービュー（フルページ）

全 7 フェーズ x 全タスクのマトリクス表示。
エディタ内の「ジャーニー全体を見る」ボタンからアクセス。

```
+============================================================================+
|  論文執筆ジャーニー --- Deep learning for medical imaging                   |
|  開始: 2026-03-01  |  最終更新: 2026-03-14  |  進捗: 18/27 (67%)          |
|  推定残り工数: 25-40 時間                                                  |
|============================================================================+
|                                                                             |
|  Phase 1: 準備                                          [===完了===] 3/3   |
|  +--------+------------------+----------+----------+----------+            |
|  | タスク | 名前             | 状態     | 完了日    | 所要時間 |            |
|  +--------+------------------+----------+----------+----------+            |
|  | 1.1    | トピック定義     | 完了     | 3/1      | 5 分     |            |
|  | 1.2    | ジャーナル選定   | 完了     | 3/1      | 10 分    |            |
|  | 1.3    | ガイドライン確認 | 完了     | 3/1      | 5 分     |            |
|  +--------+------------------+----------+----------+----------+            |
|                                                                             |
|  Phase 2: 文献調査                                      [===完了===] 4/4   |
|  +--------+------------------+----------+----------+----------+            |
|  | 2.1    | 論文検索         | 完了     | 3/5      | 3 時間   |            |
|  | 2.2    | 引用候補検証     | 完了     | 3/6      | 1 時間   |            |
|  | 2.3    | エビデンス抽出   | 完了     | 3/7      | 2 時間   |            |
|  | 2.4    | ギャップ分析     | 完了     | 3/8      | 1 時間   |            |
|  +--------+------------------+----------+----------+----------+            |
|                                                                             |
|  Phase 3: 構成設計                                      [===完了===] 3/3   |
|  ...                                                                        |
|                                                                             |
|  Phase 4: 執筆                                          [==進行中==] 3/5   |
|  +--------+------------------+----------+----------+----------+            |
|  | 4.1    | Introduction     | 完了     | 3/10     | 8 時間   |            |
|  | 4.2    | Methods          | 完了     | 3/12     | 6 時間   |            |
|  | 4.3    | Results          | 完了     | 3/13     | 5 時間   |            |
|  | 4.4    | Discussion       | 進行中   | ---      | ---      |            |
|  | 4.5    | Abstract         | ロック   | ---      | ---      |            |
|  +--------+------------------+----------+----------+----------+            |
|                                                                             |
|  Phase 5: 引用・エビデンス検証                           [==未着手==] 0/4   |
|  ...                                                                        |
|                                                                             |
|  Phase 6: レビュー & 推敲                               [==未着手==] 0/4   |
|  ...                                                                        |
|                                                                             |
|  Phase 7: 投稿準備                                      [==未着手==] 0/4   |
|  ...                                                                        |
|                                                                             |
+============================================================================+
|                                                                             |
|  フェーズ依存関係:                                                          |
|                                                                             |
|  Phase 1 ----+----> Phase 2 -----> Phase 3 -----> Phase 4                  |
|              |                        |              |                      |
|              |                        v              v                      |
|              +-----> Phase 6.3    Phase 5 <----+     |                      |
|                                      |         |     |                      |
|                                      v         |     v                      |
|                                   Phase 6 -----+  Phase 7                  |
|                                                                             |
+============================================================================+
```

---

## 6. 既存 UI への影響

### 6.1 ダッシュボード変更

| 変更箇所 | 変更内容 | 破壊的変更 |
|---------|---------|----------|
| ドキュメントカード | フェーズ表示・進捗バーを追加 | No (additive) |
| 「新しい論文を始める」 | クリック後に PaperJourney レコードを自動作成 | No (additive) |
| カードソート | ジャーニー進捗でソート可能に | No (additive) |

### 6.2 エディタ変更

| 変更箇所 | 変更内容 | 破壊的変更 |
|---------|---------|----------|
| ヘッダー | ワークフロータブの上にジャーニーナビゲーションバーを挿入 | **Yes** (レイアウト変更) |
| ワークフロータブ | Write / Citations / Review はそのまま維持 | No |
| タブ自動切替 | ジャーニーのタスクに応じてタブが自動切替 | No (additive) |
| サイドバー | 「Journey」タブを追加 (Goals タブと統合検討) | No (additive) |

#### ワークフロータブとの連動マトリクス

| ジャーニーフェーズ | 自動選択タブ | 理由 |
|----------------|-----------|------|
| Phase 1-3 | Write | 準備・構成設計は執筆タブで行う |
| Phase 4 | Write | 執筆は Write タブ |
| Phase 5.1-5.2 | Citations | Citation Auto-Pilot と Evidence Mapping |
| Phase 5.3-5.4 | Citations | Human Verification とエクスポート |
| Phase 6 | Review | レビュー系タスクは Review タブ |
| Phase 7 | Write | 投稿準備は設定系なので Write タブ |

### 6.3 Start New Paper ダイアログ変更

現在の Start New Paper ダイアログ (`start-paper-dialog.tsx`) は
タイトル、言語、ジャーナルの 3 項目を入力する。

変更内容:
1. ダイアログ完了時に `PaperJourney` レコードを自動作成
2. タスク 1.1 と 1.2 を自動完了にマーク
3. (オプション) ガイドライン選択ステップを追加し、タスク 1.3 も完了可能に

```typescript
// src/app/actions/document.ts (existing) --- 変更箇所

export async function createDocument(params: CreateDocumentParams) {
  // ... existing document creation logic ...

  // NEW: Create PaperJourney record
  const journey = await prisma.paperJourney.create({
    data: {
      documentId: doc.id,
      currentPhase: 1,
      currentTaskId: params.journal !== "general" ? "1.3" : "1.2",
      taskStatuses: {
        "1.1": {
          status: params.title ? "completed" : "not_started",
          autoCompleted: true,
          completedAt: new Date().toISOString(),
        },
        "1.2": {
          status: params.journal !== "general" ? "completed" : "not_started",
          autoCompleted: true,
          completedAt: params.journal !== "general" ? new Date().toISOString() : null,
        },
      },
    },
  });

  return doc;
}
```

---

## 7. 柔軟性の確保

### 7.1 非強制の原則

ジャーニーは「推奨順序」であり、「強制順序」ではない。

- **任意ジャンプ**: 任意のタスクにいつでもジャンプ可能。依存関係のあるタスクにジャンプした場合は警告を表示するが、ブロックはしない
- **スキップ許可**: 全タスクはスキップ可能。スキップ時にオプションで理由を記入
- **逆順作業**: Phase 4 → Phase 2 に戻って追加文献調査を行うことも可能

### 7.2 スキップ時の挙動

```typescript
interface SkipTaskRequest {
  taskId: string;
  reason?: string;
}

// Skip effects:
// 1. Task status -> "skipped"
// 2. Phase progress includes skipped as "done" (for progress bar)
// 3. Warning badge on dependent tasks
// 4. Persistent warning in journey overview
// 5. Can be un-skipped later (status -> "not_started" or "in_progress")
```

### 7.3 ガイド非表示モード

上級者向けに「ガイドを非表示」オプションを提供する。

- ナビゲーションバーが非表示になる
- ダッシュボードのフェーズ表示も非表示になる
- ジャーニーの状態管理自体は継続（自動完了判定はバックグラウンドで動作）
- 設定画面からいつでも再表示可能

```typescript
// Toggle journey guide visibility
await prisma.paperJourney.update({
  where: { documentId },
  data: { guideVisible: false },
});
```

### 7.4 カスタムフェーズ順序（将来）

研究者の執筆スタイルに合わせてフェーズ順序をカスタマイズ可能にする。

例:
- 「先に Methods を書いてから Introduction」→ Phase 4 内のタスク順序変更
- 「文献調査と執筆を交互に」→ Phase 2 と Phase 4 の並行実行

これは v1 では実装せず、`JourneyMetadata.customPhaseOrder` フィールドを
予約するにとどめる。

---

## 8. API 設計

### 8.1 エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/journey/:documentId` | 現在のジャーニー状態を取得 |
| POST | `/api/journey/:documentId` | ジャーニーを作成（Start New Paper 時に自動呼び出し） |
| PATCH | `/api/journey/:documentId` | ジャーニー全体の状態更新（currentPhase, guideVisible 等） |
| POST | `/api/journey/:documentId/complete-task` | タスクを完了としてマーク |
| POST | `/api/journey/:documentId/skip-task` | タスクをスキップ |
| POST | `/api/journey/:documentId/unskip-task` | スキップを取消 |
| GET | `/api/journey/:documentId/next-action` | 次のアクションを取得 |
| POST | `/api/journey/:documentId/refresh` | 全タスクの自動完了を再判定 |

### 8.2 API 詳細

#### GET /api/journey/:documentId

```json
// Response
{
  "journey": {
    "id": "journey_123",
    "documentId": "doc_456",
    "currentPhase": 4,
    "currentTaskId": "4.2",
    "guideVisible": true,
    "phaseStatuses": {
      "1": "completed",
      "2": "completed",
      "3": "completed",
      "4": "in_progress",
      "5": "not_started",
      "6": "not_started",
      "7": "not_started"
    },
    "taskStatuses": {
      "1.1": { "status": "completed", "autoCompleted": true, "completedAt": "2026-03-01T10:00:00Z" },
      "1.2": { "status": "completed", "autoCompleted": true, "completedAt": "2026-03-01T10:05:00Z" },
      "4.1": { "status": "completed", "autoCompleted": true, "completedAt": "2026-03-10T15:30:00Z" },
      "4.2": { "status": "in_progress", "autoCompleted": false, "completedAt": null }
    },
    "metadata": {
      "selectedGuidelines": ["CONSORT-AI"],
      "guidelineNotApplicable": false,
      "evidencePptxExported": false,
      "latexExported": false,
      "docxExported": false
    },
    "startedAt": "2026-03-01T10:00:00Z",
    "lastActivityAt": "2026-03-14T15:30:00Z",
    "completedAt": null
  },
  "progress": {
    "overall": 0.44,
    "completedTasks": 12,
    "totalTasks": 27,
    "estimatedRemainingHours": { "min": 25, "max": 40 },
    "phases": [
      { "phase": 1, "progress": 1.0, "completedTasks": 3, "totalTasks": 3 },
      { "phase": 2, "progress": 1.0, "completedTasks": 4, "totalTasks": 4 },
      { "phase": 3, "progress": 1.0, "completedTasks": 3, "totalTasks": 3 },
      { "phase": 4, "progress": 0.4, "completedTasks": 2, "totalTasks": 5 },
      { "phase": 5, "progress": 0.0, "completedTasks": 0, "totalTasks": 4 },
      { "phase": 6, "progress": 0.0, "completedTasks": 0, "totalTasks": 4 },
      { "phase": 7, "progress": 0.0, "completedTasks": 0, "totalTasks": 4 }
    ]
  },
  "taskCompletions": [
    {
      "taskId": "2.1",
      "status": "completed",
      "autoCompleted": true,
      "metadata": { "citationCount": 12 },
      "completedAt": "2026-03-05T14:00:00Z"
    }
  ]
}
```

#### POST /api/journey/:documentId/complete-task

```json
// Request
{
  "taskId": "3.2",
  "manual": true,
  "metadata": {
    "notes": "Introduction, Methods, Results, Discussion 各セクションの段落構成を設計済み"
  }
}

// Response
{
  "success": true,
  "taskCompletion": {
    "taskId": "3.2",
    "status": "completed",
    "autoCompleted": false,
    "completedAt": "2026-03-15T10:00:00Z"
  },
  "updatedJourney": {
    "currentPhase": 3,
    "currentTaskId": "3.3",
    "phaseStatuses": { "3": "in_progress" }
  },
  "nextAction": {
    "taskId": "3.3",
    "taskName": "ガイドライン準拠の事前チェック",
    "description": "テンプレートに基づく構成確認",
    "actionLabel": "チェックを実行",
    "actionUrl": "/documents/doc_456?tab=review&action=compliance-check"
  }
}
```

#### POST /api/journey/:documentId/skip-task

```json
// Request
{
  "taskId": "1.3",
  "reason": "本研究にはガイドライン不要"
}

// Response
{
  "success": true,
  "taskCompletion": {
    "taskId": "1.3",
    "status": "skipped",
    "skipReason": "本研究にはガイドライン不要",
    "skippedAt": "2026-03-01T10:10:00Z"
  },
  "warnings": [
    {
      "affectedTaskId": "3.3",
      "message": "タスク 3.3 (ガイドライン準拠の事前チェック) は 1.3 に依存しています。スキップの影響で 3.3 も自動スキップされます。"
    },
    {
      "affectedTaskId": "6.3",
      "message": "タスク 6.3 (ガイドライン準拠の最終チェック) も影響を受けます。"
    }
  ]
}
```

#### GET /api/journey/:documentId/next-action

```json
// Response
{
  "nextAction": {
    "type": "task_start",
    "taskId": "4.2",
    "taskName": "Methods 執筆",
    "description": "データセット・対象者の記述、手法・アルゴリズムの説明、評価指標の定義を記述する。",
    "actionLabel": "Methods を書き始める",
    "actionUrl": "/documents/doc_456?section=METHODS",
    "estimatedTime": "8-16 時間",
    "progress": {
      "current": 320,
      "target": 500,
      "unit": "characters",
      "percentage": 64
    }
  },
  "skippedWarnings": [
    {
      "taskId": "2.4",
      "taskName": "ギャップ分析",
      "message": "ギャップ分析を実行すると Introduction の説得力が向上します"
    }
  ],
  "resumeContext": {
    "lastEditedSection": "METHODS",
    "lastEditedAt": "2026-03-14T15:30:00Z",
    "message": "前回は Methods セクションを編集中でした"
  }
}
```

---

## 9. コンポーネント階層

### 9.1 ジャーニー関連コンポーネントツリー

```
src/components/journey/
  journey-navigation-bar.tsx          -- Main navigation bar (always visible)
    phase-dot.tsx                     -- Individual phase dot (*, O, o)
    phase-progress-summary.tsx        -- "Phase 4: 執筆 / 4.2 Methods  44%"
  journey-phase-detail.tsx            -- Expanded phase detail panel
    journey-task-card.tsx             -- Individual task card
    task-progress-bar.tsx             -- Progress bar for in-progress tasks
    task-skip-dialog.tsx              -- Skip confirmation with reason input
  journey-next-action-banner.tsx      -- "Phase 3 完了！次は..." banner
  journey-next-action-toast.tsx       -- Toast notification for task completion
  journey-overview-page.tsx           -- Full-page journey overview
    journey-phase-table.tsx           -- Phase table with all tasks
    journey-dependency-graph.tsx      -- Phase dependency visualization
    journey-time-estimate.tsx         -- Remaining effort estimate
  journey-dashboard-chip.tsx          -- Dashboard card journey indicator
  journey-resume-prompt.tsx           -- "前回は 4.2 を作業中でした" prompt
```

### 9.2 エディタ統合

```
EditorPageClient (existing)
  JourneyNavigationBar (NEW)          -- Above workflow tabs
    PhaseDots
    PhaseProgressSummary
    JourneyPhaseDetail (expandable)
  WorkflowTabs (existing)             -- Write | Citations | Review
    -- Tab auto-switch based on journey task
  GroundedWorkspace (existing)
    SourceEditorPane (existing)
    ManuscriptEditorPane (existing)
    EvidenceDrawer (existing)
  JourneyNextActionBanner (NEW)       -- Bottom overlay
  JourneyResumePrompt (NEW)           -- Shown after inactivity
```

---

## 10. 状態管理

### 10.1 クライアントサイド

```typescript
// src/hooks/use-journey.ts

interface UseJourneyReturn {
  journey: PaperJourney | null;
  progress: JourneyProgress;
  currentTask: JourneyTask | null;
  nextAction: NextAction | null;
  isLoading: boolean;

  // Actions
  completeTask: (taskId: string, metadata?: Record<string, unknown>) => Promise<void>;
  skipTask: (taskId: string, reason?: string) => Promise<void>;
  unskipTask: (taskId: string) => Promise<void>;
  jumpToTask: (taskId: string) => void;
  toggleGuideVisibility: () => Promise<void>;
  refreshCompletions: () => Promise<void>;
}

function useJourney(documentId: string): UseJourneyReturn;
```

### 10.2 自動完了判定のポーリング

```typescript
// src/hooks/use-journey-auto-complete.ts

function useJourneyAutoComplete(documentId: string) {
  // Poll every 30 seconds while editor is active
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState === "visible") {
        const response = await fetch(`/api/journey/${documentId}/refresh`, {
          method: "POST",
        });
        const data = await response.json();
        if (data.newlyCompleted.length > 0) {
          // Show toast for each newly completed task
          data.newlyCompleted.forEach((task: CompletionCheckResult) => {
            toast.success(`タスク ${task.taskId} 完了: ${task.detail}`);
          });
          // Refresh journey state
          mutateJourney();
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [documentId]);
}
```

### 10.3 イベント駆動の完了チェック

特定のイベント発生時に即座に完了チェックを実行する:

```typescript
// Event-driven completion triggers
const COMPLETION_TRIGGERS: Record<string, string[]> = {
  "citation:created":    ["2.1", "2.2"],
  "citation:verified":   ["2.2"],
  "claimcard:created":   ["2.3"],
  "coverage:completed":  ["2.4"],
  "section:updated":     ["3.1", "4.1", "4.2", "4.3", "4.4", "4.5"],
  "autopilot:completed": ["5.1"],
  "mapping:created":     ["5.2"],
  "mapping:verified":    ["5.3"],
  "export:pptx":         ["5.4"],
  "export:latex":        ["7.2"],
  "export:docx":         ["7.2"],
  "flow:analyzed":       ["6.1"],
  "review:resolved":     ["6.4"],
};
```

---

## 11. ジャーニーの開始と終了

### 11.1 開始フロー

```
ユーザーが「新しい論文を始める」をクリック
  ↓
Start New Paper ダイアログ表示
  ↓
タイトル・言語・ジャーナルを入力
  ↓
Document + DocumentVersion 作成 (既存ロジック)
  ↓
PaperJourney レコード自動作成
  ↓
Task 1.1, 1.2 を自動完了判定
  ↓
エディタにリダイレクト + ジャーニーナビゲーション表示
  ↓
「Phase 1 のタスクを確認しましょう」バナー表示
```

### 11.2 完了フロー

```
Task 7.4 (投稿) が手動完了
  ↓
全フェーズのステータスを再計算
  ↓
PaperJourney.completedAt にタイムスタンプ設定
  ↓
ジャーニー完了画面を表示:
  - 全体の統計（所要日数、総タスク数、執筆時間等）
  - 達成マイルストーン一覧
  - (Productivity Layer) Achievement: SUBMISSION_READY
  ↓
ダッシュボードのカードに「投稿完了」バッジ表示
```

### 11.3 既存ドキュメントへのジャーニー追加

ジャーニー機能リリース前に作成された既存ドキュメントに対しては:

1. ドキュメントを開いた際に「ジャーニーを有効にする」バナーを表示
2. ユーザーが承認 → PaperJourney レコード作成
3. 既存の状態（引用数、テキスト量等）から自動完了判定を実行し、
   すでに達成済みのタスクを一括完了

```typescript
// Backfill logic for existing documents
async function backfillJourney(documentId: string): Promise<PaperJourney> {
  const journey = await prisma.paperJourney.create({
    data: { documentId },
  });

  // Run all auto-completion checks
  const results = await completionEngine.checkAllTasks(documentId);

  // Bulk-complete already-done tasks
  for (const result of results) {
    if (result.completed) {
      await prisma.taskCompletion.create({
        data: {
          journeyId: journey.id,
          taskId: result.taskId,
          status: "COMPLETED",
          autoCompleted: true,
          metadata: { backfilled: true },
          completedAt: new Date(),
        },
      });
    }
  }

  return journey;
}
```

---

## 12. Productivity Layer との統合

### 12.1 DocumentMilestone との連動

ジャーニーのフェーズ完了時に、対応する DocumentMilestone を自動完了する:

| ジャーニーフェーズ完了 | 連動 MilestoneType |
|--------------------|--------------------|
| Phase 4 完了 | `DRAFT_COMPLETE` |
| Phase 5 完了 | `EVIDENCE_VERIFIED` |
| Phase 6 完了 | `REVISION_COMPLETE` |
| Phase 7 完了 | `SUBMISSION` |

### 12.2 WritingSession との連動

Phase 4 (執筆) のタスクが進行中の場合、
WritingSession の wordsWritten を使って進捗をリアルタイム表示する。

### 12.3 Achievement との連動

ジャーニーのマイルストーン達成が Achievement トリガーとなる:

| ジャーニーイベント | Achievement |
|----------------|-------------|
| 初めての Phase 完了 | (新規) `FIRST_PHASE_COMPLETE` |
| Phase 4 完了 | `DRAFT_COMPLETE` |
| 全タスク完了 | `SUBMISSION_READY` |

---

## 13. タスク定義レジストリ

全 27 タスクの定義を一元管理するレジストリ。
UI表示、完了判定、ルーティングの情報源となる。

```typescript
// src/lib/journey/task-registry.ts

interface JourneyTaskDefinition {
  id: string;                         // "2.1"
  phase: number;                      // 2
  name: string;                       // "関連論文の検索"
  nameEn: string;                     // "Literature Search"
  description: string;                // 説明文
  completionCriteria: string;         // 完了条件の説明
  estimatedMinutes: { min: number; max: number };
  dependencies: string[];             // ["1.1"]
  autoCompletable: boolean;
  linkedFeature: string | null;       // "evidence-search" | "autopilot" | etc.
  linkedWorkflowTab: "write" | "citations" | "review";
  linkedSection?: string;             // "INTRODUCTION" | "METHODS" | etc.
}

const JOURNEY_TASKS: JourneyTaskDefinition[] = [
  {
    id: "1.1",
    phase: 1,
    name: "研究トピック・タイトルの定義",
    nameEn: "Define Research Topic & Title",
    description: "論文の仮タイトルと研究トピックを設定する。",
    completionCriteria: "タイトルが「無題の翻訳」以外に設定されている",
    estimatedMinutes: { min: 5, max: 10 },
    dependencies: [],
    autoCompletable: true,
    linkedFeature: "start-paper-dialog",
    linkedWorkflowTab: "write",
  },
  {
    id: "1.2",
    phase: 1,
    name: "ターゲットジャーナルの選定",
    nameEn: "Select Target Journal",
    description: "投稿先ジャーナルを選択し、投稿要件を確認する。",
    completionCriteria: "ジャーナルが general 以外に設定されている",
    estimatedMinutes: { min: 10, max: 30 },
    dependencies: ["1.1"],
    autoCompletable: true,
    linkedFeature: "journal-selector",
    linkedWorkflowTab: "write",
  },
  {
    id: "1.3",
    phase: 1,
    name: "ガイドラインの確認",
    nameEn: "Review Reporting Guidelines",
    description: "研究デザインに応じたガイドライン（CONSORT-AI等）を選択する。",
    completionCriteria: "ガイドラインが選択されている、または「不要」が明示されている",
    estimatedMinutes: { min: 5, max: 15 },
    dependencies: ["1.1"],
    autoCompletable: true,
    linkedFeature: "guideline-selector",
    linkedWorkflowTab: "write",
  },
  // Phase 2
  {
    id: "2.1",
    phase: 2,
    name: "関連論文の検索",
    nameEn: "Literature Search",
    description: "Evidence Search で研究トピックに関連する候補論文を発見する。",
    completionCriteria: "ManuscriptCitation が 5 件以上",
    estimatedMinutes: { min: 120, max: 240 },
    dependencies: ["1.1"],
    autoCompletable: true,
    linkedFeature: "evidence-search",
    linkedWorkflowTab: "citations",
  },
  {
    id: "2.2",
    phase: 2,
    name: "引用候補の検証",
    nameEn: "Verify Citation Candidates",
    description: "DOI/PMID で候補論文の実在を確認する。",
    completionCriteria: "全 ManuscriptCitation の CanonicalPaper が EXISTS_VERIFIED 以上",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["2.1"],
    autoCompletable: true,
    linkedFeature: "evidence-verify",
    linkedWorkflowTab: "citations",
  },
  {
    id: "2.3",
    phase: 2,
    name: "エビデンスの抽出",
    nameEn: "Extract Evidence",
    description: "フルテキスト取得と ClaimCard 作成。",
    completionCriteria: "全引用に ClaimCard が 1 件以上",
    estimatedMinutes: { min: 120, max: 240 },
    dependencies: ["2.2"],
    autoCompletable: true,
    linkedFeature: "evidence-extract",
    linkedWorkflowTab: "citations",
  },
  {
    id: "2.4",
    phase: 2,
    name: "先行研究のギャップ分析",
    nameEn: "Gap Analysis",
    description: "Coverage Analysis で不足分野を特定する。",
    completionCriteria: "Coverage Analysis が 1 回以上実行済み",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["2.3"],
    autoCompletable: true,
    linkedFeature: "evidence-coverage",
    linkedWorkflowTab: "citations",
  },
  // Phase 3
  {
    id: "3.1",
    phase: 3,
    name: "アウトライン作成",
    nameEn: "Create Outline",
    description: "IMRaD セクション構造を設定する。",
    completionCriteria: "sections に 4 セクション以上定義",
    estimatedMinutes: { min: 15, max: 30 },
    dependencies: ["1.2"],
    autoCompletable: true,
    linkedFeature: "section-rail",
    linkedWorkflowTab: "write",
  },
  {
    id: "3.2",
    phase: 3,
    name: "各セクションの段落構成",
    nameEn: "Design Paragraph Structure",
    description: "段落の役割（背景→課題→ギャップ→手法→貢献）を設計する。",
    completionCriteria: "ユーザーが手動で完了マーク",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["3.1"],
    autoCompletable: false,
    linkedFeature: "paragraph-outline",
    linkedWorkflowTab: "write",
  },
  {
    id: "3.3",
    phase: 3,
    name: "ガイドライン準拠の事前チェック",
    nameEn: "Pre-check Guideline Compliance",
    description: "テンプレートに基づく構成の事前確認。",
    completionCriteria: "チェック実行済み + BLOCKER なし、またはガイドライン不要",
    estimatedMinutes: { min: 15, max: 30 },
    dependencies: ["1.3", "3.1"],
    autoCompletable: true,
    linkedFeature: "guideline-compliance",
    linkedWorkflowTab: "review",
  },
  // Phase 4
  {
    id: "4.1",
    phase: 4,
    name: "Introduction 執筆",
    nameEn: "Write Introduction",
    description: "背景→課題→先行研究→ギャップ→本研究の位置づけを記述する。",
    completionCriteria: "Introduction セクション 500 文字以上",
    estimatedMinutes: { min: 480, max: 960 },
    dependencies: ["2.4", "3.2"],
    autoCompletable: true,
    linkedFeature: "editor",
    linkedWorkflowTab: "write",
    linkedSection: "INTRODUCTION",
  },
  {
    id: "4.2",
    phase: 4,
    name: "Methods 執筆",
    nameEn: "Write Methods",
    description: "データ・手法・評価指標の記述。",
    completionCriteria: "Methods セクション 500 文字以上",
    estimatedMinutes: { min: 480, max: 960 },
    dependencies: ["3.2"],
    autoCompletable: true,
    linkedFeature: "editor",
    linkedWorkflowTab: "write",
    linkedSection: "METHODS",
  },
  {
    id: "4.3",
    phase: 4,
    name: "Results 執筆",
    nameEn: "Write Results",
    description: "結果の記述（図表参照含む）。",
    completionCriteria: "Results セクション 300 文字以上",
    estimatedMinutes: { min: 480, max: 960 },
    dependencies: ["3.2"],
    autoCompletable: true,
    linkedFeature: "editor",
    linkedWorkflowTab: "write",
    linkedSection: "RESULTS",
  },
  {
    id: "4.4",
    phase: 4,
    name: "Discussion 執筆",
    nameEn: "Write Discussion",
    description: "解釈→先行研究との比較→限界→貢献。",
    completionCriteria: "Discussion セクション 500 文字以上",
    estimatedMinutes: { min: 480, max: 960 },
    dependencies: ["4.3"],
    autoCompletable: true,
    linkedFeature: "editor",
    linkedWorkflowTab: "write",
    linkedSection: "DISCUSSION",
  },
  {
    id: "4.5",
    phase: 4,
    name: "Abstract 執筆",
    nameEn: "Write Abstract",
    description: "全体のサマリー（最後に書く）。",
    completionCriteria: "Abstract セクション 100 文字以上",
    estimatedMinutes: { min: 120, max: 240 },
    dependencies: ["4.1", "4.2", "4.3", "4.4"],
    autoCompletable: true,
    linkedFeature: "editor",
    linkedWorkflowTab: "write",
    linkedSection: "ABSTRACT",
  },
  // Phase 5
  {
    id: "5.1",
    phase: 5,
    name: "Citation Auto-Pilot",
    nameEn: "Citation Auto-Pilot",
    description: "文ごとの引用候補提示と \\cite{key} 挿入。",
    completionCriteria: "Auto-Pilot AgentRun が completed",
    estimatedMinutes: { min: 60, max: 180 },
    dependencies: ["4.1"],
    autoCompletable: true,
    linkedFeature: "autopilot",
    linkedWorkflowTab: "citations",
  },
  {
    id: "5.2",
    phase: 5,
    name: "エビデンスマッピング",
    nameEn: "Evidence Mapping",
    description: "各引用の根拠箇所を特定する。",
    completionCriteria: "全引用に EvidenceMapping が 1 件以上",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["5.1"],
    autoCompletable: true,
    linkedFeature: "evidence-mapping",
    linkedWorkflowTab: "citations",
  },
  {
    id: "5.3",
    phase: 5,
    name: "Human Verification",
    nameEn: "Human Verification",
    description: "人間の目で全 EvidenceMapping を検証・承認する。",
    completionCriteria: "全 EvidenceMapping が humanVerified = true",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["5.2"],
    autoCompletable: true,
    linkedFeature: "evidence-verification",
    linkedWorkflowTab: "citations",
  },
  {
    id: "5.4",
    phase: 5,
    name: "エビデンスレポート作成",
    nameEn: "Create Evidence Report",
    description: "PPTX エビデンスエクスポート。",
    completionCriteria: "Evidence PPTX エクスポート実行済み",
    estimatedMinutes: { min: 10, max: 20 },
    dependencies: ["5.3"],
    autoCompletable: true,
    linkedFeature: "export-evidence-pptx",
    linkedWorkflowTab: "citations",
  },
  // Phase 6
  {
    id: "6.1",
    phase: 6,
    name: "段落フロー分析",
    nameEn: "Paragraph Flow Analysis",
    description: "論理的流れの検証。",
    completionCriteria: "全セクションで ParagraphAnalysis スコア 60+",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["4.5"],
    autoCompletable: true,
    linkedFeature: "flow-analysis",
    linkedWorkflowTab: "review",
  },
  {
    id: "6.2",
    phase: 6,
    name: "構成チェック",
    nameEn: "Structure Check",
    description: "IMRaD 準拠の最終確認。",
    completionCriteria: "構成チェック完了 + blocker なし",
    estimatedMinutes: { min: 15, max: 30 },
    dependencies: ["4.5"],
    autoCompletable: false,
    linkedFeature: "structure-check",
    linkedWorkflowTab: "review",
  },
  {
    id: "6.3",
    phase: 6,
    name: "ガイドライン準拠の最終チェック",
    nameEn: "Final Guideline Compliance Check",
    description: "全チェック項目の充足確認。",
    completionCriteria: "チェック実行済み + 全項目パス、またはガイドライン不要",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["4.5", "1.3"],
    autoCompletable: true,
    linkedFeature: "guideline-compliance",
    linkedWorkflowTab: "review",
  },
  {
    id: "6.4",
    phase: 6,
    name: "Adversarial Review",
    nameEn: "Adversarial Review",
    description: "AI による厳格な査読シミュレーション。",
    completionCriteria: "全 BLOCKER 級の ReviewFinding が resolved",
    estimatedMinutes: { min: 120, max: 240 },
    dependencies: ["5.3", "6.1"],
    autoCompletable: true,
    linkedFeature: "adversarial-review",
    linkedWorkflowTab: "review",
  },
  // Phase 7
  {
    id: "7.1",
    phase: 7,
    name: "フォーマット調整",
    nameEn: "Format Adjustment",
    description: "ジャーナルスタイルの適用。",
    completionCriteria: "手動完了",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["6.4"],
    autoCompletable: false,
    linkedFeature: "journal-formatting",
    linkedWorkflowTab: "write",
  },
  {
    id: "7.2",
    phase: 7,
    name: "エクスポート",
    nameEn: "Export",
    description: "LaTeX (.tex + .bib) or Word (.docx) エクスポート。",
    completionCriteria: "LaTeX or DOCX エクスポート実行済み",
    estimatedMinutes: { min: 10, max: 20 },
    dependencies: ["7.1"],
    autoCompletable: true,
    linkedFeature: "export-dialog",
    linkedWorkflowTab: "write",
  },
  {
    id: "7.3",
    phase: 7,
    name: "投稿チェックリスト",
    nameEn: "Submission Checklist",
    description: "共著者確認、利益相反、倫理審査番号等。",
    completionCriteria: "SubmissionPlan の全チェック項目が checked",
    estimatedMinutes: { min: 60, max: 120 },
    dependencies: ["7.2"],
    autoCompletable: true,
    linkedFeature: "submission-plan",
    linkedWorkflowTab: "write",
  },
  {
    id: "7.4",
    phase: 7,
    name: "投稿",
    nameEn: "Submit",
    description: "カバーレター準備と最終確認。",
    completionCriteria: "手動完了",
    estimatedMinutes: { min: 15, max: 30 },
    dependencies: ["7.3"],
    autoCompletable: false,
    linkedFeature: "cover-letter",
    linkedWorkflowTab: "write",
  },
];

// Phase definitions
const JOURNEY_PHASES = [
  { phase: 1, name: "準備", nameEn: "Preparation", taskCount: 3 },
  { phase: 2, name: "文献調査", nameEn: "Literature Review", taskCount: 4 },
  { phase: 3, name: "構成設計", nameEn: "Structure Design", taskCount: 3 },
  { phase: 4, name: "執筆", nameEn: "Writing", taskCount: 5 },
  { phase: 5, name: "引用・エビデンス検証", nameEn: "Citations & Evidence", taskCount: 4 },
  { phase: 6, name: "レビュー & 推敲", nameEn: "Review & Polish", taskCount: 4 },
  { phase: 7, name: "投稿準備", nameEn: "Submission", taskCount: 4 },
];
```

---

## 14. エラーハンドリング

### 14.1 ジャーニーが存在しない場合

- 既存ドキュメントにジャーニーがない場合は「ジャーニーを有効にする」バナーを表示
- API は 404 を返すのではなく、`{ journey: null, canCreate: true }` を返す

### 14.2 自動完了判定の失敗

- 自動完了チェックが例外をスローした場合、該当タスクのみスキップし、他タスクの判定は継続
- ログに例外を記録し、次回ポーリング時にリトライ

### 14.3 不整合データ

- Task が completed だが Phase が not_started → Phase ステータスを自動修正
- Phase の全タスクが completed だが Phase が in_progress → Phase を completed に自動修正

---

## 15. パフォーマンス考慮事項

### 15.1 データ取得の最適化

- ジャーニー状態の取得は 1 クエリで完結（PaperJourney + TaskCompletion を JOIN）
- 自動完了チェックはバッチ処理（全タスクを 1 回の DB クエリ群で判定）
- ポーリング間隔は 30 秒（リアルタイム性と負荷のバランス）

### 15.2 キャッシュ

- クライアントサイド: SWR/TanStack Query でジャーニー状態をキャッシュ
- サーバーサイド: ジャーニー状態は更新頻度が低いため、60 秒の stale-while-revalidate

### 15.3 DB 負荷

- PaperJourney テーブルはドキュメントあたり 1 行のみ
- TaskCompletion テーブルはドキュメントあたり最大 27 行
- インデックスは `journeyId` のみで十分

---

## 16. 実装優先度

### P0: コア基盤 (2-3 週間)

| 項目 | 工数目安 | 内容 |
|------|---------|------|
| データモデル | 2 日 | PaperJourney, TaskCompletion テーブル作成、マイグレーション |
| タスクレジストリ | 1 日 | 全 27 タスクの定義ファイル |
| 完了判定エンジン | 3 日 | 自動完了ロジック、ポーリング、イベント駆動チェック |
| ジャーニー API | 2 日 | 全 8 エンドポイント |
| ナビゲーションバー | 3 日 | PhaseDot, PhaseProgressSummary, 最小/展開表示 |
| Start New Paper 統合 | 1 日 | ジャーニー自動作成、タスク 1.1/1.2 自動完了 |

**P0 受け入れ基準:**
- [ ] 新規論文作成時に PaperJourney が自動生成される
- [ ] エディタ上部にジャーニーナビゲーションバーが表示される
- [ ] 7 つのフェーズドットが正しい状態（完了/進行中/未着手）を反映する
- [ ] 現在のフェーズとタスク名が表示される
- [ ] 全体の進捗率が表示される
- [ ] テキスト更新・引用追加等のイベントで自動完了が判定される
- [ ] GET /api/journey/:documentId が正しいレスポンスを返す

### P1: 操作 UI (1-2 週間)

| 項目 | 工数目安 | 内容 |
|------|---------|------|
| フェーズ詳細パネル | 2 日 | タスクカード、進捗バー、手動完了/スキップ |
| 次のアクション提示 | 2 日 | トースト通知、バナー、再開プロンプト |
| ダッシュボード統合 | 1 日 | カードにフェーズ表示、進捗バー |
| ワークフロータブ連動 | 1 日 | タスクに応じたタブ自動切替 |
| 既存ドキュメントバックフィル | 1 日 | ジャーニー有効化バナー、一括完了判定 |

**P1 受け入れ基準:**
- [ ] ナビゲーションバーを展開するとタスク一覧が表示される
- [ ] タスクカードをクリックすると対応する機能画面に遷移する
- [ ] 手動完了・スキップ操作ができる
- [ ] スキップ時に理由入力ダイアログが表示される
- [ ] フェーズ完了時にトースト通知が表示される
- [ ] ダッシュボードのカードに進捗が表示される

### P2: 高度な機能 (1-2 週間)

| 項目 | 工数目安 | 内容 |
|------|---------|------|
| ジャーニーオーバービュー | 2 日 | フルページ表示、依存関係グラフ、時間見積もり |
| ガイド非表示モード | 0.5 日 | 設定画面での切替 |
| Productivity Layer 連動 | 1 日 | Milestone 連動、Achievement 連動 |
| カスタマイズ予備 | --- | customPhaseOrder フィールド予約のみ |

**P2 受け入れ基準:**
- [ ] ジャーニーオーバービューページが全タスクをマトリクス表示する
- [ ] フェーズ間の依存関係が視覚化される
- [ ] 推定残り工数が表示される
- [ ] ガイドを非表示にできる
- [ ] フェーズ完了時に対応する Milestone が自動完了する

---

## 17. 工数見積もりサマリー

| フェーズ | 工数 | 累計 |
|---------|------|------|
| P0: コア基盤 | 2-3 週間 | 2-3 週間 |
| P1: 操作 UI | 1-2 週間 | 3-5 週間 |
| P2: 高度な機能 | 1-2 週間 | 4-7 週間 |

### 前提条件
- Productivity Layer (DocumentMilestone, SubmissionPlan) が実装済み
- Guideline Compliance Checker (v2) が実装済み
- Citation Auto-Pilot が実装済み
- Evidence Mapping System (v2) が実装済み

---

## 18. リスクと緩和策

| リスク | 影響 | 緩和策 |
|-------|------|--------|
| 自動完了判定の精度が低い | ユーザーが誤って完了・未完了と判定される | 手動完了/取消を常に許可、判定ロジックのテスト充実 |
| ナビゲーションバーがエディタの有効面積を圧迫 | 執筆体験の劣化 | 最小表示モード + 非表示オプション |
| 既存ドキュメントへのバックフィルが不完全 | 進捗表示が実態と乖離 | バックフィル後にユーザー確認ステップを追加 |
| フェーズ順序が研究分野によって異なる | 硬直的なジャーニーが使いにくい | 非強制の原則 + 将来のカスタマイズ機能予約 |
| タスク定義の変更が既存ジャーニーを破壊 | バージョン不整合 | タスクレジストリにバージョニングを導入（将来） |

---

## 19. テスト戦略

### 19.1 ユニットテスト

```typescript
// 自動完了判定エンジンのテスト
describe("JourneyCompletionEngine", () => {
  test("task 1.1 completes when title is not default", async () => {
    const result = await engine.checkTask(docId, "1.1");
    expect(result.completed).toBe(true);
    expect(result.detail).toContain("タイトル設定済み");
  });

  test("task 2.1 does not complete with fewer than 5 citations", async () => {
    const result = await engine.checkTask(docId, "2.1");
    expect(result.completed).toBe(false);
    expect(result.progress).toBe(0.6); // 3/5
  });

  test("task 5.3 completes only when all mappings are human-verified", async () => {
    const result = await engine.checkTask(docId, "5.3");
    expect(result.completed).toBe(false);
    expect(result.detail).toContain("7/10 マッピング検証済み");
  });
});
```

### 19.2 統合テスト

```typescript
// ジャーニーのライフサイクルテスト
describe("Journey Lifecycle", () => {
  test("journey is created when document is created", async () => {
    const doc = await createDocument({ title: "Test Paper", journal: "nature" });
    const journey = await prisma.paperJourney.findUnique({ where: { documentId: doc.id } });
    expect(journey).not.toBeNull();
    expect(journey!.currentPhase).toBe(1);
  });

  test("tasks 1.1 and 1.2 auto-complete on creation with title and journal", async () => {
    const journey = await getJourney(docId);
    const taskStatuses = journey.taskStatuses as TaskStatusMap;
    expect(taskStatuses["1.1"].status).toBe("completed");
    expect(taskStatuses["1.2"].status).toBe("completed");
  });

  test("skipping a task shows warning on dependent tasks", async () => {
    const result = await skipTask(docId, "1.3", "Not applicable");
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0].affectedTaskId).toBe("3.3");
  });

  test("journey completes when task 7.4 is manually completed", async () => {
    await completeTask(docId, "7.4", { manual: true });
    const journey = await getJourney(docId);
    expect(journey.completedAt).not.toBeNull();
  });
});
```

### 19.3 E2E テスト

- 新規論文作成 → ジャーニーナビゲーションバーの表示確認
- テキスト入力 → 自動完了判定の反映確認
- フェーズ完了時のトースト表示確認
- スキップ操作 → 警告表示確認
- ガイド非表示 → 再表示確認

---

## 20. 用語集

| 用語 | 定義 |
|------|------|
| ジャーニー (Journey) | 論文執筆の全工程を表すオブジェクト。1 Document に 1 Journey |
| フェーズ (Phase) | ジャーニーの第 1 階層。7 フェーズで構成 |
| タスク (Task) | ジャーニーの第 2 階層。各フェーズ内の具体的な作業単位。全 27 タスク |
| 自動完了 (Auto-complete) | システムがデータ状態から自動的にタスクの完了を判定すること |
| 手動完了 (Manual complete) | ユーザーが明示的にタスクを完了とマークすること |
| スキップ (Skip) | タスクを実行せずに飛ばすこと。進捗率には含まれるが警告が残る |
| ナビゲーションバー | エディタ上部に常時表示されるジャーニーの進捗表示 UI |
| フェーズドット | ナビゲーションバー内の各フェーズの状態を示すドット（*完了, O進行中, o未着手） |
| タスクカード | フェーズ詳細パネル内の各タスクの表示単位 |
| バックフィル | 既存ドキュメントにジャーニーを遡及適用すること |
