# Project Design Document

> This document tracks design decisions made during conversations.
> Updated automatically by the `design-tracker` skill.

## Overview

Claude Code Orchestra is a multi-agent collaboration framework. Claude Code (200K context) is the orchestrator, with Codex CLI for planning/design/complex code, Gemini CLI (1M context) for codebase analysis, research, and multimodal reading, and subagents (Opus) for code implementation and Codex delegation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code Lead (Opus 4.6 — 200K context)                      │
│  Role: Orchestration, user interaction, task management           │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Agent Teams (Opus)    │  │ Subagents (Opus)      │             │
│  │ (parallel + comms)    │  │ (isolated + results)  │             │
│  │                       │  │                       │             │
│  │ Researcher ←→ Archit. │  │ Code implementation   │             │
│  │ Implementer A/B/C     │  │ Codex consultation    │             │
│  │ Security/Quality Rev. │  │ Gemini consultation   │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
│  External CLIs:                                                   │
│  ├── Codex CLI (gpt-5.4) — planning, design, complex code  │
│  └── Gemini CLI (1M context) — codebase analysis, research,      │
│       multimodal reading                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Roles

| Agent | Role | Responsibilities |
|-------|------|------------------|
| Claude Code (Main) | Overall orchestration | User interaction, task management, simple code edits |
| general-purpose (Opus) | Implementation & Codex delegation | Code implementation, Codex delegation, file operations |
| gemini-explore (Opus) | Large-scale analysis & research | Codebase understanding, external research, multimodal reading |
| Codex CLI | Planning & complex implementation | Architecture design, implementation planning, complex code, debugging |
| Gemini CLI (1M context) | Analysis, research & reading | Codebase analysis, external research, multimodal reading |

## Implementation Plan

### Patterns & Approaches

| Pattern | Purpose | Notes |
|---------|---------|-------|
| Agent Teams | Parallel work with inter-agent communication | /startproject, /team-implement, /team-review |
| Subagents | Isolated tasks returning results | External research, Codex consultation, implementation |
| Skill Pipeline | `/startproject` → `/team-implement` → `/team-review` | Separation of concerns across skills |

### Libraries & Roles

| Library | Role | Version | Notes |
|---------|------|---------|-------|
| Codex CLI | Planning, design, complex code | gpt-5.4 | Architecture, planning, debug, complex implementation |
| Gemini CLI | Multimodal file reading | gemini-3-pro | PDF/video/audio/image extraction ONLY |

### Key Decisions

