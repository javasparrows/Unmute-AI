# Unmute AI v2 --- Product Requirements Document

Version: 2.0
Date: 2026-03-15
Status: Draft
Author: Founder + AI-assisted analysis
Sources: Founder use cases, Deep Research (Gemini), researcher pain point survey (n=800+), competitive analysis, existing codebase analysis

---

## 1. Product Vision

### 1.1 Mission

> Research should be evaluated by its content, not by the researcher's writing skill.

Unmute AI exists to eliminate every barrier between a researcher's ideas and a published paper. Language, citation management, logical structure, formatting, and compliance checking --- all of these are obstacles that consume time without adding scientific value. Unmute AI handles them so researchers can focus on what matters: the research itself.

### 1.2 Problem Statement

Academic paper writing is structurally broken:

- **177 hours median** per publication (range: 29--1,287 hours)
- Non-native English speakers spend **~50% more time** on writing
- **80%+ rejection rates** at top journals, often due to structural and formatting issues
- **~9 million active researchers** worldwide, publishing 3.3+ million papers annually
- Tools are fragmented: editor, reference manager, grammar checker, translation tool, formatting tool --- none integrated

Beyond general inefficiency, specific high-severity problems exist that no current tool addresses:

1. **Citation hallucination**: LLMs fabricate references. Researchers cannot trust AI-generated citations without manual DOI/PMID verification for every single paper.
2. **Evidence documentation burden**: Supervisors and reviewers require proof that each citation actually supports the claims made. This currently requires manual PDF reading and screenshot collection --- hours of tedious work.
3. **Paragraph flow breakdown**: AI-generated text often has logical disconnections between paragraphs that are invisible to the AI but obvious to domain experts.
4. **Introduction structure failure**: Section-level coherence (problem statement --> prior work --> gap --> contribution) frequently breaks down, especially when mixing manually written and AI-generated content.

### 1.3 Founder's Words (The Real Problem)

The founder, a medical AI PhD student, describes the core problem:

> "PDFの画像キャプチャの方がベターかなぁ。要するに生成されたものだと怖いのですよ。人間の目で読まないといけなくて、それを著者の責任で示せと言われたときに示せるようにしておかないといけないのです。"
>
> (Translation: "PDF screenshots are better. The point is, generated content is scary. Humans must read it with their own eyes, and when asked to demonstrate author responsibility, you need to be able to show evidence.")

This captures the fundamental trust problem: in academic writing, **provenance is everything**. Every claim must be traceable to a verified source, and the author must be able to demonstrate this traceability on demand.

### 1.4 Target Users

