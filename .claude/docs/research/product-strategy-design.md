# Unmute AI Product Strategy (Updated 2026-03-15)

> Updated with: researcher pain point survey (800 lines), Citation Auto-Pilot design,
> UI/UX redesign research, full-text API investigation, loading UX patterns, LaTeX/Word strategy.
> Primary user: the founder (active researcher). Design for yourself first, scale second.

---

## 0. Founding Principle

**This product exists because I, the founder, need it to write papers faster.**

Every design decision is tested against: "Does this save ME time on my next paper?"
If it doesn't, it's not Phase 1.

---

## 1. Value Proposition Evolution

| Stage | Identity | Message |
|-------|----------|---------|
| **Now** | Paper writing accelerator | Focus on the research. We handle the rest. |
| **Next** | Citation auto-pilot + bilingual writing | Think in your language. Cite with one click. |
| **Future** | Manuscript operating system | From idea to submission in one place. |

---

## 2. What Researchers Actually Struggle With (Empirical)

From our survey of academic literature, Reddit/Twitter, and researcher interviews:

| Rank | Pain Point | Severity | Our Solution |
|------|-----------|----------|-------------|
| 1 | **Blank page / writer's block** | 10/10 | Grounded Writer: AI drafts from ClaimCards, not blank page |
| 2 | **Language barrier (non-native)** | 9/10 | **Already built**: bilingual editor, 17 languages |
| 3 | **Literature discovery inefficiency** | 8/10 | **Citation Auto-Pilot**: sentence-by-sentence, click to cite |
| 4 | **Citation formatting nightmare** | 8/10 | Auto BibTeX from CanonicalPaper, journal-aware formatting |
| 5 | **Peer review / revision cycle** | 8/10 | Adversarial Review Agent (built), Reviewer Response (Phase 3) |
| 6 | **Fragmented time** | 7/10 | Auto-Pilot works in 15-min sessions; search history persists |
| 7 | **Journal-specific formatting** | 7/10 | 8 journal styles (built), .docx/.tex export (Phase 1) |
| 8 | **Co-authoring friction** | 6/10 | Phase 3: team plan |
| 9 | **Journal selection guesswork** | 6/10 | Phase 2: journal fit recommendation |
| 10 | **Discussion writing difficulty** | 5/10 | Grounded Writer with support/contradict evidence |

**Key data**: median 177 hours/paper, non-native speakers spend 50% more time, 2.5x higher rejection rate.

---

## 3. Feature Pillars (Reordered by Founder Priority)

| Priority | Pillar | What It Does | Status |
|----------|--------|-------------|--------|
| **P0** | **Citation Auto-Pilot** | Walk sentence-by-sentence, suggest papers, click to cite. \cite{} + BibTeX auto-generated. | Designed, ready to implement |
| **P1** | **Evidence Discovery** | Multi-API paper search (OpenAlex+Crossref+PubMed+S2), full-text retrieval, ClaimCard extraction | **Built** (7 API endpoints) |
| **P1** | **Export Pipeline** | BibTeX export, Word (.docx) export, LaTeX (.tex) export | Designed, Phase 1 |
| **P2** | **Grounded Writing** | AI drafts from verified ClaimCards only, "no source no claim" | **Built** (API ready) |
| **P2** | **Adversarial Review** | Peer reviewer with BLOCK authority, coverage analysis | **Built** (API ready) |
| **Built** | **Bilingual Authoring** | Write in Japanese/any language, get English manuscript | **Built** (infrastructure) |
| **P3** | **Artifact-to-Draft** | Upload figures/tables → AI writes Results/Methods | Phase 3 |
| **P3** | **Submission Ops** | Journal fit, cover letter, reviewer response | Phase 3 |
| **P4** | **Team / Collaboration** | Shared library, co-author review, institutional controls | Phase 4 |

---

## 4. Revised Roadmap (Founder-First)

### Phase 1: "I can write MY next paper with this" (Now → 2 months)

**Goal**: Founder can write a complete paper using Unmute AI, end-to-end.

| Week | Deliverable | Why |
|------|-----------|-----|
| 1-2 | **Citation Auto-Pilot MVP** | The killer feature. Sentence → suggest → click → \cite{} |
| 1-2 | **DB migration** (prisma db push) | Evidence system can't work without tables |
| 2-3 | **BibTeX export** from CanonicalPaper | Need .bib file for Overleaf/LaTeX |
| 3-4 | **LaTeX (.tex) export** with \cite{} | Submit to Overleaf or journal |
| 3-4 | **Word (.docx) export** | For non-LaTeX journals |
| 4-5 | **Evidence Panel polish** | Coverage bar, paragraph gutter marks (🟢🟡🔴) |
| 5-6 | **Dashboard redesign ("Start New Paper" flow)** | First impression must reflect paper writing tool identity |
| 5-6 | **Grounded Writer UI** | "Draft Introduction with Evidence" button |
| 6-8 | **Review UI** | See BLOCKER/MAJOR/MINOR findings inline |