| Decision | Rationale | Alternatives Considered | Date |
|----------|-----------|------------------------|------|
| Unmute AI's section-aware manuscript workspace should keep `DocumentVersion.sourceText` / `translatedText` as flat bilingual strings and add persisted section metadata on each version (`sections` JSON keyed to source-text paragraph/character boundaries), with heading detection used only to seed or suggest boundaries | The current translation/editor pipeline is explicitly flat-text and paragraph-preserving (`\n\n` separators, sentence alignment, full-document save/restore). Version-scoped metadata adds section rails, workflow tabs, and section coverage without breaking bilingual sync, while keeping existing documents backward compatible by treating missing metadata as a single `OTHER` section. It also gives evidence/review/export flows a stable section source of truth that is more reliable than re-detecting headings on every load and far cheaper than splitting the manuscript into separate section rows | Heading detection only in UI state (lowest effort but unreliable and non-persistent for citations/coverage/export), or a normalized `DocumentSection` table with per-section text columns (more structured but high migration cost and a poor fit for the current flat translation/editor flow) | 2026-03-15 |
| Remaining Unmute AI paper-writing features should ship in four phases: `(1) bibliographic metadata + structured citation foundation`, `(2) section-aware manuscript workspace`, `(3) dashboard/onboarding activation`, `(4) export + paper-graph leverage` | This order minimizes rework across the current translation-first codebase: schema and TipTap citation primitives must land before section-aware editing and export, the workspace shell should stabilize before acquisition flows seed it, and export should wait until manuscript sections + inline citation objects are no longer changing underneath it | Redesign dashboard/onboarding first (higher user-visible change but seeds the wrong model), ship export before section/citation foundations settle (high rewrite risk), or keep improving raw `\\cite{}` string insertion and retrofit rich citations later | 2026-03-15 |
| Auth.js should keep `PrismaAdapter` on the unfiltered Prisma client (`prismaAdmin`), while normal app code uses the soft-delete-filtered `prisma`; deleted-user sign-in must be blocked in Auth callbacks and active DB sessions must be deleted during admin soft-delete | Applying the soft-delete filter directly inside the adapter risks OAuth/email sign-in edge cases such as duplicate-user creation or account-link lookups missing a soft-deleted row; splitting adapter vs app clients keeps Auth.js compatible while still making deleted users inaccessible in product flows | Put the filtered client behind the adapter too (higher risk of Auth.js edge-case regressions), or avoid Prisma `$extends` and rely only on route-level `deletedAt: null` checks | 2026-03-14 |
| Admin user management should use `User.deletedAt` / `deletedBy` soft-delete fields with a Prisma client extension that hides deleted users by default and exposes an explicit admin bypass | Soft delete preserves auditability, allows restore, and prevents deleted accounts from leaking into normal product flows; centralizing the filter in Prisma is safer than relying on every call site to remember `deletedAt: null` | Hard delete the user (simple but loses recovery/audit trail), add ad-hoc `where.deletedAt = null` to each query (easy to miss and causes regressions) | 2026-03-14 |
| Admin write actions should be implemented as dedicated route handlers under `/api/admin/users/[id]/...`, guarded server-side with `requireAdmin`-equivalent checks and dual audit logs (`PlanChangeLog` for effective plan changes, `AdminActionLog` for all admin mutations) | Per-action route handlers fit the existing App Router API structure, keep authorization close to the mutation, and make each action easier to validate, test, and audit independently | A single multiplexed `/api/admin/users/[id]` endpoint (more branching and harder auditing), server actions from the admin table (less explicit API boundary and weaker separation from UI) | 2026-03-14 |
| Soft-deleting a user should immediately cancel any active Stripe subscription, clear plan overrides, delete active sessions, and make Stripe webhooks no-op for that user until restored | Admin deletion is an operational removal, so access and billing should stop immediately; clearing sessions and webhook side effects prevents deleted users from continuing to use the app or being reactivated indirectly by later Stripe events | Cancel at period end (keeps access for a deleted account), leave sessions intact until expiry, continue applying webhook updates to soft-deleted rows | 2026-03-14 |
| Admin user mutations should flow through a shared server-side service that writes `AdminActionLog` with actor/target metadata plus before/after snapshots, runs DB mutations and session invalidation transactionally, and treats restore as account reactivation only (not Stripe subscription resurrection) | Centralizing the mutation logic avoids divergence between per-action route handlers, guarantees consistent audit records, and makes the irreversible billing side-effect explicit: once a subscription is canceled on delete, restore should bring the account back as `FREE` unless an admin/user reassigns plan access | Duplicate mutation logic inside each route handler, or attempt to recreate canceled Stripe subscriptions automatically during restore | 2026-03-14 |
| Unmute AI admin analytics should live in a dedicated locale-aware `/admin` surface, not under the user-facing `/settings` area | Admin workflows, global metrics, and access rules are operational concerns distinct from end-user account settings; separating the surface avoids mixing user self-service analytics with privileged business reporting | Nest admin under `/settings/admin` for layout reuse, or merge admin charts into existing `/settings/analytics` | 2026-03-14 |
| Admin access should use a persisted `User.role` enum with server-side `requireAdmin()` checks | A database-backed role is simple, explicit, and works across layouts, pages, and route handlers without relying on mutable environment whitelists; server-side guards avoid per-request middleware DB checks | `isAdmin` boolean (simpler but less extensible), email allowlist in env (no migration but poor operability/auditability) | 2026-03-14 |
| Page views should be captured with a lightweight client-side beacon to an ingestion route, while middleware only issues a stable anonymous visitor cookie | Beacon tracking avoids adding DB writes to the main request path, works for locale-prefixed routes, and lets the server enrich events with Vercel geo headers; middleware cookie issuance is cheap and keeps visitor identity stable without DB access at the edge | Write page views directly from middleware (higher latency/cost and awkward with Prisma), server-only logging on page render (misses client navigations) | 2026-03-14 |
| Plan transitions should be recorded in a dedicated `PlanChangeLog` table sourced from Stripe webhooks and admin override flows | Current `User.plan` stores only latest state; historical logs are required for upgrade/downgrade charts, funnel conversion checks, and auditability | Infer history from Stripe only (external dependency and harder queries), overwrite-only `User` fields with no log | 2026-03-14 |
| Pricing conversion in v1 should use a stable `visitorId` cookie on `PageView`, then bridge to `userId` once the visitor signs in and eventually upgrades within an attribution window | This keeps the schema small while enabling a practical three-step funnel (`pricing visit` -> `signed-in visitor` -> `paid upgrade`) on the same device/browser without a separate checkout attribution table | Strict signed-in-only attribution (simpler but loses signup linkage), full checkout/session attribution tables (more accurate but more schema and webhook complexity) | 2026-03-14 |
| Raw `PageView` events should be retained short-term and rolled up daily for long-term reporting | Raw events are useful for debugging and recent funnels, but daily rollups keep Neon storage/query cost predictable for a solo project | Keep raw events forever (simplest initially but unbounded growth), aggregate-only with no raw events (loses debug detail and recent funnel flexibility) | 2026-03-14 |
| Unmute AI should evolve from a translation-first editor into an evidence-grounded paper writing accelerator that lets researchers think in their native language while producing submission-ready manuscripts | Translation remains the wedge, but long-term retention and pricing power come from owning the workflow from research artifacts and evidence discovery to cited drafting, journal packaging, and revision; this aligns directly with the `100x faster` vision better than staying a narrower translation utility | Stay a translation-only SaaS, or reposition as a generic AI writer without domain grounding | 2026-03-14 |
| The defensible core should be a claim/evidence/citation graph built on top of external scholarly metadata providers (`OpenAlex`, `Crossref`, `Semantic Scholar`, `PubMed`/`Europe PMC`, `Unpaywall`, `ORCID`, `ROR`, `J-STAGE`, `CiNii`) plus first-party user interaction data | External providers solve breadth, freshness, and identifier normalization; Unmute AI should invest its own engineering in provenance tracking, section-aware retrieval/ranking, bilingual UX, and trust scoring instead of replicating the open scholarly graph from scratch | Build a closed corpus by scraping/storing papers directly, or rely on ad-hoc web search and prompts without a persistent graph | 2026-03-14 |
| Roadmap priority should be `citation-grounded introduction workflows` and `results/methods articulation from research artifacts` before broader generic drafting or submission automation | Introduction and related-work writing are the biggest citation bottlenecks, while methods/results articulation is where translation-first bilingual UX can surface unique value; solving these first creates a stronger habit loop than launching shallow all-sections generation | Prioritize a generic section writer first, or jump directly to cover-letter/submission automation | 2026-03-14 |
| Unmute AI's product architecture should be organized around four long-term capability pillars: `Evidence Discovery`, `Claim-to-Citation Authoring`, `Artifact-to-Draft Grounded Writing`, and `Submission & Revision Operations` | These pillars map to the real researcher workflow from evidence gathering to manuscript assembly and post-review iteration; they also align cleanly with a phased roadmap where each new layer compounds the value of the existing translation/editor foundation instead of creating disconnected point features | Ship a broad set of unrelated AI helpers, or focus only on literature discovery without owning manuscript creation | 2026-03-14 |
| Build-vs-integrate should favor integrating open scholarly infrastructure for metadata and identity, while building the ranking, provenance, bilingual UX, and manuscript orchestration layers in-house | External APIs already solve broad coverage, canonical IDs, and baseline search, but they do not solve section-aware citation recommendation, claim traceability, artifact-grounded drafting, or trust UX for multilingual authors; those are the surfaces where Unmute AI can differentiate | Build a proprietary academic index from scratch, or outsource the entire writing experience to third-party research copilots | 2026-03-14 |
| The SaaS tier ladder should progress from `translation/editing utility` to `evidence-grounded writing system` by gating on workflow depth rather than raw token volume | Tiering by depth of workflow preserves margins and makes upgrades intuitive: free users can experience bilingual editing, Pro users unlock grounded citation and section workflows, and Max users unlock team collaboration, larger evidence workspaces, reviewer-response automation, and institution-facing controls | Compete primarily on unlimited generations, or monetize only via per-paper credits | 2026-03-14 |
| Scholarly provider roles should be explicitly split: `OpenAlex` as the paper/entity backbone, `Semantic Scholar` for citation-context enrichment and influence signals, `Crossref` for DOI normalization, `arXiv` for open preprint/full-text entry points, and `J-STAGE` / `CiNii` for Japan-specific recall | No single provider is sufficient on coverage, freshness, or citation context; a role-based split keeps ingestion understandable, reduces upstream lock-in, and preserves strong recall for Japanese researchers without forcing Unmute AI to mirror the full scholarly web | Treat all providers as interchangeable replicas, or choose a single upstream and accept blind spots in citation edges, preprints, and Japan-local content | 2026-03-14 |
| Citation-grounded authoring should use a hybrid RAG stack that combines canonical graph retrieval, metadata filters, lexical search, vector search over abstracts or permitted full text, and section-aware reranking before any drafting model is invoked | Academic authoring needs transparent provenance and high precision more than generic semantic similarity; hybrid retrieval reduces hallucinated citations, gives users inspectable evidence trails, and can adapt ranking by manuscript section and target journal | Pure vector RAG over a paper corpus, or prompt-only citation suggestion without a persistent retrieval layer | 2026-03-14 |
| AI-generated citations must come exclusively from a `Verified Citation Ledger` backed by provider-verified identifiers (`DOI`, `PMID`, `PMCID`, `arXiv`) in the canonical paper store; the LLM must never emit free-text bibliography entries or raw author-title-year guesses | This makes non-existent-paper hallucinations structurally impossible inside the AI pipeline: references are selected by foreign key from verified records and rendered deterministically into citation text/BibTeX/References only after identifier resolution succeeds | Let the model draft citation strings directly and validate later, or accept partially matched references without canonical IDs | 2026-03-14 |
| Literature-backed manuscript text should be generated from structured `Claim Cards` that are created only after verification binds each claim to concrete abstract/full-text evidence spans plus support/uncertainty labels; any sentence fragment that cannot be mapped back to approved claim cards must be rejected before it reaches the accepted draft state | This turns attribution checking from a best-effort prompt into a gating invariant: the system stores evidence-first propositions, compiles prose from those propositions, and runs a claim-coverage check that blocks unsupported or over-broadened statements | Let the writer model compose freely and rely on a post-hoc reviewer prompt only, or keep provenance at the paper level without span-level evidence binding | 2026-03-14 |
| The citation safety pipeline should be split into four explicit agents/jobs: `Discovery`, `Verification`, `Grounded Writing`, and `Adversarial Review`, orchestrated around the canonical paper/evidence graph with human approval gates on low-confidence evidence and final acceptance | Separating recall, truth checking, prose generation, and adversarial critique keeps each stage inspectable, testable, and replaceable; it also prevents the drafting model from short-circuiting provider verification or silently smuggling in unsupported facts | A single end-to-end writing agent with tool use, or a two-stage retrieve-then-write flow without an explicit adversarial gate | 2026-03-14 |
| Citation-grounded UX should keep `/documents/[id]` as the primary write workspace with an on-demand evidence drawer, while adding document-scoped `/documents/[id]/citations` and `/documents/[id]/review` views for dense citation management and approval tasks | Discovery, verification, and insertion are writing-adjacent and should stay beside the manuscript, but library management, coverage audits, exports, and review triage need more space than a sidebar; this hybrid model preserves the translation-first editor while still supporting evidence-heavy workflows | Build a separate citation product surface, or force all citation/review tasks into the editor only | 2026-03-14 |
| The grounded editor layout should be adaptive rather than permanently tri-pane: default to the existing two-pane bilingual editor, open evidence as a contextual third pane on demand, and allow a manuscript-focus mode that collapses the source pane when evidence work is active | A permanent third pane would crowd common laptop widths and degrade translation-only workflows; adaptive expansion keeps Free users and simple translation tasks fast while giving Pro workflows room for search, snippets, claims, and review | Permanent 3-panel layout at all times, or modal-only evidence flows detached from the document context | 2026-03-14 |
| Paragraph-level actions and sentence coverage markers should be the primary grounded-writing triggers, with automatic suggestions kept secondary and non-blocking | The current editor architecture can adopt hover/gutter affordances faster and more cleanly than a heavy inline command system; paragraph-scoped entry points keep retrieval, citation insertion, and coverage review targeted instead of noisy | Auto-run citation search while the user types, or require users to leave the editor for a separate search workflow | 2026-03-14 |
| Evidence-first UI should be expressed through workflow framing rather than a permanent always-open research pane: the dashboard becomes a paper workspace with `Discover` / `Prove` / `Ship` progress and per-document evidence metrics, new document creation becomes a `Start new paper` brief seeded by research topic/journal/language, and each document promotes `Write` / `Citations` / `Review` plus a persistent citation-coverage summary above the editor | The current hidden header button makes Evidence feel optional; surfacing evidence state at the dashboard, creation flow, and document navigation levels makes the product read as a paper-writing accelerator while still reusing the existing editor and drawer architecture in a 2-3 week implementation window | Permanent tri-pane as the main differentiator, a top-level global research product detached from documents, or keeping Evidence as a small optional button in the editor header | 2026-03-15 |
| Citation Auto-Pilot should be implemented as a document-scoped, resumable workflow backed by `AgentRun` session snapshots rather than a new dedicated session table; `analyze` compiles the latest manuscript into a queue of citation-needing sentences, `suggest` lazily fetches and ranks 3-5 candidate papers per sentence, and `accept`/`skip` mutates manuscript text plus `ManuscriptCitation` while advancing progress | Reusing `AgentRun` fits the existing schema, keeps v1 storage minimal, enables resume/debugging, and cleanly separates transient workflow state from the canonical citation ledger; lazy per-sentence suggestion plus prefetch keeps latency low without paying to retrieve papers for an entire manuscript up front | Add a new `AutoPilotSession` table immediately, or precompute/search every citation sentence eagerly before the first review step | 2026-03-15 |
| Auto-Pilot citation insertion should remain deterministic and DB-first: accepted papers must already exist as verified `CanonicalPaper` rows, cite keys are generated server-side with document-level uniqueness checks, BibTeX is rendered from canonical metadata, and duplicate acceptance of the same paper should reuse the existing `ManuscriptCitation` row and cite key instead of creating parallel entries | This preserves the `Verified Citation Ledger` invariant, prevents hallucinated bibliography strings, avoids duplicate references when one paper supports multiple sentences, and keeps manuscript text, citation records, and BibTeX export in sync | Let the client synthesize cite keys/BibTeX, or create a new citation row every time a paper is accepted for a sentence | 2026-03-15 |
| Auto-Pilot v1 should target the current plain-text editor by inserting raw `\cite{key}` tokens, while storing each citation occurrence in a dedicated anchor layer separate from document-level `ManuscriptCitation` bibliography membership | The current TipTap setup uses `PlainTextOnly`, so raw LaTeX token insertion is the safest near-term fit; splitting repeated sentence-level anchors from document-level bibliography rows preserves clean deduplication, enables later chip rendering, and supports replace/remove flows without breaking BibTeX export | Delay Auto-Pilot until a rich citation-chip editor exists, or overload `ManuscriptCitation` to represent both bibliography membership and every inline occurrence | 2026-03-15 |
| Unmute AI account surfaces should be consolidated into a shared `/settings` hub with subpages for `profile`, `preferences`, `billing`, and `analytics` | A single settings shell gives non-technical researchers one predictable place for account, plan, and preference tasks, and it scales better than mixing sheets and standalone pages | Keep the editor Sheet as a parallel settings surface while leaving billing/analytics on separate pages | 2026-03-13 |
| The settings hub should use route-based subpages (`/settings/profile`, `/settings/preferences`, etc.) inside a shared layout instead of one client-only tab page | Deep links, browser history, server rendering, and existing `/settings/billing` routing all fit better with nested routes than in-memory tabs | Single `/settings` page with client-side tab state only | 2026-03-13 |
| Editor gear should stop being the primary settings Sheet and instead link directly to `/settings/preferences` with a return-to-editor affordance | Billing, profile, and analytics need full-page space; using the gear as a shortcut preserves familiarity without maintaining two competing settings UIs | Expand the current right Sheet into a fuller editor-side settings center | 2026-03-13 |
| Editor should keep only document-scoped translation controls inline, while account-level defaults move into settings preferences | Source/target language and journal style affect the active translation and must remain one-click controls; defaults, help, and app behavior belong in account settings | Move all translation controls into settings, or keep defaults/account preferences mixed into the toolbar | 2026-03-13 |
| UserMenu should become the shared account navigation entry point on dashboard and editor, with links to settings, billing, and usage | The avatar is already present across authenticated surfaces, so expanding it improves discoverability without adding more permanent global navigation | Keep logout-only avatar menu and add new header-level links | 2026-03-13 |
| Unmute AI usage analytics should be a standalone settings page at `/settings/analytics` | Analytics is a recurring operational workflow distinct from plan management; separating it keeps billing focused while still keeping both pages adjacent in settings | Add charts into `/settings/billing` (simpler nav but mixes subscription management with exploratory analysis) | 2026-03-13 |
| Billing and analytics should live inside the shared settings local navigation instead of becoming new top-level global links | The current global header stays minimal while the settings shell handles deeper account workflows in one place | Add top-level navigation items for billing/analytics in the main header | 2026-03-13 |
| Usage analytics data should be fetched via route handler with `granularity` query params | The chart needs client-driven granularity switching and shareable/filterable URLs; a route handler fits repeated fetches better than server actions | Server action (works for form submissions but adds friction for interactive filter changes) | 2026-03-13 |
| Granularity controls should map to fixed default windows (`hour`=24h, `day`=30d, `week`=12w, `month`=12m) | This keeps the UI simple, avoids an additional date picker, and prevents unreadable bar counts on small screens | Expose a fully custom date range in v1 | 2026-03-13 |
| The analytics page should prioritize a ranked model cost breakdown below the main bar chart | Users want quick answers to "what model costs most?"; a sorted breakdown is easier to scan than encoding ranking only in chart colors | Multi-series chart only, no dedicated breakdown section | 2026-03-13 |
| Recharts should be the initial chart library through shadcn/ui's chart wrapper | It aligns with the existing shadcn/ui stack, matches current chart CSS tokens, and reduces custom chart scaffolding | Tremor (heavier abstraction), Nivo (larger surface area), custom SVG (too much effort for initial feature) | 2026-03-13 |
| Editor header should remove inline cost display once analytics page exists | Editor header should prioritize document actions; cost analysis belongs to a dedicated usage surface | Keep cost in header and add analytics page (duplicates spend information in a cramped area) | 2026-03-13 |
| UI internationalization should use `next-intl` as the primary path, with locale-aware routing for public pages and shared message catalogs for authenticated surfaces | `next-intl` fits Next.js App Router + Server Components well, supports locale routing and SEO-friendly localized URLs, and is the lowest-risk choice for a small team with ~200-300 strings | Paraglide.js (strong type-safety/compile-time optimization but higher adoption risk), request-time LLM translation (high latency/cost/SEO risk) | 2026-03-13 |
| I18n routing should be split by surface: locale-prefixed URLs for public marketing/legal pages, and stable authenticated app routes that resolve locale from user preference or cookie | Public pages need crawlable localized URLs, `hreflang`, and shareable SEO-safe metadata; authenticated SaaS pages benefit more from simpler routing and fewer auth + locale middleware edge cases | Locale-prefix every route including dashboard/editor, or avoid locale routing entirely and use cookie-only locale selection | 2026-03-13 |
| Request-time LLM translation should not be the primary UI i18n mechanism; use LLMs only to bootstrap translation drafts or assist human review | UI strings need deterministic output, stable terminology, static SEO metadata, and predictable latency; model calls on render add operational and caching complexity without enough benefit at this scale | Fully runtime-translated UI via Gemini API | 2026-03-13 |
| Gemini role expanded to codebase analysis + research + multimodal | Gemini CLI has native 1M context; Claude Code is 200K; delegate large-context tasks to Gemini | Keep Claude for codebase analysis (requires 1M Beta) | 2026-02-19 |
| All subagents default to Opus | 200K context makes quality of reasoning more important than context size; Opus provides better output | Sonnet (cheaper but 200K same as Opus, weaker reasoning) | 2026-02-19 |
| Agent Teams default model changed to Opus | Consistent with subagent model selection; better reasoning for parallel tasks | Sonnet (cheaper) | 2026-02-19 |
| Claude Code context corrected to 200K | 1M is Beta/pay-as-you-go only; most users have 200K; design must work for common case | Assume 1M (only works for Tier 4+ users) | 2026-02-19 |
| Subagent delegation threshold lowered to ~20 lines | 200K context requires more aggressive context management | 50 lines (was based on 1M assumption) | 2026-02-19 |
| Codex role unchanged (planning + complex code) | Codex excels at deep reasoning for both design and implementation | Keep Codex advisory-only | 2026-02-17 |
| /startproject split into 3 skills | Separation of Plan/Implement/Review gives user control gates | Single monolithic skill | 2026-02-08 |
| Agent Teams for Research ↔ Design | Bidirectional communication enables iterative refinement | Sequential subagents (old approach) | 2026-02-08 |
| Agent Teams for parallel implementation | Module-based ownership avoids file conflicts | Single-agent sequential implementation | 2026-02-08 |

