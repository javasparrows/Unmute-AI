# Unmute AI v2 差分設計書 --- 研究生産性レイヤー

Document ID: DD-v2-PL
Date: 2026-03-15
Status: Draft
Version: 2.0-PL (Productivity Layer)
Parent: DD-v2 (Detailed Design v2)
Source: Editage "9 Habits of Highly Productive Researchers"

---

## 1. 概要

### 1.1 位置づけ

本設計書は Unmute AI v2 の**差分設計**であり、v3 ではない。
v2 コアシステム（Evidence Mapping, Paragraph Flow Analysis, Guideline Compliance, Evidence Export）は一切変更せず、
既存のダッシュボードとエディタの上に「研究生産性レイヤー」を additive に追加する。

### 1.2 背景

Editage の調査による「生産性の高い研究者に共通する 9 つの習慣」を参照し、
Unmute AI のプロダクトスコープ内で実装可能な 6 つの習慣を機能化する。

> 論文執筆の中央値 177 時間のうち、「書く行為」以外の非効率（目標管理の欠如、時間の浪費、情報収集の遅れ、
> 投稿準備の手戻り）が相当な割合を占める。本レイヤーはこれらの非効率を削減する。

### 1.3 設計原則

1. **完全 additive**: 既存テーブル・API への変更なし。新規テーブルと新規エンドポイントのみ追加
2. **opt-in**: 全機能はユーザーが有効化するまで表示しない。既存 UX を邪魔しない
3. **既存技術スタック準拠**: Next.js 16, React 19, Prisma + Neon PostgreSQL, Vercel AI SDK
4. **段階的導入**: P0 --> P1 --> P2 の順に実装。各フェーズは独立してリリース可能

### 1.4 9 つの習慣とプロダクトスコープ

| # | 習慣 | 対応状況 | 本設計の対応 |
|---|------|---------|-------------|
| 1 | 目標を設定する | **新規** | 2.1 論文プロジェクトゴール管理 |
| 2 | 秩序を保つ | v2 で対応済み | Section Model, Workflow Tabs, Citation Library |
| 3 | 時間を管理する | **新規** | 2.2 執筆セッション管理 |
| 4 | 情報をアップデートし続ける | **新規** | 2.3 文献ウォッチ & アラート |
| 5 | 積極的でいること | **拡張** | 2.4 投稿計画 & チェックリスト |
| 6 | ネットワークを構築する | スコープ外 | 研究者 SNS 機能は作らない |
| 7 | 長所を活かす | 間接対応 | 執筆時間記録で個人パターンを可視化 |
| 8 | 自分自身を労わる | **新規** | 2.5 休憩リマインダー & ウェルネス |
| 9 | 成功を祝う | **新規** | 2.6 達成 & マイルストーン祝福 |

---

## 2. 新規機能一覧

### 2.1 論文プロジェクトゴール管理（習慣 1: 目標設定）

#### 概要

各 Document に対してマイルストーンと SMART 目標を設定し、進捗を可視化する。
論文執筆が「いつ終わるか分からない」状態から「次に何をすべきか明確な」状態へ変える。

#### ユーザーストーリー

- **US-PL-001**: 研究者として、論文の各フェーズ（ドラフト完了、引用完了、レビュー依頼、投稿）に期限を設定し、
  進捗を確認したい。長期プロジェクトの見通しを持つため。
- **US-PL-002**: 研究者として、「3 月末までに Introduction の引用を 10 件追加する」のような具体的な目標を
  設定し、達成率を確認したい。曖昧な計画を避けるため。
- **US-PL-003**: 研究者として、期限が近いマイルストーンの通知を受け取りたい。忘れずに対処するため。

#### データモデル

```prisma
enum MilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

enum MilestoneType {
  DRAFT_COMPLETE      // ドラフト完了
  CITATIONS_COMPLETE  // 引用追加完了
  EVIDENCE_VERIFIED   // エビデンス検証完了
  REVIEW_REQUESTED    // レビュー依頼
  REVISION_COMPLETE   // 改訂完了
  SUBMISSION          // 投稿
  CUSTOM              // カスタム
}

model DocumentMilestone {
  id          String          @id @default(cuid())
  documentId  String
  title       String
  description String?         @db.Text
  type        MilestoneType
  targetDate  DateTime
  completedAt DateTime?
  status      MilestoneStatus @default(NOT_STARTED)
  sortOrder   Int             @default(0)

  document    Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([documentId])
  @@index([documentId, status])
  @@index([targetDate])
}

model SmartGoal {
  id          String   @id @default(cuid())
  documentId  String
  specific    String   @db.Text   // 何を達成するか
  measurable  String              // 測定指標（例: "引用数 >= 10"）
  achievable  String?             // 実現可能性メモ
  relevant    String?             // 論文との関連性
  timeBound   DateTime            // 期限
  currentValue Float   @default(0)
  targetValue  Float
  unit        String              // "citations" | "words" | "sections" | "evidence_mappings"
  completed   Boolean  @default(false)

  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([documentId])
}
```