### Phase 2: "Others can use this too" (2-5 months)

| Deliverable | Why |
|------------|-----|
| Journal fit recommendation | Help choose where to submit |
| Introduction/Related Work copilot | AI writes section from ClaimCards |
| Word/LaTeX import | Bring existing manuscripts |
| Overleaf git push | "Send to Overleaf" button |
| Onboarding: topic → papers → write | New user activation |

### Phase 3: "This is indispensable" (5-12 months)

| Deliverable | Why |
|------------|-----|
| Artifact-to-Draft (figures/tables → Results/Methods) | The hardest part of writing |
| Reviewer response assistant | Point-by-point response drafts |
| Literature watch (new papers alert) | Stay current |
| Team plan beta | Lab-level adoption |
| PDF export | Complete export pipeline |

### Phase 4: "Manuscript OS" (12+ months)

| Deliverable | Why |
|------------|-----|
| Lab shared knowledge graph | Reuse across papers |
| Jupyter/ELN integration | Connect to data sources |
| Institutional analytics | Admin dashboard |
| Submission automation | One-click submit to journal |

---

## 5. Citation Auto-Pilot (The Killer Feature)

### User Experience

```
User clicks "Start Citation Check" (Cmd+Shift+C)
  │
  ▼ AI analyzes all sentences (batch, 2-3 seconds)
  │  Classifies: NEEDS_CITATION / NO_CITATION / ALREADY_CITED
  │
  ▼ First NEEDS_CITATION sentence highlighted in editor
  │
  ┌──────────────────────────────────────────────────┐
  │ "Deep learning has achieved remarkable results   │ ← highlighted
  │  in medical image segmentation."                 │
  ├──────────────────────────────────────────────────┤
  │ 📄 Ronneberger et al. (2015) - U-Net...  [Cite] │ ← top candidate
  │ 📄 Long et al. (2015) - Fully Conv...    [Cite] │
  │ 📄 Litjens et al. (2017) - Survey...    [Cite] │
  │                                                  │
  │ [Skip]  [More papers]     Sentence 1/23 · 0 cited│
  └──────────────────────────────────────────────────┘
  │
  ▼ User clicks [Cite] → \cite{ronneberger2015unet} inserted
  │  BibTeX entry auto-added to .bib
  │  → Auto-advance to next sentence
  │
  ▼ Next sentence: NO_CITATION → auto-skip
  │
  ▼ Next NEEDS_CITATION sentence highlighted...
  │
  ▼ Complete → Summary: "12 citations added, 3 skipped, 8 already cited"
     [Export BibTeX]  [Review citations]
```

### Keyboard shortcuts
- **Tab** or **1-5**: Accept paper by number
- **Space**: Skip sentence
- **Esc**: Exit auto-pilot
- **→**: More candidates

### Performance
- Pre-fetch: While user reviews sentence N, fetch candidates for N+1~N+3
- First suggestion in <500ms (critical for flow)
- Cache: Don't re-search identical claims

---

## 6. Technical Architecture (Built)

### API Endpoints (7 endpoints, all functional)

```
POST /api/evidence/discover   — Paper search (3 APIs + Gemini query expansion)
POST /api/evidence/verify     — DOI/PMID existence verification
POST /api/evidence/fulltext   — Full text (PMC→S2ORC→arXiv→Unpaywall→CORE)
POST /api/evidence/extract    — Evidence snippets + ClaimCards
POST /api/evidence/coverage   — Claim coverage analysis
POST /api/evidence/write      — Grounded draft generation
POST /api/evidence/review     — Adversarial review
```

### To Build for Auto-Pilot

```
POST /api/evidence/autopilot/analyze  — Classify all sentences
POST /api/evidence/autopilot/suggest  — Get candidates for one sentence
POST /api/evidence/cite               — Insert citation + generate BibTeX
```

### Data Sources (8 providers integrated)

| Provider | Papers | Full Text | Status |
|----------|--------|-----------|--------|
| OpenAlex | 271M | GROBID XML (60M OA) | **Built** |
| Crossref | 150M | DOI resolution | **Built** |
| PubMed | 37M | JATS XML via PMC | **Built** |
| Semantic Scholar | 225M | Abstract + TLDR | **Built** |
| arXiv | 2.4M | Abstract | **Built** |
| PMC/Europe PMC | 4M | Structured sections | **Built** |
| Unpaywall | 47M OA | OA URL discovery | **Built** |
| CORE | 300M+ | Raw full text | **Built** |

### Export Pipeline (To Build)