## TODO

### Agent Teams (internal tooling — not user-facing)
- [ ] Test Agent Teams workflow end-to-end with a real project
- [ ] Update hooks for Agent Teams quality gates
- [ ] Evaluate optimal team size for /team-implement

### Settings & User Management
- [x] Build shared `/settings` layout and nested routes for profile, preferences, billing, and analytics
- [x] Expand `UserMenu` into a dropdown/sheet with settings, billing, and usage links on authenticated surfaces
- [x] Replace the editor `SettingsPanel` Sheet with a shortcut link to `/settings/preferences` plus return-to-editor support
- [x] Add preferences page for default languages, default journal, shortcuts/help, and future editor behavior toggles
- [x] Implement Unmute AI usage analytics page (`/settings/analytics`) with model cost bar chart and breakdown table
- [x] Add shared settings navigation for profile, preferences, billing, and analytics pages

### Admin & Analytics Infrastructure
- [x] Add `User.role` enum, session typing, and shared `requireAdmin()` guard for admin-only pages and APIs
- [x] Add `PageView`, `PageViewDaily`, and `PlanChangeLog` tables plus supporting indexes for global analytics
- [x] Implement a reusable page-view beacon component and ingestion route that normalizes locale-prefixed paths and records Vercel geo headers
- [x] Extend Stripe/admin plan mutation flows to append `PlanChangeLog` rows on effective plan changes
- [x] Build a dedicated `/admin` analytics surface with overview, acquisition, and plans/conversion sections
- [x] Add `User.updatedAt`, `deletedAt`, `deletedBy`, and `AdminActionLog`, then regenerate Prisma client and backfill migration-safe defaults
- [x] Introduce a Prisma user soft-delete extension with an explicit admin bypass path for deleted-user queries
- [x] Add admin user mutation endpoints for role change, plan override, soft delete, and restore with self-protection checks
- [x] Invalidate deleted-user sessions on admin delete and block deleted users in Auth.js sign-in/session callbacks
- [x] Skip Stripe webhook updates for soft-deleted users and immediately cancel Stripe subscriptions during admin deletion
- [x] Extend the admin users table with deleted-user filtering, action menus, confirmation dialogs, and localized success/error toasts
- [x] Add a daily rollup + cleanup job for `PageView` raw events
- [x] Add shared analytics aggregation helpers for hour/day/week/month grouping and cumulative model cost
- [ ] Remove editor header cost display after analytics page launches
- [ ] Remove unused client-side editor cost tracking code if no other surface depends on it