#### UI 配置

- **ダッシュボード**: Document カードに小さな進捗バー（マイルストーン達成率: 完了数 / 全数）を表示
- **ドキュメント設定パネル**: マイルストーン一覧の CRUD UI。ドラッグで並び替え可能
- **エディタサイドバー**: 「Goals」タブに現在の SMART 目標と達成率をコンパクト表示

#### API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/documents/[id]/milestones` | マイルストーン一覧取得 |
| POST | `/api/documents/[id]/milestones` | マイルストーン作成 |
| PATCH | `/api/milestones/[id]` | マイルストーン更新 |
| DELETE | `/api/milestones/[id]` | マイルストーン削除 |
| GET | `/api/documents/[id]/goals` | SMART 目標一覧取得 |
| POST | `/api/documents/[id]/goals` | SMART 目標作成 |
| PATCH | `/api/goals/[id]` | SMART 目標更新（currentValue 含む） |

---

### 2.2 執筆セッション管理（習慣 3: 時間管理）

#### 概要

Pomodoro タイマーを内蔵し、執筆時間を自動記録する。
日別・週別の執筆統計を提供し、研究者が自身の生産性パターンを把握できるようにする。

#### ユーザーストーリー

- **US-PL-004**: 研究者として、エディタ内で Pomodoro タイマーを使いたい。集中力を維持するため。
- **US-PL-005**: 研究者として、各セッションで書いた文字数と追加した引用数を自動記録したい。
  自分の生産性を客観的に把握するため。
- **US-PL-006**: 研究者として、日別・週別の執筆時間レポートを確認したい。
  最も生産性の高い時間帯を特定するため。

#### データモデル

```prisma
enum SessionStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ABANDONED   // 明示的な終了なしにセッションが期限切れ
}

model WritingSession {
  id            String        @id @default(cuid())
  userId        String
  documentId    String
  status        SessionStatus @default(ACTIVE)

  startedAt     DateTime      @default(now())
  endedAt       DateTime?
  pausedAt      DateTime?
  totalPausedMs Int           @default(0)   // 合計一時停止時間（ミリ秒）

  wordsAtStart  Int           @default(0)
  wordsAtEnd    Int?
  wordsWritten  Int?                        // endedAt 時に計算
  citationsAdded Int          @default(0)
  sectionsEdited String[]                   // 編集されたセクション種別

  pomodoroCount Int           @default(0)   // 完了したポモドーロ数
  pomodoroLength Int          @default(25)  // ポモドーロの長さ（分）
  breakLength   Int           @default(5)   // 休憩の長さ（分）

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  document      Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([documentId])
  @@index([userId, startedAt])
  @@index([userId, status])
}
```

#### UI 配置

- **エディタヘッダー**: タイマーウィジェット（コンパクト表示）
  - 開始/一時停止/リセットボタン
  - 現在のポモドーロ番号 (例: "Pomodoro 3/4")
  - 残り時間表示（分:秒）
  - 集中モード時: 背景色の微妙な変化（フォーカスを示す）
  - 休憩モード時: 「休憩中」バッジ
- **ダッシュボード**: 「今週の執筆サマリー」ウィジェット
  - 日別棒グラフ（執筆時間）
  - 合計文字数、合計引用追加数
  - 最も生産的だった日のハイライト

#### API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/sessions/start` | セッション開始 |
| POST | `/api/sessions/[id]/pause` | セッション一時停止 |
| POST | `/api/sessions/[id]/resume` | セッション再開 |
| POST | `/api/sessions/[id]/end` | セッション終了（統計計算） |
| POST | `/api/sessions/[id]/pomodoro` | ポモドーロ 1 回完了を記録 |
| GET | `/api/sessions/stats` | 統計取得（期間指定可能） |
| GET | `/api/sessions/active` | アクティブセッション取得 |

#### セッションライフサイクル