**Primary (Phase 1):** Medical AI researchers writing for international journals (the founder's own domain)

**Secondary (Phase 2):** All STEM researchers writing in non-native English

**Tertiary (Phase 3):** Any researcher writing academic papers in any field

### 1.5 Product Identity Evolution

| Stage | Identity | Core Message |
|-------|----------|-------------|
| v1 (Current) | Bilingual translation editor | Focus on the research. We handle the rest. |
| **v2 (This PRD)** | **Evidence-grounded paper writing platform** | **Think in your language. Publish with evidence.** |
| v3 (Future) | Manuscript operating system | From idea to submission in one place. |

---

## 2. User Personas and Use Cases

### 2.1 Persona 1: Yuki --- PhD Student in Medical AI (Founder)

**Profile:**
- 3rd year PhD student at a Japanese university
- Researching clinical NLP applications for Japanese medical text
- Supervisor requires rigorous citation evidence for every claim
- Uses LLMs extensively for literature search and draft generation
- Publishes in English-language international journals (JAMIA, npj Digital Medicine, etc.)
- Technical background: can use LaTeX, Python, familiar with ML/NLP tools

**Pain Points:**
1. Uses ChatGPT/Claude to find related work, but ~15-20% of suggested papers are fabricated or have incorrect metadata
2. After finding real papers, must manually read each PDF to verify that the cited paper actually supports the specific claim being made
3. Supervisor requires PowerPoint slides with PDF screenshots showing exactly which section/sentence in the cited paper supports the manuscript's claims
4. Introduction paragraphs written with AI assistance often have logical flow breaks that the supervisor catches:
   - "line102-109は、前パラグラフでnon-Englishの問題に触れています。この研究で日本語の臨床テキストを扱っている以上、日本語のLLMに特化して文献を引用した方が良い"
   - "文章の流れがここのparagraphで切れてしまう。臨床現場での課題点を挙げて、1つの問題として日本語の解析の難しさを挙げているのに次段落で違うことを書いて宙ぶらりんになっている"
5. Methods section figures and tables need verification against the actual data
6. Spends 2-3 hours per paper just creating the evidence documentation that the supervisor requires

**Desired Workflow:**
1. Write the manuscript draft in Japanese, get English translation
2. For each claim, automatically find verified papers with DOI/PMID
3. See exactly which part of the cited paper supports the claim
4. Export evidence documentation (PDF screenshots + claim mapping) for supervisor review
5. Get feedback on paragraph flow and logical coherence before supervisor sees it
6. Export to LaTeX + BibTeX for Overleaf submission

**Acceptance Criteria (Persona 1):**
- AC-1: Can write a complete paper (Introduction through Discussion) using only Unmute AI
- AC-2: Zero fabricated citations in the output
- AC-3: Can generate evidence documentation that the supervisor accepts
- AC-4: Paragraph flow analysis catches issues the supervisor would flag
- AC-5: Total time from draft to submission-ready manuscript reduced by 50%

### 2.2 Persona 2: Dr. Tanaka --- PI / Supervisor

**Profile:**
- Associate Professor at a Japanese medical school
- Supervises 3-5 PhD students and 2 postdocs
- Reviews manuscripts from students before submission
- Deeply concerned about academic integrity and citation accuracy
- Limited time for detailed manuscript review
- Expects students to demonstrate due diligence

**Pain Points:**
1. Students submit manuscripts with citations they haven't actually read
2. Cannot easily verify whether a student's claim is actually supported by the cited paper without reading the paper themselves
3. Spends hours giving structural feedback that could have been caught by a tool
4. Worries about reputational risk from inaccurate citations in published work
5. Needs a systematic way to review a student's citation evidence

**Desired Workflow:**
1. Receive a manuscript from a student with an attached evidence report
2. For each key claim, see the exact passage from the cited paper that supports it
3. Approve or flag citations that need further verification
4. Review the logical flow analysis and confirm the structure is sound
5. Sign off on sections that have been adequately evidenced

**Acceptance Criteria (Persona 2):**
- AC-6: Evidence report shows PDF-sourced screenshots, not AI-generated text
- AC-7: Can review a student's citation evidence in under 30 minutes (vs. 2+ hours)
- AC-8: Approval workflow prevents export of unverified sections
- AC-9: Dashboard shows per-section verification status

### 2.3 Persona 3: Dr. Park --- Postdoc / Assistant Professor

**Profile:**
- Postdoc at an international research lab (e.g., Stanford, Cambridge)
- Highly productive: aims for 3-4 publications per year
- Works in a multi-national team with diverse language backgrounds
- Needs to write quickly but cannot sacrifice quality
- Follows CONSORT-AI, TRIPOD-AI, and other reporting guidelines

**Pain Points:**
1. Literature review is the most time-consuming part of writing
2. Ensuring compliance with reporting guidelines requires constant cross-referencing
3. Reformatting the same paper for different journals wastes days
4. Co-authoring with team members using different tools and languages creates friction
5. Reviewer comments often point out missing citations or structural issues that should have been caught

**Desired Workflow:**
1. Start a new paper with a guideline-driven template (e.g., CONSORT-AI)
2. Use Citation Auto-Pilot to add verified citations sentence by sentence
3. Get real-time compliance checking against the selected guideline
4. Export in multiple formats (LaTeX, Word) without manual reformatting
5. Share the evidence report with co-authors for review

**Acceptance Criteria (Persona 3):**
- AC-10: Guideline templates cover CONSORT-AI, TRIPOD-AI, STARD-AI, CLAIM, GAMER
- AC-11: Citation Auto-Pilot processes a full Introduction in under 15 minutes
- AC-12: Export to LaTeX + BibTeX works with Overleaf without manual fixes
- AC-13: Compliance checker flags missing guideline items before export

---

## 3. Functional Requirements (Priority Order)

### P0: Core Value --- Without These, the Product Has No Meaning

These features represent the fundamental differentiators that justify Unmute AI's existence. They directly address the founder's real-world problems that no competing tool solves.

---

#### P0-1: Citation Verification and Evidence Documentation System

**Problem:** LLMs hallucinate citations. Supervisors require proof that citations support claims. Currently this requires manual PDF reading and screenshot collection.

**User Story US-V2-01:**
As a PhD student, I want every citation in my manuscript to be verified against DOI/PMID databases, so that I never accidentally cite a fabricated paper.

**User Story US-V2-02:**
As a PhD student, I want the system to automatically find and highlight the exact passage in the cited paper that supports my claim, so that I don't have to read entire papers to verify support.

**User Story US-V2-03:**
As a PhD student, I want to export an evidence report (PowerPoint/PDF) with PDF screenshots showing which section/sentence in each cited paper supports each claim in my manuscript, so that my supervisor can review my citation evidence efficiently.

**User Story US-V2-04:**
As a supervisor (PI), I want to see a clear mapping of "this claim in the manuscript is supported by this passage in this paper" with visual evidence, so that I can verify academic integrity without reading every cited paper myself.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-01 | DOI/PMID-only citation | Only papers with verified DOI or PMID can be inserted as citations. No free-text or LLM-generated citations allowed. | Given a citation insertion attempt, when the paper has no verified DOI or PMID, then the insertion is blocked with a clear error message. |
| F-02 | Citation source verification | Cross-reference citations against OpenAlex (271M), Crossref (150M), PubMed (37M), Semantic Scholar (225M) to confirm paper existence. | Given a DOI, when verified against 2+ providers, then verification state is persisted as `EXISTS_VERIFIED`. |
| F-03 | Evidence passage extraction | For each citation in the manuscript, identify the specific section and sentence in the cited paper that supports the claim. | Given a cited paper with full text available, when evidence extraction runs, then at least one supporting passage is identified with section label, page number, and confidence score. |
| F-04 | Claim-to-evidence mapping | Create a structured mapping: manuscript sentence --> claim --> cited paper --> supporting passage --> support label (SUPPORTS / CONTRADICTS / NEUTRAL). | Given a manuscript with 10 citations, when claim mapping runs, then each citation has at least one claim-evidence pair with a support label. |
| F-05 | PDF screenshot capture | Capture a screenshot of the relevant page/section from the cited paper's PDF, with the supporting passage highlighted. | Given a cited paper's PDF, when screenshot capture runs, then a PNG/JPEG image is generated showing the relevant page with the supporting text highlighted or boxed. |
| F-06 | Evidence report export (PPTX) | Export a PowerPoint file where each slide shows: (1) the manuscript claim, (2) the citation, (3) a screenshot of the supporting passage from the cited PDF, and (4) the support assessment. | Given a completed evidence mapping, when PPTX export is triggered, then a downloadable .pptx file is generated with one slide per claim-citation pair, containing the PDF screenshot. |
| F-07 | Evidence report export (PDF) | Export the evidence report as a PDF document with the same content as the PPTX. | Given a completed evidence mapping, when PDF export is triggered, then a downloadable .pdf file is generated. |
| F-08 | Human-in-the-loop approval gate | Sections that have not been reviewed and approved by a human cannot be exported. Each section has a status: DRAFT / REVIEWED / APPROVED. | Given a section in DRAFT status, when export is attempted, then the section is excluded from export and a warning is shown. Only APPROVED sections are included. |
| F-09 | Evidence completeness dashboard | Show per-section, per-citation verification status. Identify citations with no evidence passage, weak evidence, or contradicting evidence. | Given a manuscript with 20 citations, when the dashboard is opened, then each citation shows its verification state, evidence tier (fulltext / abstract-only / metadata-only), and support label. |
| F-10 | Verification state machine | Each citation progresses through states: CANDIDATE --> EXISTS_VERIFIED --> CONTENT_VERIFIED --> CLAIM_CARD_APPROVED --> REVIEW_PASSED --> ACCEPTED. | Given a citation in any state, when the user or system advances it, then the state transition is persisted and the UI reflects the new state. |

---

#### P0-2: Paragraph Flow Analysis and Writing Coach

**Problem:** AI-generated paragraphs often have logical disconnections that supervisors catch but AI tools miss. The flow between paragraphs breaks, and arguments are left "hanging" (宙ぶらりん).

**User Story US-V2-05:**
As a PhD student, I want the system to analyze the logical flow between paragraphs and detect disconnections (e.g., "the previous paragraph discusses problem A, but the next paragraph jumps to unrelated topic B"), so that I can fix structural issues before my supervisor sees them.

**User Story US-V2-06:**
As a PhD student, I want the system to learn from my supervisor's past feedback patterns and proactively flag similar issues in future manuscripts, so that I can improve my writing and reduce revision cycles.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-11 | Inter-paragraph flow analysis | Analyze the logical connection between consecutive paragraphs. Detect topic shifts, argument breaks, and "hanging" conclusions. | Given two consecutive paragraphs, when flow analysis runs, then a connection score (0-1) and a human-readable assessment are returned. Scores below 0.5 are flagged as "flow break". |
| F-12 | Topic continuity detection | Identify when a paragraph introduces a topic (e.g., "difficulty of Japanese NLP") but the next paragraph discusses something unrelated without resolution. | Given a paragraph that raises issue X, when the next paragraph does not address X, then a warning is generated: "Issue X raised in paragraph N is not resolved in paragraph N+1." |
| F-13 | Section-level logic template | Provide templates for common section structures: Introduction (Background --> Problem --> Prior Work --> Gap --> Approach --> Contribution), Discussion (Summary --> Comparison --> Limitations --> Future Work). | Given a section type (INTRODUCTION), when template analysis runs, then each paragraph is classified by its role (BACKGROUND / PROBLEM / PRIOR_WORK / GAP / APPROACH / CONTRIBUTION) and missing roles are flagged. |
| F-14 | Missing literature domain detection | Identify areas where the manuscript discusses a topic but lacks citations in that specific domain. | Given a paragraph discussing "Japanese LLMs for clinical text," when citation coverage is analyzed, then a gap is flagged if no citations about Japanese-specific LLMs are present, with a suggestion: "Consider citing literature on Japanese LLM evaluation." |
| F-15 | Paragraph reordering suggestion | When paragraphs are in a suboptimal order, suggest a better arrangement with explanation. | Given a section with N paragraphs, when reordering analysis runs, then an optimal order is suggested with a reason for each proposed move. |
| F-16 | Supervisor feedback pattern learning | Store supervisor feedback (e.g., "always cite Japanese-specific literature when discussing Japanese data") and apply similar checks to future manuscripts. | Given 3+ instances of similar supervisor feedback, when a new manuscript is analyzed, then the learned pattern is applied as an automatic check. |
| F-17 | Inline flow annotations | Show flow analysis results inline in the editor: green connectors between well-connected paragraphs, amber/red for weak/broken connections. | Given a completed flow analysis, when the editor is in "flow view" mode, then visual connectors appear between paragraphs with color-coded connection strength. |

---

#### P0-3: Introduction Structure Analyzer

**Problem:** Introductions are the hardest section to write well. The logical flow from background to contribution must be airtight, and each paragraph must serve a clear purpose within the overall argument.

**User Story US-V2-07:**
As a PhD student, I want the system to analyze my Introduction and tell me the role of each paragraph (Background, Problem, Gap, Approach, Contribution), identify missing elements, and suggest where additional citations are needed, so that I can write a well-structured Introduction.

**User Story US-V2-08:**
As a PhD student, I want the system to detect when my Introduction discusses a topic that is directly relevant to my research but lacks domain-specific citations, so that I can address gaps like "your paper uses Japanese clinical text, but you don't cite Japanese LLM evaluation literature."

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-18 | Paragraph role classification | For each paragraph in the Introduction, classify its role: BACKGROUND, PROBLEM_STATEMENT, PRIOR_WORK, GAP_IDENTIFICATION, APPROACH, CONTRIBUTION, TRANSITION. | Given an Introduction with 6 paragraphs, when role classification runs, then each paragraph has a role label with confidence score. |
| F-19 | Introduction flow proposal | Based on the research topic, suggest an ideal Introduction structure with recommended paragraph roles and their order. | Given a research topic ("Japanese clinical NLP using LLMs"), when flow proposal runs, then a recommended structure of 5-8 paragraphs is generated with role labels and brief descriptions. |
| F-20 | Missing role detection | Identify roles that are expected but missing from the Introduction. | Given an Introduction without a GAP_IDENTIFICATION paragraph, when analysis runs, then a warning is generated: "Your Introduction lacks a clear gap identification paragraph between prior work and your approach." |
| F-21 | Domain-specific citation gap detection | Cross-reference the manuscript's research topic with the citations used, and flag when the manuscript discusses a topic area where domain-specific literature is missing. | Given a manuscript about Japanese clinical NLP that discusses "non-English LLM challenges" but only cites English LLM papers, when analysis runs, then a gap is flagged: "Consider citing Japanese LLM evaluation literature (e.g., JMedRoBERTa, Japanese-GPT, etc.)." |
| F-22 | Paragraph merge/split suggestions | When two paragraphs cover the same role or a single paragraph tries to serve multiple roles, suggest merging or splitting. | Given a paragraph classified as BACKGROUND+PROBLEM, when analysis runs, then a suggestion is generated: "Consider splitting this paragraph into a pure background paragraph and a problem statement paragraph." |

---

### P1: Writing Efficiency Enhancement

These features significantly improve writing speed and quality but are enhancements to the core value, not the core value itself.

---

#### P1-1: Guideline-Driven Templates

**Problem:** Medical AI papers must comply with reporting guidelines (CONSORT-AI, TRIPOD-AI, STARD-AI, CLAIM, GAMER). Researchers constantly cross-reference these guidelines while writing, which is tedious and error-prone.

**User Story US-V2-09:**
As a medical AI researcher, I want to select a reporting guideline (e.g., CONSORT-AI) when starting a new paper, and have the system generate a section template with all required items pre-populated as checklist items, so that I don't miss any required reporting items.

**User Story US-V2-10:**
As a researcher, I want real-time compliance checking that highlights which guideline items are addressed, which are missing, and which are incomplete in my manuscript, so that I can ensure compliance before submission.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-23 | Guideline selection wizard | When creating a new paper, present a selection of applicable reporting guidelines based on study type. | Given a user selecting "Randomized Controlled Trial with AI Intervention," when the wizard runs, then CONSORT-AI is recommended as the primary guideline. |
| F-24 | Auto-template generation | Generate a document template with sections, subsections, and checklist items derived from the selected guideline. | Given CONSORT-AI selection, when template generation runs, then all 14 CONSORT-AI extension items are included as section-specific checklist items alongside the standard CONSORT items. |
| F-25 | Real-time compliance checker | As the user writes, continuously check which guideline items have been addressed in the manuscript. | Given a manuscript being written against CONSORT-AI, when a guideline item is addressed in text, then the checklist item turns green. Unaddressed items remain red. Coverage percentage is shown. |
| F-26 | Compliance export | Export a guideline compliance report showing addressed/unaddressed items for journal submission. | Given a completed compliance check, when export is triggered, then a PDF/Word document is generated listing each guideline item with its status and the corresponding text from the manuscript. |
| F-27 | Supported guidelines | Support the following guidelines at launch: CONSORT-AI, TRIPOD-AI, STARD-AI, CLAIM, GAMER. | Given any of the 5 supported guidelines, when template generation runs, then all items from the guideline checklist are included. |

---

#### P1-2: Citation Auto-Pilot (Evolution of Existing Feature)

**Problem:** Finding and inserting citations is the most time-consuming part of writing. Current tools require switching between the editor, a search engine, and a reference manager.

**User Story US-V2-11:**
As a researcher, I want to walk through my manuscript sentence by sentence, with the system automatically suggesting verified papers for each claim that needs a citation, and let me accept with a single click or keypress, so that I can add all citations in a fraction of the time.

**User Story US-V2-12:**
As a researcher, I want every accepted citation to automatically generate a proper BibTeX entry with correct author names, journal, year, volume, pages, and DOI, so that I never have to manually create bibliography entries.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-28 | Sentence-level citation need analysis | Analyze each sentence and classify as NEEDS_CITATION, NO_CITATION, or ALREADY_CITED with a human-readable reason. | Given a 500-word Introduction, when analysis runs within 3 seconds, then each sentence has a status and reason. |
| F-29 | Paper suggestion with ranking | For each sentence needing a citation, suggest 3-5 papers ranked by relevance, verification level, citation count, and recency. | Given a sentence about "transformer efficiency in clinical NLP," when suggestion runs, then 3-5 papers are returned with relevance scores and one-line rationale per paper. |
| F-30 | One-click citation insertion | Accept a suggested paper with a single click or keypress (Enter / 1-5), inserting `\cite{key}` at the correct position in the sentence. | Given a selected paper, when accepted, then `\cite{key}` is inserted before the sentence-ending punctuation, and a ManuscriptCitation + ManuscriptCitationAnchor is created. |
| F-31 | BibTeX auto-generation | Generate a complete, correctly formatted BibTeX entry from the CanonicalPaper metadata, including normalized author names. | Given a CanonicalPaper with DOI, when BibTeX generation runs, then a valid @article/@inproceedings/@misc entry is produced with author, title, journal, year, volume, pages, doi fields. |
| F-32 | Keyboard-driven workflow | Support full keyboard navigation: Cmd+Shift+C (start), Enter (accept top), 1-5 (accept by rank), Tab (skip), E (edit query), Esc (exit). | Given an active Auto-Pilot session, when any shortcut key is pressed, then the corresponding action executes within 100ms. |
| F-33 | Prefetch pipeline | While the user reviews sentence N, prefetch suggestions for sentence N+1. | Given the user is reviewing sentence 5, when sentence 5 suggestions are displayed, then sentence 6 suggestions are already being fetched in the background. |
| F-34 | Session persistence and resume | Auto-Pilot sessions are saved. If the user leaves and returns, they can resume where they left off. | Given an interrupted session at sentence 12/23, when the user returns, then "Resume Auto-Pilot (12/23)" is available. |
| F-35 | Full-text claim card extraction | For accepted citations, extract structured claim cards from the paper's full text showing subject-relation-object triples. | Given a cited paper with PMC full text available, when extraction runs, then claim cards with subject, relation, object, and source section are generated. |

---

#### P1-3: Multi-Language Writing (Existing Feature --- Maintained)

**Status:** Already built. Bilingual editor with 17-language support, sentence-level synchronization, and alignment-based cursor linking.

**Enhancements for v2:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-36 | Pane semantic relabeling | Change labels from "Source/Translation" to "Thinking Pane (JA)" and "Manuscript Pane (EN)". | Given the editor in grounded writing mode, when panes are displayed, then labels say "Thinking" and "Manuscript" instead of "Source" and "Translation". |
| F-37 | Citation-aware translation | When translating from Japanese to English, preserve and correctly position `\cite{key}` tokens. | Given Japanese text with `\cite{vaswani2017attention}`, when translated to English, then the `\cite{}` token appears at the semantically correct position in the English sentence. |

---

### P2: Productivity System

These features improve the overall research writing experience and daily workflow integration.

---

#### P2-1: Habit and Flow Engine

**Problem:** Research writing is fragmented across other responsibilities. Researchers need structured micro-sessions that fit into dead time (e.g., while models are training).

**User Story US-V2-13:**
As a researcher, I want the system to break my paper into manageable micro-tasks organized by IMRaD section, so that I can make meaningful progress in 15-minute writing sessions.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-38 | IMRaD micro-task decomposition | Break a paper into 15-30 minute writing tasks, organized by section and priority. | Given a new paper project, when task decomposition runs, then 15-25 micro-tasks are generated with estimated time, section, and dependencies. |
| F-39 | Pomodoro integration | Built-in Pomodoro timer with writing session tracking and statistics. | Given a started Pomodoro session, when 25 minutes elapse, then a break is triggered and session statistics (words written, citations added) are recorded. |
| F-40 | Dead-time utilization prompts | Detect "idle" contexts (e.g., training job running in another window) and suggest quick writing tasks. | Given integration with a task tracker, when a long-running job is detected, then a notification suggests "Write your Methods section while you wait (est. 20 min)." |
| F-41 | Writing progress tracking | Track daily/weekly writing metrics: words written, citations added, sections completed, time spent. | Given any writing session, when the session ends, then progress is recorded and visible on the dashboard. |

---

#### P2-2: Export Pipeline

**Problem:** Researchers need submission-ready files in LaTeX, Word, and BibTeX formats. Currently, reformatting is a manual multi-hour process.

**User Story US-V2-14:**
As a researcher, I want to export my manuscript as LaTeX (.tex) + BibTeX (.bib) for Overleaf, or as Word (.docx) for direct journal submission, with all citations correctly formatted and cross-referenced.

**User Story US-V2-15:**
As a researcher, I want to export my evidence documentation as a PowerPoint file with PDF screenshots of supporting passages, so that I can submit it to my supervisor as proof of citation integrity.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-42 | LaTeX export | Export manuscript as .tex file with proper section headings, `\cite{}` commands, and bibliography. | Given a manuscript with 15 citations, when LaTeX export runs, then a valid .tex file is generated that compiles without errors in Overleaf with the accompanying .bib file. |
| F-43 | BibTeX export | Export all cited papers as a .bib file with correct entry types and metadata. | Given 15 ManuscriptCitations, when BibTeX export runs, then a .bib file is generated with all entries in alphabetical cite key order. |
| F-44 | Word (.docx) export | Export manuscript as a Word document with formatted references and bibliography. | Given a manuscript, when Word export runs, then a .docx file is generated with numbered references and a formatted bibliography section. |
| F-45 | Evidence PPTX export | Export the evidence documentation as PowerPoint with one slide per claim-citation pair. | Given 15 claim-citation pairs with evidence mappings, when PPTX export runs, then a .pptx file is generated with 15 slides, each showing the claim, citation, and PDF screenshot. |
| F-46 | Export pre-flight check | Before export, check for: missing citations, unverified citations, weak evidence, incomplete sections. | Given a manuscript with 2 unverified citations and 1 missing section, when pre-flight runs, then warnings are shown and the user can choose to proceed or fix. |

---

### P3: Team Collaboration

These features enable lab-level adoption and multi-author workflows.

---

#### P3-1: Role-Based Delegation

**Problem:** Academic papers are rarely written by one person. Different team members have different expertise and responsibilities.

**User Story US-V2-16:**
As a PI, I want to assign specific sections of a paper to different team members based on their expertise (MD handles clinical relevance, PhD student handles methods, engineer handles implementation details), so that everyone works on what they know best.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-47 | Section-level assignment | Assign sections to team members with role labels (Author / Reviewer / Advisor). | Given a paper with 5 sections, when assignments are made, then each section shows the assigned author and their role. |
| F-48 | Expertise-based matching | Suggest which team member should write which section based on their publication history and expertise tags. | Given a team of 3 members with tagged expertise, when matching runs, then section-to-member suggestions are generated with reasons. |
| F-49 | PI review dashboard | PI can see all active papers across supervised students, with per-section status, citation coverage, and review flags. | Given a PI with 4 supervised students, when dashboard loads, then all students' papers are shown with progress indicators. |
| F-50 | Review and approval workflow | Reviewers can comment on specific passages, approve sections, and request changes. | Given a section submitted for review, when the reviewer comments, then comments are threaded and the section status changes to CHANGES_REQUESTED. |

---

### P4: Ethical Transparency

These features ensure responsible AI use in academic writing, following the GAMER framework and institutional requirements.

---

#### P4-1: GAMER-Compliant Ethical Transparency

**Problem:** Journals and institutions increasingly require disclosure of AI use in paper writing. Researchers need to track and report their AI usage accurately.

**User Story US-V2-17:**
As a researcher, I want the system to automatically log all AI interactions (prompts, models used, sections affected) and generate a disclosure statement for journal submission, so that I comply with AI use policies without manual tracking.

**Features:**

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|-------------------|
| F-51 | Automatic prompt logging | Every AI interaction is logged with: timestamp, model name, prompt, output, section affected, token counts. | Given any AI interaction, when the interaction completes, then a log entry is created and persisted. |
| F-52 | Auto-disclosure generation | Generate a GAMER-compliant AI use disclosure statement based on logged interactions. | Given a completed manuscript with AI logs, when disclosure generation runs, then a statement is generated following GAMER format: "AI tools were used for [X, Y, Z] in sections [A, B, C]. All AI-generated content was reviewed and verified by the authors." |
| F-53 | Fact-check gateway | Before final export, run a fact-checking pass on all AI-generated or AI-assisted content. Flag any claims that cannot be traced to verified evidence. | Given a manuscript with 50 AI-assisted sentences, when fact-check runs, then each sentence is labeled as VERIFIED / UNVERIFIED / NEEDS_REVIEW. Export is blocked if more than 5% of claims are UNVERIFIED. |
| F-54 | AI contribution attribution | Track which parts of the manuscript were AI-generated, AI-assisted, or human-written. | Given a completed manuscript, when attribution analysis runs, then each sentence has a contribution label: HUMAN_WRITTEN / AI_ASSISTED / AI_GENERATED / AI_TRANSLATED. |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Citation search response time | < 3 seconds (first results) | Time from search trigger to first result display |
| PDF parsing time | < 10 seconds per paper | Time from PDF fetch to evidence extraction complete |
| Auto-Pilot suggestion latency | < 500ms per sentence (cached), < 3s (uncached) | Time from sentence focus to first suggestion display |
| Evidence report generation | < 30 seconds for 20 citations | Time from export trigger to file download |
| Flow analysis response time | < 5 seconds per section | Time from analysis trigger to results display |
| Editor responsiveness | < 16ms frame time (60fps) | No jank during typing, scrolling, or panel transitions |
| Translation latency | < 2 seconds per sentence | Existing requirement, maintained |

### 4.2 Security

| Requirement | Implementation |
|------------|----------------|
| Research data encryption | AES-256 at rest, TLS 1.3 in transit |
| AI training exclusion | User manuscripts and research data are never used for AI model training. Explicit contractual guarantee. |
| Data residency | User data stored in the same region as the user's account (Japan, US, EU) |
| Access control | OAuth 2.0 + per-document ACL with role-based permissions |
| Audit logging | All data access and modification events are logged with user ID, timestamp, and action |
| Data retention | User controls data retention. Full data export and deletion on request. |
| Third-party API data | Cited paper metadata from OpenAlex/Crossref/PubMed is cached locally. No user manuscript data is sent to academic APIs. |

### 4.3 Scalability

| Metric | Target |
|--------|--------|
| Concurrent users | 1,000 simultaneous editing sessions |
| Documents per user | Up to 100 papers per account |
| Citations per document | Up to 500 citations per paper |
| Paper database | Index up to 300M papers via API aggregation |
| Full-text storage | Cache up to 10GB of full-text content per instance |

### 4.4 Accessibility

| Requirement | Standard |
|------------|----------|
| Keyboard navigation | Full keyboard support for all critical workflows (WCAG 2.1 AA) |
| Screen reader compatibility | All interactive elements have ARIA labels |
| Color contrast | Minimum 4.5:1 contrast ratio for text, 3:1 for UI components |
| Responsive design | Functional on 768px+ width (tablet and above) |
| Reduced motion | Respect `prefers-reduced-motion` system setting |

### 4.5 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% (monthly) |
| Data durability | 99.999% (no data loss) |
| Auto-save interval | Every 30 seconds of activity |
| Recovery time | < 5 minutes for service restoration |
| Backup frequency | Daily database backups with 30-day retention |

---

## 5. Relationship to Existing Implementation

### 5.1 What We Keep and Build On

| Existing Asset | Status | How It's Used in v2 |
|---------------|--------|-------------------|
| Citation Auto-Pilot design | Designed | Foundation for P0-1 (F-28 to F-35) and P1-2 |
| Evidence API (12 endpoints) | Built | discover, verify, fulltext, extract, coverage, write, review |
| Provider layer (8 providers) | Built | OpenAlex, Crossref, PubMed, S2, arXiv, PMC, Unpaywall, CORE |
| TipTap editor (bilingual panes) | Built | Core editor. Add citation extension, flow annotations, section rail |
| Section model (SectionType enum) | Built | ABSTRACT, INTRODUCTION, METHODS, RESULTS, DISCUSSION |
| Claim compiler | Built | Sentence decomposition and needsCitation classification |
| CanonicalPaper + ManuscriptCitation | Built | Bibliography membership. Add verification state and anchor table |
| Sentence splitting + highlighting | Built | split-sentences.ts + highlight-sentence.ts |
| Google OAuth + Prisma + PostgreSQL | Built | Authentication and data persistence |
| 17-language translation | Built | Bilingual writing with Gemini 2.5 Flash |

### 5.2 What Changes Significantly

| Area | Current State | v2 State |
|------|-------------|---------|
| Product identity | Translation tool with citation features | Paper writing platform with evidence management |
| Editor paradigm | Source/Translation dual pane | Thinking/Manuscript dual pane + Evidence drawer |
| Citation workflow | Manual search and insert | Auto-Pilot: guided sentence-by-sentence flow |
| Export | No export | LaTeX + BibTeX + Word + Evidence PPTX |
| Verification model | Citations are plain text strings | Citations are structured verified objects with state machine |
| Dashboard | Document list with translation metadata | Paper project list with progress, citations, coverage status |

### 5.3 What Is New in v2

| New Component | Purpose | Dependencies |
|--------------|---------|-------------|
| PDF parser + screenshot engine | Extract evidence passages and capture PDF screenshots for evidence reports | F-03, F-05, F-06 |
| Evidence mapping engine | Map claims to supporting passages across cited papers | F-04, F-09 |
| Paragraph flow analyzer | Detect logical disconnections between paragraphs | F-11 through F-17 |
| Introduction structure analyzer | Classify paragraph roles and detect missing elements | F-18 through F-22 |
| Guideline template engine | Generate and check compliance with reporting guidelines | F-23 through F-27 |
| Evidence PPTX/PDF exporter | Generate supervisor-ready evidence documentation | F-06, F-07, F-45 |
| ManuscriptCitationAnchor table | Per-occurrence citation tracking (vs. document-level) | All citation features |
| PaperAuthor table | Normalized author metadata for BibTeX | F-31 |
| Verification state persistence | Track citation verification progress | F-10 |
| Export pipeline (LaTeX/Word/BibTeX) | Submission-ready file generation | F-42 through F-44 |
| Supervisor feedback learning | Pattern recognition from past feedback | F-16 |
| GAMER compliance logging | AI use disclosure and fact-check gateway | F-51 through F-54 |

---

## 6. System Layers (Deep Research Architecture)

Based on Deep Research analysis of practices from Stanford, Harvard Zitnik Lab, Cambridge van der Schaar Lab, and Google Health, Unmute AI v2 requires five system layers:

### Layer 1: Habit and Flow Engine

**Purpose:** Minimize the activation energy for writing. Make paper writing a daily habit, not a marathon.

**Components:**
- IMRaD micro-task decomposition (15-minute sessions)
- Pomodoro timer with writing statistics
- Dead-time utilization (detect idle compute, suggest writing tasks)
- Context-switching optimization (save/restore writing context in < 5 seconds)
- Progress visualization (daily streak, section completion, citation coverage)

**Anti-patterns prevented:**
- Blank page paralysis (always have a concrete micro-task to start)
- Context loss (session state persists across devices)

### Layer 2: Guideline-Driven Templates

**Purpose:** Ensure structural compliance with reporting standards from the start, not as an afterthought.

**Components:**
- CONSORT-AI template (AI-specific extensions to CONSORT 2010)
- TRIPOD-AI template (prediction model validation)
- STARD-AI template (diagnostic accuracy with AI)
- CLAIM template (clinical imaging AI studies)
- GAMER template (generative AI in medical education research)
- Custom template builder for institution-specific requirements
- Real-time compliance checker with coverage percentage

**Anti-patterns prevented:**
- Information in wrong sections (template guides placement)
- Missing required reporting items (checklist enforcement)
- Inconsistent methodology reporting (template standardization)

### Layer 3: Intelligent RAG Pipeline

**Purpose:** Ensure every claim is grounded in verified, retrievable evidence. Zero hallucinated citations.

**Components:**
- Multi-provider literature search (OpenAlex + Crossref + PubMed + Semantic Scholar + arXiv)
- Full-text retrieval (PMC + S2ORC + arXiv + Unpaywall + CORE)
- Context-aware query generation (sentence + section + research topic --> search query)
- Structured evidence extraction (ClaimCards with subject-relation-object triples)
- Clinical impact mapping (link clinical outcomes to evidence sources)
- Academic tone rewriting (ensure formal register appropriate to target journal)
- DOI/PMID verification (existence check against multiple providers)

**Anti-patterns prevented:**
- Citation hallucination (structurally impossible --- only verified papers)
- Insufficient prior work comparison (gap detection identifies missing citation domains)
- Overly complex prose (tone rewriting simplifies without losing meaning)

### Layer 4: Team Collaboration and Delegation

**Purpose:** Support the reality that papers are multi-author efforts with different expertise areas.

**Components:**
- MD/PhD/Engineer role-based task assignment
- Section-level ownership and responsibility tracking
- Cross-functional co-authoring (different team members write different sections)
- PI review dashboard (supervisor sees all papers across supervised students)
- Threaded comments and change requests
- Real-time presence indicators

**Anti-patterns prevented:**
- Unclear responsibilities (explicit section assignments)
- Version conflicts (section-level locking and merge)
- Delayed reviews (notification system for pending reviews)

### Layer 5: GAMER-Compliant Ethical Transparency

**Purpose:** Ensure responsible AI use with full auditability and compliance with journal AI disclosure requirements.

**Components:**
- Automatic prompt and model usage logging
- AI contribution attribution per sentence
- Auto-disclosure statement generation (GAMER format)
- Fact-check gateway (block export of unverified AI content)
- Human-in-the-loop approval gates (sections must be human-reviewed before export)
- Audit trail for all AI interactions

**Anti-patterns prevented:**
- Undisclosed AI use (automatic tracking makes disclosure trivial)
- Hallucinated content reaching publication (fact-check gateway blocks it)
- Reproducibility failures (prompt logs enable reproduction of AI-assisted writing)

---

## 7. Anti-Patterns to Prevent

Based on analysis of top researchers' practices and common manuscript rejection reasons:

| Anti-Pattern | How v2 Prevents It | Feature IDs |
|-------------|-------------------|-------------|
| **Citation hallucination** | DOI/PMID-only citations; multi-provider verification | F-01, F-02 |
| **Information in wrong sections** | Guideline templates with section-specific checklists | F-23, F-24 |
| **Unclear research objectives** | Introduction structure analyzer with role classification | F-18, F-20 |
| **Overly complex prose** | Academic tone rewriting with journal-specific style guidance | F-37 |
| **Data bias and SDoH ignorance** | Claim coverage analysis with domain-specific gap detection | F-14, F-21 |
| **Missing clinical outcome evaluation** | Guideline compliance checker (CONSORT-AI, TRIPOD-AI) | F-25 |
| **Reproducibility failures** | GAMER prompt logging and AI contribution attribution | F-51, F-54 |
| **Undisclosed AI use** | Auto-disclosure generation | F-52 |
| **Paragraph flow breaks** | Inter-paragraph flow analysis with topic continuity detection | F-11, F-12 |
| **Insufficient prior work comparison** | Missing literature domain detection | F-14, F-21 |
| **Unsupported claims** | Fact-check gateway; human-in-the-loop approval | F-08, F-53 |

---

## 8. Success Metrics

### Phase 1: Personal Validation ("I can write MY paper with this")

**Timeline:** Now --> 2 months

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Founder writes a complete paper using Unmute AI | 1 paper completed end-to-end | Founder self-report |
| Zero fabricated citations | 0 hallucinated papers in output | DOI/PMID verification of all citations |
| Citation Auto-Pilot time savings | > 50% reduction in citation search time | Compare with manual citation workflow on previous paper |
| Supervisor accepts evidence documentation | "Evidence documentation is sufficient" from PI | Supervisor feedback |
| Paragraph flow analysis catches real issues | > 80% of issues supervisor would flag are caught first | Compare AI-flagged issues with subsequent supervisor feedback |
| BibTeX export works with Overleaf | Zero manual fixes needed for .bib compilation | Overleaf compilation test |

### Phase 2: Supervisor Validation ("The evidence is sufficient")

**Timeline:** 2-4 months

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Supervisor review time reduction | > 50% faster for evidence review | Time tracking before/after |
| Evidence report quality | Supervisor rates evidence report as "sufficient" or "excellent" | Likert scale feedback |
| Citation verification coverage | > 95% of citations have evidence passage mappings | System metrics |
| Revision cycles reduced | 1 fewer revision cycle per paper on average | Historical comparison |

### Phase 3: Early Adopter Validation ("Others can use this too")

**Timeline:** 4-8 months

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| External researchers complete papers | 10 researchers each complete 1 paper using Unmute AI | User tracking |
| Time-to-first-citation | < 5 minutes after signup | Onboarding analytics |
| User retention (30-day) | > 40% | Analytics |
| Net Promoter Score | > 50 | Survey |
| Guideline compliance usage | > 30% of new papers use a guideline template | Feature analytics |
| Evidence export usage | > 60% of papers generate at least one evidence report | Feature analytics |

### Phase 4: Growth Validation ("This is indispensable")

**Timeline:** 8-12 months

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Monthly Active Users | 1,000+ | Analytics |
| Papers completed per month | 50+ | System metrics |
| Lab-level adoption | 5+ labs with 3+ members each | Account analytics |
| Paid conversion rate | > 5% of free users convert to paid | Revenue analytics |
| Citation accuracy rate | > 99.9% (zero fabricated citations across all users) | System-wide verification audit |

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| **CanonicalPaper** | A deduplicated paper record in the database, verified via DOI/PMID against external providers |
| **ManuscriptCitation** | A document-level bibliography membership record linking a document to a CanonicalPaper |
| **ManuscriptCitationAnchor** | A per-occurrence citation record tracking where in the manuscript a specific citation is used |
| **ClaimCard** | A structured evidence unit extracted from a paper's text: subject-relation-object triple with support label |
| **Citation Auto-Pilot** | A guided workflow that walks through the manuscript sentence by sentence, suggesting verified papers for citation |
| **Evidence Tier** | The depth of evidence available for a citation: METADATA_ONLY, ABSTRACT_ONLY, FULLTEXT |
| **Verification State** | The trust level of a citation: CANDIDATE --> EXISTS_VERIFIED --> CONTENT_VERIFIED --> CLAIM_CARD_APPROVED --> REVIEW_PASSED --> ACCEPTED |
| **IMRaD** | Introduction, Methods, Results, and Discussion --- the standard structure of scientific papers |
| **CONSORT-AI** | Consolidated Standards of Reporting Trials --- AI extension for randomized controlled trials involving AI |
| **TRIPOD-AI** | Transparent Reporting of a multivariable prediction model for Individual Prognosis or Diagnosis --- AI extension |
| **STARD-AI** | Standards for Reporting of Diagnostic Accuracy Studies --- AI extension |
| **CLAIM** | Checklist for Artificial Intelligence in Medical Imaging |
| **GAMER** | Guidelines for the use of generative AI in Medical Education Research |
| **SDoH** | Social Determinants of Health --- factors like socioeconomic status, education, and environment that affect health outcomes |
| **DOI** | Digital Object Identifier --- a persistent identifier for published papers |
| **PMID** | PubMed Identifier --- a unique number for articles in the PubMed database |

---

## 10. Appendix: Feature ID to Priority Mapping

| Priority | Feature IDs | Count |
|----------|------------|-------|
| P0 (Core Value) | F-01 to F-22 | 22 features |
| P1 (Efficiency) | F-23 to F-37 | 15 features |
| P2 (Productivity) | F-38 to F-46 | 9 features |
| P3 (Collaboration) | F-47 to F-50 | 4 features |
| P4 (Ethics) | F-51 to F-54 | 4 features |
| **Total** | **F-01 to F-54** | **54 features** |

---

## 11. Appendix: Dependency Map

```
P0-1: Citation Verification          P0-2: Flow Analysis         P0-3: Intro Analyzer
  |                                     |                            |
  v                                     v                            v
P1-2: Citation Auto-Pilot          P1-1: Guideline Templates    P1-3: Multi-lang (existing)
  |                                     |
  v                                     v
P2-2: Export Pipeline               P2-1: Habit Engine
  |
  v
P3-1: Team Collaboration
  |
  v
P4-1: Ethical Transparency
```

**Critical Path:**

1. P0-1 Citation Verification (foundation for everything else)
2. P0-2 + P0-3 Flow Analysis + Intro Analyzer (can be parallelized)
3. P1-2 Citation Auto-Pilot (builds on P0-1)
4. P2-2 Export Pipeline (builds on P1-2 for BibTeX, P0-1 for evidence PPTX)
5. P1-1 Guideline Templates (independent, can start early)

---

## 12. Appendix: Competitive Landscape

| Feature | Unmute AI v2 | Elicit | Paperpal | SciSpace | Jenni AI | Grammarly |
|---------|-------------|--------|----------|----------|----------|-----------|
| Citation Auto-Pilot (guided) | **Yes** | No | No | No | Partial | No |
| Verified-only citations | **Yes (DOI/PMID)** | No | Partial | No | No | Yes |
| Evidence documentation export | **Yes (PPTX/PDF)** | No | No | No | No | No |
| Paragraph flow analysis | **Yes** | No | No | No | No | No |
| Guideline compliance checking | **Yes** | No | Partial | No | No | No |
| Bilingual writing | **Yes (17 langs)** | No | Partial | No | No | No |
| Full-text evidence extraction | **Yes** | Yes | No | Yes | No | No |
| Adversarial review | **Yes** | No | No | No | No | No |
| LaTeX-aware editing | **Yes** | No | No | No | No | No |
| Human-in-the-loop approval | **Yes** | No | No | No | No | No |
| GAMER-compliant AI disclosure | **Yes** | No | No | No | No | No |

**Unique to Unmute AI v2 (no competitor offers):**
1. Evidence documentation export with PDF screenshots
2. Guided Citation Auto-Pilot (sentence-by-sentence walk-through)
3. Paragraph flow analysis with topic continuity detection
4. Human-in-the-loop approval gates
5. GAMER-compliant ethical transparency

---

*This document should be reviewed and updated as the product evolves. All feature IDs are stable references for use in implementation planning, test cases, and sprint tracking.*