### Citation & Evidence System
- [x] Integrate scholarly metadata providers for citation grounding: `OpenAlex`, `Crossref`, `Semantic Scholar`, `PubMed`/`Europe PMC`, `Unpaywall` — (J-STAGE/CiNii: not yet)
- [x] Build a citation knowledge graph with canonical IDs (`DOI`, `PMID`, `arXiv`), provenance snapshots, and claim-to-source traceability — (ORCID/ROR: not yet, retraction flags: not yet)
- [x] Define provider adapters with explicit roles: `OpenAlex` backbone, `Crossref` DOI normalization, `arXiv` preprint ingestion — (J-STAGE/CiNii: not yet)
- [x] Implement hybrid citation retrieval that combines metadata filters, lexical search, and section-aware reranking with inspectable provenance
- [x] Add a `Verified Citation Ledger` schema and API so AI-generated references can only be inserted from provider-verified canonical paper rows, never from free-text model output
- [x] Add `Claim Card` / evidence-span extraction and claim-coverage validation so every literature-backed sentence is rejected unless it maps to approved evidence snippets
- [x] Implement a four-stage citation safety orchestrator (`Discovery` -> `Verification` -> `Grounded Writing` -> `Adversarial Review`) with human approval gates for low-confidence evidence and final draft acceptance
- [x] Ship a citation-grounded Introduction/Related Work workflow that proposes claims, surfaces supporting/contradicting papers, and inserts attribution with confidence + provenance