```
[Start] --> ACTIVE --> [Pause] --> PAUSED --> [Resume] --> ACTIVE
              |                                              |
              +----> [End] --> COMPLETED                     |
              |                                              |
              +----> [Timeout 4h] --> ABANDONED              +----> [End] --> COMPLETED
```

- タイムアウト: ブラウザ閉じ等で終了できなかった場合、4 時間後に自動で ABANDONED に遷移
- ABANDONED セッションの wordsWritten は最後に記録された差分を使用

---

### 2.3 文献ウォッチ & アラート（習慣 4: 情報アップデート）

#### 概要

研究トピックに基づき、関連する新着論文を定期的にチェックする。
v2 の既存外部 API 統合（OpenAlex, Semantic Scholar, Crossref）を再利用し、
新着論文の検索・通知機能を追加する。

#### ユーザーストーリー

- **US-PL-007**: 研究者として、自分の研究テーマに関連する新着論文を週次で通知してほしい。
  重要な論文を見逃さないため。
- **US-PL-008**: 研究者として、論文内で引用している論文の被引用数の大きな変動を知りたい。
  影響力のある引用を把握するため。
- **US-PL-009**: 研究者として、ダッシュボードで「今週の関連論文」を確認したい。
  朝のルーティンとして文献チェックを行うため。

#### データモデル

```prisma
enum WatchFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
}

model LiteratureWatch {
  id          String         @id @default(cuid())
  userId      String
  name        String                         // ウォッチの名前（例: "Clinical NLP"）
  query       String         @db.Text        // 検索クエリ
  topics      String[]                       // キーワードリスト
  sources     String[]       @default(["openalex"]) // 検索ソース
  frequency   WatchFrequency @default(WEEKLY)
  isActive    Boolean        @default(true)
  lastChecked DateTime?
  resultCount Int            @default(0)     // 最新チェック時のヒット数

  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  results     LiteratureWatchResult[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([userId])
  @@index([userId, isActive])
}

model LiteratureWatchResult {
  id            String          @id @default(cuid())
  watchId       String
  paperId       String?         // CanonicalPaper への参照（存在する場合）
  externalId    String          // OpenAlex/S2 の外部 ID
  title         String
  authors       Json?           // [{name: string}]
  year          Int?
  venue         String?
  abstract      String?         @db.Text
  relevanceScore Float?         // AI による関連度スコア (0-1)
  isRead        Boolean         @default(false)
  isBookmarked  Boolean         @default(false)
  fetchedAt     DateTime        @default(now())

  watch         LiteratureWatch @relation(fields: [watchId], references: [id], onDelete: Cascade)

  @@index([watchId])
  @@index([watchId, fetchedAt])
  @@index([watchId, isRead])
}
```

#### 外部 API 統合

既存の外部 API クライアント（`CanonicalPaper` の `PaperIdentifier` + `ProviderSnapshot`）を再利用:

- **OpenAlex**: `/works` エンドポイントで新着論文を検索 (`from_publication_date` パラメータ)
- **Semantic Scholar**: `/paper/search` エンドポイントで検索 (`year` フィルタ)
- **被引用数変動**: 既存の `CanonicalPaper.citationCount` を定期更新し、閾値超過時に通知

#### 実行タイミング

- Vercel Cron Functions (`vercel.json` の `crons` 設定) で週次バッチ処理
- ユーザーごとの `lastChecked` を確認し、`frequency` に応じて実行
- 結果は `LiteratureWatchResult` に保存し、ダッシュボードで表示

#### UI 配置

- **ダッシュボード**: 「今週の関連論文」セクション（カード形式、最大 5 件表示）
  - 各カードにタイトル、著者、年、venue、関連度スコア
  - 「ブックマーク」「既読にする」「引用として追加」ボタン
- **設定画面**: ウォッチの CRUD（トピック、頻度、ソース選択）

#### API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/literature/watches` | ウォッチ一覧取得 |
| POST | `/api/literature/watches` | ウォッチ作成 |
| PATCH | `/api/literature/watches/[id]` | ウォッチ更新 |
| DELETE | `/api/literature/watches/[id]` | ウォッチ削除 |
| GET | `/api/literature/digest` | 新着論文ダイジェスト取得 |
| POST | `/api/literature/watches/[id]/check` | 手動チェック実行 |
| PATCH | `/api/literature/results/[id]` | 結果の既読/ブックマーク更新 |

---

### 2.4 投稿計画 & チェックリスト（習慣 5: 積極性）

#### 概要