| Format | Method | Status |
|--------|--------|--------|
| BibTeX (.bib) | CrossRef content negotiation API | Designed |
| LaTeX (.tex) | TipTap → pandoc → .tex with \cite{} | Designed |
| Word (.docx) | TipTap → pandoc → .docx | Designed |
| PDF | Defer to Overleaf / Word | Not building |

---

## 7. Competitive Position

### What No One Else Does

| Feature | Unmute AI | Elicit | Paperpal | SciSpace | Jenni AI |
|---------|----------|--------|----------|----------|----------|
| Citation Auto-Pilot | ✅ (building) | ❌ | ❌ | ❌ | @ trigger only |
| Verified citations only | ✅ DOI/PMID | ❌ | Partial | ❌ | ❌ |
| Full-text evidence extraction | ✅ PMC/S2ORC | ✅ | ❌ | ✅ | ❌ |
| Adversarial review | ✅ | ❌ | ❌ | ❌ | ❌ |
| Journal-aware styling | ✅ 8 styles | ❌ | ✅ | ✅ | ❌ |
| Bilingual writing | ✅ 17 langs | ❌ | Partial | ❌ | ❌ |
| LaTeX-aware translation | ✅ | ❌ | ❌ | ❌ | ❌ |

### Moat

1. **Evidence-grounded writing = provenance data competitors can't get** — verified citation history and claim-to-source mappings are unique data
2. **Citation Auto-Pilot** — no one does sentence-by-sentence guided citation
3. **Verified-only architecture** — structurally impossible to cite fake papers
4. **Japan beachhead** — Japanese UX + J-STAGE/CiNii integration, underserved market for paper writing tools

---

## 8. Export Strategy: "Overleaf's Companion"

**Do NOT build**: LaTeX compilation, LaTeX editor, collaborative LaTeX editing

**Do build**:
- Phase 1: BibTeX export, .tex export, .docx export, BibTeX/RIS import
- Phase 2: Word/LaTeX import, Overleaf git push, journal templates

**Workflow**: Write & cite in Unmute AI → Export .tex + .bib → Open in Overleaf → Compile & submit

---

## 9. Key Risks

| Risk | Mitigation |
|------|-----------|
| Citation hallucination | Verified-source only architecture (structurally impossible) |
| Scope creep | Phase 1 = "can I write MY paper with this?" Nothing else. |
| API rate limits | Cache + provider abstraction + fallback chain |
| Competing with Paperpal/Elicit | Don't compete on grammar; compete on citation accuracy + end-to-end paper workflow |
| Japan-only trap | UX for Japan, data model for the world |

---

## 10. Success Metrics

### Phase 1 (personal validation)
- [ ] I can write a complete paper using only Unmute AI
- [ ] Citation Auto-Pilot saves me >50% of citation search time
- [ ] Zero fake citations in the output
- [ ] BibTeX export works with Overleaf

### Phase 2 (early users)
- [ ] 10 researchers use it to write a paper
- [ ] NPS > 50
- [ ] Time-to-first-citation < 5 minutes after signup

---

## Research Documents

| File | Content | Lines |
|------|---------|-------|
| `researcher-pain-points.md` | Global researcher pain point survey | 800 |
| `citation-autopilot-design.md` | Auto-Pilot technical architecture | ~400 |
| `citation-autopilot-ux.md` | Auto-Pilot UX research | 693 |
| `citation-agent-architecture.md` | Evidence agent system + Mermaid diagram | ~500 |
| `ai-agent-architecture-research.md` | AI agent framework survey (LangGraph etc.) | 756 |
| `ui-ux-redesign-evidence-primary.md` | Evidence-primary UI redesign | ~300 |
| `ui-ux-design.md` | Full UI/UX spec (loading UX + LaTeX/Word) | 1,077 |
| `ui-ux-research.md` | Competitor UX analysis (7 tools) | 840 |
| `loading-ux-patterns.md` | Loading/progress UX patterns | 1,162 |
| `latex-word-strategy.md` | LaTeX/Word import/export strategy | 619 |
| `fulltext-api-services.md` | Full-text API investigation | 698 |
| `academic-writing-tools-landscape.md` | Market research | ~500 |
| `product-strategy-design.md` | This document | — |

---

## Sources

- PLOS Biology survey (n=294 Japanese researchers)
- Reddit r/academia, r/PhD, r/GradSchool analysis
- Median 177 hours/paper study
- ACL 2025: ~300 papers with hallucinated citations
- Princeton GEO study: statistics improve AI visibility 30-40%
- Grammarly Citation Finder (2025), Jenni AI, Paperpal, Elicit, SciSpace, Consensus, Scite.ai
- OpenAlex, Semantic Scholar, Crossref, PubMed, arXiv, Unpaywall, CORE, J-STAGE, CiNii APIs
- LangGraph 1.0, Corrective RAG, Self-RAG, Chain-of-Verification (CoVe) research
- GitHub Copilot NES pattern, Grammarly inline suggestion UX