### Editor & Workspace UX
- [x] Add document workflow tabs (`Write` / `Citations` / `Review`) plus a section rail to the existing editor
- [x] Build a contextual evidence drawer for discovery, inspection, gap analysis, and grounded drafting inside `/papers/[id]`
- [x] Add evidence mapping panel with human verification UI inside Citations tab
- [x] Redesign the dashboard into a paper workspace with evidence-aware document cards, workflow status, and progress visualization
- [x] Replace the simple create button with a `Start new paper` flow that captures topic, target journal, and language pair
- [x] Add a sticky citation-coverage summary bar and primary evidence CTA inside the document workspace so Evidence is visible even when the drawer is closed
- [x] Add persistent journey sidebar with GitHub-style progress visualization (7 phases × 27 tasks)
- [x] Add Pomodoro timer, writing session tracking, and milestone management

### Remaining (not yet implemented)
- [ ] J-STAGE / CiNii integration for Japan-local academic discovery
- [ ] ORCID / ROR integration for author and institution identification
- [ ] Retraction/update flags on CanonicalPaper for citation safety
- [ ] Embedding-based semantic search for citation retrieval
- [ ] Document-scoped `/papers/[id]/citations` and `/papers/[id]/review` standalone pages (currently tabs within editor)
- [ ] Default new Pro/Max paper flows into Introduction-focused grounded writing with the evidence drawer/examples visible above the fold
- [ ] Implement Citation Auto-Pilot APIs: `/api/evidence/autopilot/analyze`, `/api/evidence/autopilot/suggest`, and `/api/evidence/autopilot/accept` with `AgentRun`-backed session snapshots and per-sentence progress
- [ ] Persist provider payloads into `ProviderSnapshot` during verification and normalize bibliographic metadata (authors, container title, publisher, volume/issue/pages when available) so BibTeX export does not depend on ad-hoc live lookups
- [ ] Add a document text patching helper that inserts/reuses `\\cite{key}` at sentence-aware offsets in the latest manuscript version without corrupting adjacent punctuation or multilingual sentence boundaries
- [ ] Build server-side cite-key and BibTeX generation utilities on top of verified `CanonicalPaper` + `PaperIdentifier` metadata, with document-level deduplication through `ManuscriptCitation`
- [ ] Add a per-occurrence citation anchor model separate from `ManuscriptCitation` so repeated inline uses of one paper can be tracked, replaced, removed, and later rendered as chips
- [ ] Add an Auto-Pilot review panel inside the evidence drawer with sentence queue, candidate cards, skip/accept actions, progress metrics, and next-sentence prefetch
- [ ] Add artifact-to-draft workflows for Results and Methods using tables, figure captions, analysis notes, and protocol text as grounded inputs
- [ ] Add revision workflows for reviewer response letters, resubmission diffs, and journal package assembly after the core writing/citation flows are reliable
- [ ] Phase 1: extend the existing editor with evidence cards, citation insertion with provenance, reference import/export, AI-use disclosure logging, and journal submission check upgrades
- [ ] Phase 2: ship section-aware Introduction/Related Work copilot, claim coverage gap detection, and grounded Results/Methods drafting from uploaded artifacts
- [ ] Phase 3: add team workspaces, reviewer response workflows, lab knowledge reuse, and institution-aware trust/compliance controls
- [ ] Phase 4: explore adaptive co-author agents, manuscript-to-submission automation, and cross-paper lab memory built from verified first-party interaction data
- [ ] Introduce locale-aware routing (`[locale]` segment or equivalent) and merge it with existing auth middleware behavior
- [ ] Split routing strategy between public locale-prefixed pages and authenticated locale-from-preference pages
- [ ] Extract UI copy into message catalogs for `ja` + `en` first, then expand to additional UI locales as needed
- [ ] Localize metadata, canonical URLs, and `hreflang` for landing/pricing/legal pages
- [ ] Keep LLM-assisted translation generation as an internal content ops tool, not a request-time UI dependency