v2 の Start New Paper で選択するジャーナル情報を拡張し、
投稿要件チェックリスト、投稿前チェックリスト、査読者候補リストを管理する。
v2 の Guideline Compliance Checker とは独立（Compliance は原稿内容の検証、
本機能は投稿プロセスの管理）。

#### ユーザーストーリー

- **US-PL-010**: 研究者として、ターゲットジャーナルの投稿要件（文字数制限、図表数、
  参考文献形式）をチェックリストとして管理したい。要件漏れによるデスクリジェクトを避けるため。
- **US-PL-011**: 研究者として、投稿前の汎用チェックリスト（共著者確認、利益相反申告、
  倫理審査番号の記載等）を使いたい。投稿直前の慌ただしさでミスをしないため。
- **US-PL-012**: 研究者として、査読者候補を事前にリストアップし、各候補の専門分野と
  過去の関連論文をメモしたい。投稿フォームで慌てないため。

#### データモデル

```prisma
model SubmissionPlan {
  id              String   @id @default(cuid())
  documentId      String   @unique // 1 Document に 1 SubmissionPlan
  targetJournal   String?
  targetDate      DateTime?
  impactFactor    Float?
  acceptanceRate  Float?   // 採択率（パーセント）
  turnaroundDays  Int?     // 査読期間の目安（日数）
  notes           String?  @db.Text

  // チェックリスト（JSON 形式: [{id, label, checked, category}]）
  journalChecklist    Json  @default("[]")  // ジャーナル固有の要件
  submissionChecklist Json  @default("[]")  // 汎用投稿前チェックリスト

  // 査読者候補（JSON 形式: [{name, affiliation, field, email?, papers[], notes}]）
  reviewerCandidates  Json  @default("[]")

  document        Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([documentId])
}
```

#### デフォルトチェックリストテンプレート

汎用投稿前チェックリストのデフォルト項目:

```json
[
  {"id": "1", "label": "All co-authors have reviewed and approved the manuscript", "checked": false, "category": "authorship"},
  {"id": "2", "label": "Author contributions statement is included", "checked": false, "category": "authorship"},
  {"id": "3", "label": "Conflict of interest disclosure is completed", "checked": false, "category": "ethics"},
  {"id": "4", "label": "Ethics approval number is stated (if applicable)", "checked": false, "category": "ethics"},
  {"id": "5", "label": "Data availability statement is included", "checked": false, "category": "data"},
  {"id": "6", "label": "Funding sources are acknowledged", "checked": false, "category": "funding"},
  {"id": "7", "label": "Cover letter is prepared", "checked": false, "category": "submission"},
  {"id": "8", "label": "Manuscript follows journal formatting guidelines", "checked": false, "category": "formatting"},
  {"id": "9", "label": "References are in required format", "checked": false, "category": "formatting"},
  {"id": "10", "label": "Figures and tables meet resolution and format requirements", "checked": false, "category": "formatting"},
  {"id": "11", "label": "Word/character count is within journal limits", "checked": false, "category": "formatting"},
  {"id": "12", "label": "Supplementary materials are prepared", "checked": false, "category": "materials"}
]
```

#### UI 配置

- **ドキュメント設定パネル**: 「Submission」タブ
  - ジャーナル情報（名前、IF、採択率、査読期間）
  - ジャーナル要件チェックリスト（カスタマイズ可能）
  - 汎用投稿前チェックリスト
  - 査読者候補リスト（追加/編集/削除）
- **ダッシュボード**: 投稿予定日が設定されている場合、カウントダウン表示

#### API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/documents/[id]/submission-plan` | 投稿計画取得 |
| PUT | `/api/documents/[id]/submission-plan` | 投稿計画作成/更新（upsert） |
| PATCH | `/api/documents/[id]/submission-plan/checklist` | チェックリスト項目の更新 |

---

### 2.5 休憩リマインダー & ウェルネス（習慣 8: 自己管理）

#### 概要

長時間の連続執筆を検出し、休憩を促す。強制ではなく、ソフトなリマインダーとして実装する。
執筆時間データは 2.2 の WritingSession から取得する。

#### ユーザーストーリー

- **US-PL-013**: 研究者として、2 時間連続で執筆した時に休憩を促す通知を受けたい。
  集中しすぎて体調を崩さないため。
- **US-PL-014**: 研究者として、1 日の累計執筆時間を確認し、適切な時間で切り上げたい。
  持続可能な研究ペースを維持するため。
- **US-PL-015**: 研究者として、休憩リマインダーを無効化できるようにしたい。
  締め切り前の追い込み時には邪魔になるため。

#### 実装方針

新規データモデルは不要。以下のデータを利用:

- `WritingSession` のアクティブセッション（`status: ACTIVE`）の `startedAt` と `totalPausedMs`
- ユーザー設定（後述の `UserProductivitySettings`）

#### ロジック

```typescript
// クライアントサイドのチェック（60秒ごと）
const continuousMinutes = (Date.now() - session.startedAt - session.totalPausedMs) / 60000;
if (continuousMinutes >= settings.breakReminderThreshold && !dismissed) {
  showBreakReminder();
}

// 1 日の累計チェック
const dailyTotal = sessions.filter(s => isToday(s.startedAt)).reduce((sum, s) => sum + s.duration, 0);
if (dailyTotal >= settings.dailyGoalMinutes) {
  showDailyGoalReached();
}
```

#### UI 配置

- **トースト通知**: 画面右下にソフトなトースト
  - 「2 時間連続で執筆しています。少し休憩しませんか？」
  - 「Dismiss」「5 分後に再通知」「休憩する（タイマー一時停止）」ボタン
- **エディタヘッダー**: 累計時間表示（タイマーウィジェットの横）
- **達成メッセージ**: 「今日は十分に書きました！お疲れ様です。」（dailyGoalMinutes 達成時）

---

### 2.6 達成 & マイルストーン祝福（習慣 9: 成功を祝う）

#### 概要

論文執筆の各マイルストーン達成時にアニメーションや通知でユーザーを祝福する。
小さな成功体験の積み重ねが長期的なモチベーション維持に寄与する。

#### ユーザーストーリー

- **US-PL-016**: 研究者として、初めての引用を追加した時にお祝いの通知を受けたい。
  プロダクトからのポジティブなフィードバックを得るため。
- **US-PL-017**: 研究者として、週間の執筆サマリーを確認したい。
  振り返りと達成感を得るため。
- **US-PL-018**: 研究者として、マイルストーン達成時のアニメーションを無効化できるようにしたい。
  集中を妨げたくない場合があるため。

#### データモデル

```prisma
enum AchievementType {
  FIRST_CITATION          // 初めての引用追加
  CITATIONS_MILESTONE     // 引用数マイルストーン（5, 10, 25, 50）
  SECTION_EVIDENCE_COMPLETE // セクションの全文にエビデンスが揃った
  DRAFT_COMPLETE          // ドラフト完成（全セクション記入済み）
  EVIDENCE_VERIFIED_ALL   // 全エビデンスの検証完了
  WRITING_STREAK          // 連続執筆日数（3, 7, 14, 30 日）
  WORDS_MILESTONE         // 総執筆文字数マイルストーン（1000, 5000, 10000）
  POMODORO_MILESTONE      // ポモドーロ完了数（10, 50, 100）
  PAPERS_MILESTONE        // 論文完了数（1, 5, 10）
  SUBMISSION_READY        // 投稿準備完了（全チェックリスト通過）
}

model Achievement {
  id          String          @id @default(cuid())
  userId      String
  type        AchievementType
  documentId  String?         // 特定の論文に紐づく場合
  metadata    Json            @default("{}")  // 追加情報（例: {count: 10, section: "Introduction"}）
  achievedAt  DateTime        @default(now())

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  document    Document?       @relation(fields: [documentId], references: [id], onDelete: SetNull)

  @@unique([userId, type, documentId])  // 同じ Achievement は 1 回のみ
  @@index([userId])
  @@index([userId, achievedAt])
}
```

#### トリガー条件

| Achievement | トリガー |
|-------------|---------|
| FIRST_CITATION | `ManuscriptCitation` が初めて作成された時 |
| CITATIONS_MILESTONE | `ManuscriptCitation` の数が閾値に到達 |
| SECTION_EVIDENCE_COMPLETE | セクション内の全引用に `EvidenceMapping` が存在 |
| DRAFT_COMPLETE | 全セクションの `translatedText` が非空 |
| EVIDENCE_VERIFIED_ALL | 全 `EvidenceMapping.humanVerified` が true |
| WRITING_STREAK | `WritingSession` が N 日連続で存在 |
| WORDS_MILESTONE | `WritingSession.wordsWritten` の累計が閾値に到達 |
| POMODORO_MILESTONE | `WritingSession.pomodoroCount` の累計が閾値に到達 |
| SUBMISSION_READY | `SubmissionPlan` の全チェックリスト項目が checked |

#### UI 配置