## Open Questions

- [ ] Optimal team size for /team-implement (2-3 vs 4-5 teammates)?
- [ ] Should /team-review be mandatory or optional?
- [ ] How to handle Compaction in long Agent Teams sessions?

## Changelog

| Date | Changes |
|------|---------|
| 2026-03-15 | Recorded section-aware document model decision: keep flat bilingual `DocumentVersion` text, persist per-version `sections` metadata as the source of truth, and use heading detection only as a boundary seeding aid |
| 2026-03-14 | Added admin user mutation implementation detail: use a shared service with transactional audit logging/session invalidation, and restore reactivates the account without recreating canceled Stripe subscriptions |
| 2026-03-14 | Clarified Auth.js soft-delete implementation: keep PrismaAdapter on unfiltered `prismaAdmin`, use filtered `prisma` for app queries, and enforce deleted-user blocking via callbacks plus session invalidation |
| 2026-03-14 | Recorded admin user management design: User soft-delete via Prisma extension, dedicated admin mutation endpoints with audit logs, and immediate Stripe/session teardown on admin delete |
| 2026-03-14 | Refined Unmute AI admin analytics funnel design: `PageView` keeps stable `visitorId` + optional `userId` so pricing visits can be bridged to later signup/login and paid conversion without an extra attribution table |
| 2026-03-14 | Recorded Unmute AI admin analytics decisions: dedicated `/admin` surface, `User.role`-based admin access, client beacon page-view tracking, `PlanChangeLog`, user-based pricing funnel attribution, raw-event rollup retention |
| 2026-03-14 | Recorded Unmute AI long-term product strategy: reposition around evidence-grounded paper acceleration, build a citation knowledge graph on external scholarly APIs, and prioritize introduction citation + results/methods articulation workflows |
| 2026-03-14 | Expanded Unmute AI product strategy: defined four capability pillars, clarified build-vs-integrate boundaries around open scholarly infrastructure, and added a phased roadmap from editor extensions to revision/submission automation |
| 2026-03-14 | Refined Unmute AI scholarly data strategy: split provider responsibilities across OpenAlex / Semantic Scholar / Crossref / arXiv / Japan-local sources, and standardized on hybrid graph + lexical + vector RAG for citation-grounded drafting |
| 2026-03-14 | Recorded citation safety architecture: verified citation ledger, evidence-bound claim cards, and a four-stage discovery/verification/writing/review pipeline with human gates on low-confidence evidence |
| 2026-03-14 | Added citation-grounded workspace UX decisions: keep the editor as the primary surface, use an adaptive evidence drawer, and split dense citation/review tasks into document-scoped `Citations` and `Review` pages |
| 2026-03-15 | Refined the evidence-first UI direction: move Evidence prominence up to the dashboard, new-paper onboarding, and document workflow framing (`Write` / `Citations` / `Review` + coverage summary) instead of relying on a small optional editor button |
| 2026-03-15 | Recorded Citation Auto-Pilot design: reuse `AgentRun` for resumable per-document session state, keep accepted citations canonical in `ManuscriptCitation`, and use lazy suggestion with next-sentence prefetch plus deterministic server-side cite-key/BibTeX generation |
| 2026-03-15 | Refined Citation Auto-Pilot implementation detail: v1 uses raw plain-text `\cite{}` insertion in the current editor and tracks repeated inline occurrences through a dedicated citation-anchor layer separate from `ManuscriptCitation` |
| 2026-03-15 | Recorded the recommended sequencing for remaining Unmute AI paper-writing work: metadata/citation foundations first, then section-aware workspace, then dashboard/onboarding activation, then export and paper-graph enhancements |
| 2026-03-13 | Refined UI i18n routing recommendation: public pages use locale-prefixed URLs; authenticated app routes keep stable paths and resolve locale from user preference/cookie |
| 2026-03-13 | Recorded UI i18n recommendation: `next-intl` primary, locale-aware routing/message catalogs, avoid request-time LLM-translated UI |
| 2026-03-13 | Recorded unified Unmute AI settings hub decisions: shared `/settings` shell, route-based subpages, editor gear redirect, document-vs-account control split, expanded UserMenu |
| 2026-03-13 | Recorded Unmute AI usage analytics page decisions: standalone settings page, route handler API, Recharts, remove editor cost display |
| 2026-02-19 | Context-aware redesign: Claude=200K, Gemini=1M (codebase+research+multimodal), all subagents/teams→Opus |
| 2026-02-17 | Role clarification: Gemini → multimodal only, Codex → planning + complex code, Subagents → external research |
| 2026-02-08 | Major redesign for Opus 4.6: 1M context, Agent Teams, skill pipeline |
| | Initial |