- **トースト通知 + アニメーション**: 達成時にコンフェッティ（紙吹雪）アニメーション + メッセージ
  - ライブラリ: `canvas-confetti` (lightweight, 6KB gzipped)
  - アニメーションは 3 秒で自動消去
- **ダッシュボード**: 「Achievements」セクション（バッジ一覧、獲得日時）
- **週間サマリー**: opt-in のメール通知（「今週の進捗: 2,500 語執筆、8 件の引用を追加」）

#### API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/achievements` | ユーザーの Achievement 一覧取得 |
| GET | `/api/achievements/unread` | 未表示の Achievement 取得 |
| POST | `/api/achievements/[id]/seen` | Achievement を既読にする |

---

## 3. スコープ外（プロダクトで対応しない習慣）

### 習慣 6: ネットワーク構築

研究者 SNS やコミュニティ機能は作らない。ユーザー間のインタラクションは
プロダクトの複雑性を大きく上げ、信頼性・セキュリティ要件が跳ね上がる。

**将来検討**: v3 以降で共著者推薦機能（「この分野の研究者リスト」を表示）は検討可能。
ただし本レイヤーの対象外。

### 習慣 7: 長所を活かす

個人の生産性パターンの詳細分析（「あなたは午前中に最も生産的です」等）は
十分なデータ量（数ヶ月の利用履歴）が必要であり、初期実装の ROI が低い。

**間接対応**: 2.2 の執筆セッション管理で時間帯別の執筆量データを蓄積する。
将来的にこのデータを分析してインサイトを提供することは可能。

### 習慣 8 の一部

睡眠管理、運動推奨、マインドフルネス等の一般的なウェルネス機能は
研究支援ツールのスコープを超える。本レイヤーでは「執筆時間の管理」と
「休憩の促し」のみに限定する。

---

## 4. ユーザー設定モデル

全機能の有効/無効と設定値を管理する統一モデル:

```prisma
model UserProductivitySettings {
  id                     String  @id @default(cuid())
  userId                 String  @unique

  // Pomodoro 設定
  pomodoroEnabled        Boolean @default(false)
  pomodoroMinutes        Int     @default(25)
  breakMinutes           Int     @default(5)
  longBreakMinutes       Int     @default(15)
  longBreakInterval      Int     @default(4)  // 何回のポモドーロ後にロング休憩

  // 休憩リマインダー設定
  breakReminderEnabled   Boolean @default(true)
  breakReminderThreshold Int     @default(120)  // 分
  dailyGoalMinutes       Int     @default(240)  // 4 時間

  // 文献ウォッチ設定
  literatureWatchEnabled Boolean @default(false)

  // Achievement 設定
  achievementsEnabled    Boolean @default(true)
  confettiEnabled        Boolean @default(true)

  // 週間サマリーメール
  weeklySummaryEmail     Boolean @default(false)

  user                   User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

API:

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/settings/productivity` | 設定取得 |
| PATCH | `/api/settings/productivity` | 設定更新 |

---

## 5. 既存モデルへの変更

**変更なし。** 全新規モデルは既存テーブルへのリレーションのみ追加。

Document モデルへのリレーション追加（Prisma 側のみ、DB スキーマ変更不要）:

```prisma
// Document モデルに以下のリレーションフィールドを追加
model Document {
  // ... existing fields ...
  milestones          DocumentMilestone[]
  smartGoals          SmartGoal[]
  writingSessions     WritingSession[]
  submissionPlan      SubmissionPlan?
  achievements        Achievement[]
}

// User モデルに以下のリレーションフィールドを追加
model User {
  // ... existing fields ...
  writingSessions       WritingSession[]
  literatureWatches     LiteratureWatch[]
  achievements          Achievement[]
  productivitySettings  UserProductivitySettings?
}
```

---

## 6. UI 変更サマリー

### 6.1 ダッシュボード（既存ページの拡張）

```
+------------------------------------------------------------------+
|  Dashboard                                                        |
|  +------------------------------------------------------------+  |
|  | This Week's Summary (NEW)                                   |  |
|  | [==== 12h 30m written ====] [43 citations] [2 milestones]   |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | Your Documents                                              |  |
|  | +---------------------------+  +---------------------------+|  |
|  | | Paper A                   |  | Paper B                   ||  |
|  | | [======75%======] 3/4 MS  |  | [===30%===] 1/3 MS       ||  |
|  | | Due: Mar 31               |  | Due: Apr 15              ||  |
|  | +---------------------------+  +---------------------------+|  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | Related Papers This Week (NEW)                              |  |
|  | +-----+ +-----+ +-----+ +-----+ +-----+                   |  |
|  | |Paper| |Paper| |Paper| |Paper| |Paper|                   |  |
|  | |Card | |Card | |Card | |Card | |Card |                   |  |
|  | +-----+ +-----+ +-----+ +-----+ +-----+                   |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | Achievements (NEW)                                          |  |
|  | [Badge] [Badge] [Badge] [Badge] [Badge]                    |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 6.2 エディタ（既存ページの拡張）

```
+------------------------------------------------------------------+
| Header: [Doc Title]     [Pomodoro: 18:32 #3] [Today: 2h 15m]    |
|------------------------------------------------------------------|
| Source Pane  |  Manuscript Pane  |  Sidebar                      |
|             |                   |  [Write] [Evidence] [Goals*]   |
|             |                   |                                |
|             |                   |  * Goals tab (NEW):            |
|             |                   |  - Milestones progress         |
|             |                   |  - SMART goals                 |
|             |                   |  - Submission checklist        |
+------------------------------------------------------------------+
```

### 6.3 設定画面（新規タブ追加）

既存の設定画面に「Productivity」タブを追加:

- Pomodoro 設定（時間、有効/無効）
- 休憩リマインダー設定（閾値、有効/無効）
- 文献ウォッチ設定（トピック管理、頻度）
- Achievement 設定（アニメーション有効/無効）
- 週間サマリーメール設定

---

## 7. 実装優先度

### P0（最初に実装、執筆体験に直結）

| 機能 | 工数目安 | 理由 |
|------|---------|------|
| 執筆セッション管理 + Pomodoro | 1-1.5 週間 | エディタの使用体験を直接改善。データ蓄積の基盤 |
| マイルストーン管理 + 進捗バー | 1-1.5 週間 | 論文完成までの道筋を可視化。モチベーション維持 |
| UserProductivitySettings | 0.5 週間 | 全機能の基盤設定 |

**P0 合計: 2.5-3.5 週間**

#### P0 受け入れ基準

**執筆セッション管理:**

- [ ] エディタヘッダーに Pomodoro タイマーウィジェットが表示される
- [ ] Start/Pause/Resume/End の操作ができる
- [ ] ポモドーロ完了時に音声通知 + 休憩タイマーへの自動切り替えが行われる
- [ ] セッション終了時に `wordsWritten` と `citationsAdded` が自動計算される
- [ ] ブラウザを閉じた場合、4 時間後にセッションが自動で ABANDONED になる
- [ ] ダッシュボードに「今週の執筆サマリー」が表示される
- [ ] `/api/sessions/stats` で日別・週別の統計が取得できる
- [ ] 設定画面で Pomodoro の時間をカスタマイズできる

**マイルストーン管理:**

- [ ] ドキュメント設定パネルでマイルストーンの追加/編集/削除ができる
- [ ] マイルストーンの種別（DRAFT_COMPLETE, CITATIONS_COMPLETE 等）を選択できる
- [ ] 期限を設定でき、期限超過時に自動で OVERDUE ステータスになる
- [ ] ダッシュボードの Document カードに進捗バー（完了数/全数）が表示される
- [ ] マイルストーンの並び替え（ドラッグ or sortOrder 変更）ができる
- [ ] SMART 目標を設定でき、`currentValue` / `targetValue` で達成率が表示される

### P1（ユーザー価値が高い）

| 機能 | 工数目安 | 理由 |
|------|---------|------|
| 文献ウォッチ & アラート | 1.5-2 週間 | 既存 API 基盤を再利用。情報の鮮度維持 |
| 達成システム | 1-1.5 週間 | トリガー実装 + UI アニメーション。モチベーション |

**P1 合計: 2.5-3.5 週間**

### P2（投稿準備に有用）

| 機能 | 工数目安 | 理由 |
|------|---------|------|
| 投稿計画 & チェックリスト | 1 週間 | JSON ベースのチェックリスト UI。比較的単純 |
| 休憩リマインダー | 0.5 週間 | クライアントサイドのみ。新規 API 不要 |

**P2 合計: 1-1.5 週間**

### 全体合計: 6-8.5 週間

v2 Phase 3（Team Collaboration）の後、または並行して実施。
P0 は v2 Phase 2 完了後すぐに着手可能（依存関係なし）。

---

## 8. v2 コアシステムとの関係

```
+------------------------------------------------------------------+
|                    Unmute AI v2 Architecture                      |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |              Research Productivity Layer (THIS)              |  |
|  |  +----------+ +----------+ +----------+ +----------+       |  |
|  |  |Milestones| |Sessions  | |Literature| |Achieve-  |       |  |
|  |  |& Goals   | |& Pomodoro| |Watch     | |ments     |       |  |
|  |  +----------+ +----------+ +----------+ +----------+       |  |
|  |  +----------+ +----------+                                  |  |
|  |  |Submission| |Wellness  |                  read-only       |  |
|  |  |Plan      | |Reminders |  <--- triggers from v2 core --  |  |
|  |  +----------+ +----------+                                  |  |
|  +------------------------------------------------------------+  |
|         |               |                |                       |
|         | additive      | additive       | additive              |
|         v               v                v                       |
|  +------------------------------------------------------------+  |
|  |                    v2 Core Systems                          |  |
|  |  +-------------+ +---------------+ +--------------------+  |  |
|  |  | Evidence     | | Paragraph Flow| | Guideline          |  |  |
|  |  | Mapping      | | Analysis      | | Compliance         |  |  |
|  |  +-------------+ +---------------+ +--------------------+  |  |
|  |  +-------------+                                            |  |
|  |  | Evidence     |                    UNCHANGED              |  |
|  |  | Export       |                                           |  |
|  |  +-------------+                                            |  |
|  +------------------------------------------------------------+  |
|         |               |                |                       |
|         v               v                v                       |
|  +------------------------------------------------------------+  |
|  |                    v1 Foundation                            |  |
|  |  TipTap Editor, Translation, Citation Library, Sections    |  |
|  |                           UNCHANGED                         |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 接点

本レイヤーと v2 コアの接点は **Achievement トリガーのみ**:

| v2 コアイベント | Achievement トリガー |
|----------------|---------------------|
| `ManuscriptCitation` 作成 | FIRST_CITATION, CITATIONS_MILESTONE |
| `EvidenceMapping` 作成 | SECTION_EVIDENCE_COMPLETE |
| `EvidenceMapping.humanVerified` 更新 | EVIDENCE_VERIFIED_ALL |
| `DocumentVersion.translatedText` 更新 | DRAFT_COMPLETE |

これらのトリガーは v2 コアの既存コードに **イベント発行ポイントを 1 行追加する**のみで実現し、
コアのロジックには一切影響しない。

```typescript
// Example: in the existing citation creation handler
const citation = await prisma.manuscriptCitation.create({ ... });
// Add this single line:
await achievementService.checkAndAward(userId, "FIRST_CITATION", { documentId });
```

---

## 9. 技術的考慮事項

### 9.1 パフォーマンス

- Pomodoro タイマーはクライアントサイドで動作（`setInterval`）。サーバーへの通信はセッション開始/終了時のみ
- 文献ウォッチのバッチ処理は Vercel Cron で非同期実行。ユーザーのリクエストパスに影響しない
- Achievement チェックは非同期（`achievementService.checkAndAward` は fire-and-forget）

### 9.2 データ量見積もり

| モデル | 1 ユーザーあたり/月 | 1000 ユーザー/年 |
|--------|---------------------|------------------|
| DocumentMilestone | ~20 rows | ~240K rows |
| SmartGoal | ~10 rows | ~120K rows |
| WritingSession | ~60 rows | ~720K rows |
| LiteratureWatchResult | ~20 rows | ~240K rows |
| Achievement | ~5 rows | ~60K rows |

全て軽量な行であり、Neon PostgreSQL の Hobby プランでも十分対応可能。

### 9.3 マイグレーション

全て新規テーブルの追加のみ。`prisma migrate dev` で安全に適用可能。
既存テーブルの変更はないため、ダウンタイムなしでデプロイ可能。

---

## 10. 将来の拡張可能性

本レイヤーは将来的に以下の拡張が可能:

1. **AI による目標提案**: 論文の現状（引用数、セクション充実度）から次のマイルストーンを提案
2. **生産性パターン分析**: WritingSession データから「最も生産的な時間帯」「平均ポモドーロ数」を分析
3. **チーム進捗ダッシュボード**: v2 Phase 3 の Team Collaboration と連携し、チーム全体の進捗を可視化
4. **ジャーナル DB 連携**: ジャーナルの投稿要件をデータベース化し、自動でチェックリストを生成
5. **共著者推薦**: LiteratureWatch のデータから、関連分野の活発な研究者をサジェスト
