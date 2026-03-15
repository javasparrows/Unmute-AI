# Unmute AI --- Journey-Centric UX Overhaul Design Document

Document ID: DD-UXO
Date: 2026-03-16
Status: Proposed
Scope: Full UI/UX overhaul to transform the product from a document editor into a journey-centric paper writing platform
Parent: DD-GWS (Guided Workflow System), DD-v2 (Detailed Design v2)
Depends on: task-registry.ts, auto-complete.ts, PaperJourney model

---

## 1. Design Philosophy: "Course-Style" UX

### 1.1 Core Problem Statement

Unmute AI possesses extensive backend capabilities --- evidence search, citation management,
compliance checking, flow analysis, adversarial review, pomodoro tracking, evidence mapping,
and a full 7-phase / 27-task guided workflow system. However, the UI fails to surface these
features effectively:

1. **Dashboard is a flat document list** --- no journey visualization, no progress indicators
2. **Header shows only "Dashboard" and "Pricing"** --- unchanged from v1's translation tool era
3. **Guided workflow is a tiny collapsible nav bar** --- tucked inside the editor as an afterthought
4. **Existing documents have no onboarding** --- no way to start or configure the guided journey
5. **Backend features are hidden in tabs** --- Flow Analysis, Compliance, Evidence Mapping, Pomodoro are buried
6. **No visual progress across the entire process** --- researchers cannot see where they are in the long journey

The user has articulated this problem precisely:

> "The whole long process of paper writing --- I need to always know where I am,
> what timeline to think about, and what to do next."

### 1.2 Udemy Model Application

Udemy's learning platform provides a near-perfect interaction model for guided paper writing:

| Udemy Concept | Unmute AI Equivalent |
|---------------|---------------------|
| Left sidebar with Section -> Lesson hierarchy | Left sidebar with Phase -> Task hierarchy |
| Lesson completion changes color | Task completion changes color |
| Auto-advance to next video | Auto-advance to next task |
| Course progress bar (% complete) | Paper progress bar (% complete) |
| "Continue where you left off" | "Next Action" card |
| Section collapse/expand | Phase collapse/expand |

**Key insight**: Udemy treats learning as a *journey*, not a toolbox. Users don't choose
which video to watch from a flat list --- they follow a structured path. Unmute AI should
treat paper writing the same way.

### 1.3 GitHub Branch Visualization Model

GitHub's branch/merge visualization provides the visual language for progress:

| GitHub Concept | Unmute AI Equivalent |
|----------------|---------------------|
| Green dots = merged commits | Green dots = completed tasks |
| Blue dots = current commit | Blue pulsing dot = current task |
| Grey dots = future commits | Grey dots = pending tasks |
| Solid lines connecting commits | Solid lines connecting completed tasks |
| Dashed lines for pending | Dashed lines for pending tasks |
| Branch merge points | Phase transition points |

**Key insight**: Lines and dots create a sense of *flow* and *direction*. The researcher
can see at a glance: "I've come this far, I'm here now, this is what's ahead."

### 1.4 Blog Table of Contents Model

Blog article TOC (table of contents) provides the navigation model:

| Blog TOC Concept | Unmute AI Equivalent |
|-----------------|---------------------|
| Always-visible sidebar | Always-visible journey sidebar |
| Current section highlighted on scroll | Current task highlighted |
| Click to jump to section | Click to jump to task's feature screen |
| Hierarchical (H2 -> H3) | Hierarchical (Phase -> Task) |

**Key insight**: A blog TOC is *passive* --- it doesn't force navigation, but always
shows where you are. The journey sidebar should function the same way: present but
not intrusive, informative but not prescriptive.

### 1.5 Design Principles

1. **Guide, don't force** --- The sidebar is a navigation aid, not a gate.
   Users can jump to any task at any time.
2. **Always visible, never blocking** --- The sidebar collapses to 48px but never disappears.
   Current position is always one glance away.
3. **Automate what's detectable** --- Task completion is auto-detected where possible
   (title set, journal selected, text length thresholds, citation counts).
4. **Celebrate progress** --- Animations, color transitions, and progress bars create
   a sense of accomplishment.
5. **Two-level hierarchy only** --- Phase -> Task. No deeper nesting. Keep it scannable.

---

## 2. Page Structure Redesign

### 2.1 Current Page Structure

```
/                           Landing page
/dashboard                  Document list (flat, minimal info)
/documents/[id]             Editor (all features crammed into one view)
/pricing                    Pricing page
/settings/*                 User settings
/admin/*                    Admin panel
/faq                        FAQ page
/login                      Login page
```

**Problems**:
- `/dashboard` shows a flat list with no journey context
- `/documents/[id]` tries to be everything: editor, citation manager, reviewer, compliance checker
- No concept of "workspace" --- everything is a single page
- "documents" is terminology from the translation-tool era

### 2.2 New Page Structure

```
/                           Landing page (unchanged)
/papers                     My Papers --- journey-centric paper overview
/papers/new                 New Paper wizard (guided setup)
/papers/[id]                Paper Workspace --- main working area
  (default view)              Journey sidebar + Editor (write tab)
  ?tab=write                  Writing view
  ?tab=citations              Citations view
  ?tab=review                 Review view
  ?view=journey               Full-page journey map (optional)
/pricing                    Pricing page (unchanged)
/settings/*                 User settings (unchanged)
/admin/*                    Admin panel (unchanged)
/faq                        FAQ page (unchanged)
/login                      Login page (unchanged)
```

### 2.3 URL Migration Strategy

| Old URL | New URL | Method |
|---------|---------|--------|
| `/dashboard` | `/papers` | 301 redirect |
| `/documents/[id]` | `/papers/[id]` | 301 redirect |
| Direct bookmarks | Preserved via redirect | Permanent redirects |

**Implementation**: Next.js middleware + `next.config.js` redirects.

### 2.4 Terminology Migration

| Old Term | New Term | Rationale |
|----------|----------|-----------|
| Documents (document) | Papers (paper) | "Paper" is natural for academic writing |
| Dashboard | My Papers | Paper-centric, not tool-centric |
| My Documents | My Papers | Same as above |
| New Document | New Paper | Same as above |
| Document Editor | Paper Workspace | "Workspace" implies a richer environment |

---

## 3. Header Redesign

### 3.1 Current Header (Site-Wide)

```
+------------------------------------------------------------------+
| [Unmute AI logo]   [Dashboard]   [Pricing]        [LocaleSwitcher] [Login/UserMenu] |
+------------------------------------------------------------------+
```

**Problems**:
- Only two navigation items for logged-in users
- "Dashboard" doesn't communicate the paper-writing focus
- No indication of current paper or progress when in the editor
- No quick access to usage guide or help

### 3.2 New Header (Site-Wide, Logged In)

```
+------------------------------------------------------------------+
| [Unmute AI logo]   [My Papers]   [Guide]   [Pricing]   [LocaleSwitcher] [UserMenu] |
+------------------------------------------------------------------+
```

| Element | Description |
|---------|-------------|
| My Papers | Replaces "Dashboard". Links to `/papers` |
| Guide | New. Links to a usage guide / getting started page |
| Pricing | Unchanged |
| LocaleSwitcher | Unchanged |
| UserMenu | Unchanged |

### 3.3 New Header (Paper Workspace)

The workspace header replaces the site-wide header entirely when inside a paper.

```
+---------------------------------------------------------------------+
| [< My Papers]  [Paper Title (editable)]  |  Phase 3/7: Structure  |  [Pomodoro] [Evidence] [Export] [Save] [Versions] [Settings] [UserMenu] |
+---------------------------------------------------------------------+
```

#### Left section: Navigation + Identity
- **[< My Papers]**: Back button with label. Replaces logo + breadcrumb.
- **[Paper Title]**: Editable inline. Click to edit, Enter to save.

#### Center section: Current Position (NEW)
- **Phase indicator**: "Phase 3/7: Structure Design"
- Always visible. One-glance orientation for the researcher.
- Clicking opens the journey sidebar (if collapsed).
- Styled as a subtle badge: `bg-primary/10 text-primary rounded-full px-3 py-1`

#### Right section: Actions
- **Pomodoro**: Timer button (existing)
- **Evidence**: Evidence panel toggle (existing)
- **Export**: Export dialog trigger (existing)
- **Save**: Save button (existing)
- **Versions**: Version panel (existing)
- **Settings**: Links to `/settings/preferences?returnTo=/papers/[id]`
- **UserMenu**: User avatar + dropdown (existing)

### 3.4 Header Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| >= 1024px (lg) | Full header as described above |
| 768-1023px (md) | Phase indicator moves to second row. Action labels hidden (icons only) |
| < 768px (sm) | Paper title truncated. Phase indicator in hamburger menu. Sidebar becomes bottom sheet |

### 3.5 Visual Specifications

```css
/* Workspace Header */
.workspace-header {
  height: 56px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Phase Badge */
.phase-badge {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  font-size: 13px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 9999px;
  white-space: nowrap;
}
```

---

## 4. Journey Sidebar (Most Important Component)

### 4.1 Concept

The Journey Sidebar is the centerpiece of the UX overhaul. It replaces the current
`journey-nav.tsx` --- a small horizontal bar that expands inline --- with a full
vertical sidebar that serves as the researcher's constant companion.

**Current implementation** (`journey-nav.tsx`):
- Horizontal bar at the top of the editor
- Collapsed by default to a single line showing phase dots + current task
- Expands inline to show all phases/tasks in card layout
- No visual connection lines
- No "next action" card
- Hidden behind a toggle (Eye/EyeOff)
- 247 lines of code

**New implementation** (`journey-sidebar.tsx`):
- Vertical sidebar on the left side of the workspace
- Expanded by default (280px width)
- Collapses to icon strip (48px width)
- GitHub-style connection lines between tasks
- "Next Action" card always visible at bottom
- Toggle is a [+]/[-] button at the top
- Estimated 600-800 lines of code

### 4.2 Layout: Expanded State (width: 280px)

```
+-------------------------------+
| Paper Writing Journey    [-]  |  <-- Collapse button
| ======================== 35%  |  <-- Progress bar + percentage
|                               |
| ---- Phase 1: Preparation    |  <-- GREEN header (completed)
| |  V  1.1 Topic definition   |  <-- Green check, strikethrough text
| |  V  1.2 Journal selection  |
| |  V  1.3 Guidelines review  |
| |                             |
| ---- Phase 2: Literature     |  <-- GREEN header (completed)
| |  V  2.1 Paper search       |
| |  V  2.2 Citation verify    |
| |  V  2.3 Evidence extract   |
| |  V  2.4 Gap analysis       |
| |                             |
| -::: Phase 3: Structure      |  <-- BLUE header (in progress)
| :  V  3.1 Outline            |
| :  >> 3.2 Paragraph design   |  <-- CURRENT TASK (highlighted)
| :  o  3.3 Pre-check          |  <-- Grey circle (pending)
| :                             |
| .... Phase 4: Writing         |  <-- GREY header (not started)
| .  o  4.1 Introduction       |
| .  o  4.2 Methods            |
| .  o  4.3 Results            |
| .  o  4.4 Discussion         |
| .  o  4.5 Abstract           |
| .                             |
| .... Phase 5: Citations       |
| .... Phase 6: Review          |
| .... Phase 7: Submission      |
|                               |
| +---------------------------+ |
| | NEXT ACTION               | |
| | Paragraph design          | |
| | Design the role of each   | |
| | paragraph                 | |
| | Est: ~1 hour              | |
| | [Start this task ->]      | |
| | [Skip]                    | |
| +---------------------------+ |
+-------------------------------+
```

### 4.3 Layout: Collapsed State (width: 48px)

```
+----+
| [+]|  <-- Expand button
|    |
| ●  |  <-- Phase 1 (green dot, completed)
| ●  |  <-- Phase 2 (green dot, completed)
| ◐  |  <-- Phase 3 (blue pulsing dot, in progress)
| ○  |  <-- Phase 4 (grey dot, not started)
| ○  |  <-- Phase 5
| ○  |  <-- Phase 6
| ○  |  <-- Phase 7
|    |
| 35%|  <-- Progress percentage
+----+
```

### 4.4 Detailed Visual Specifications

#### 4.4.1 Sidebar Container

```css
.journey-sidebar {
  /* Expanded */
  width: 280px;
  min-width: 280px;
  height: 100%;                    /* Full height of workspace area */
  border-right: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1),
              min-width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.journey-sidebar.collapsed {
  width: 48px;
  min-width: 48px;
}
```

#### 4.4.2 Progress Bar

```css
.journey-progress {
  padding: 12px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.journey-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: hsl(var(--muted));
  overflow: hidden;
}

.journey-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg,
    hsl(var(--primary)),
    hsl(142 76% 36%)           /* green-500 for completed portion */
  );
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

.journey-progress-label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}
```

#### 4.4.3 Phase Header

```css
.phase-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background 150ms;
}

.phase-header:hover {
  background: hsl(var(--accent) / 0.5);
}

.phase-header.completed {
  color: hsl(142 76% 36%);     /* green-600 */
}

.phase-header.in-progress {
  color: hsl(var(--primary));
}

.phase-header.not-started {
  color: hsl(var(--muted-foreground));
}
```

#### 4.4.4 Connection Lines (GitHub-style)

The connection lines run vertically on the left side of the task list,
creating a visual thread connecting all tasks within a phase.

```css
/* Container for the vertical line */
.task-list {
  position: relative;
  margin-left: 26px;            /* Space for the line + dot */
  padding-left: 20px;           /* Space between line and text */
}

/* Vertical connection line */
.task-list::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
}

/* Line styles by phase status */
.task-list.completed::before {
  background: hsl(142 76% 36%);    /* green-500 solid */
}

.task-list.in-progress::before {
  background: linear-gradient(
    to bottom,
    hsl(var(--primary)),
    hsl(var(--primary)) var(--active-progress, 50%),
    hsl(var(--muted-foreground) / 0.2) var(--active-progress, 50%)
  );
}

.task-list.not-started::before {
  background: repeating-linear-gradient(
    to bottom,
    hsl(var(--muted-foreground) / 0.2) 0px,
    hsl(var(--muted-foreground) / 0.2) 4px,
    transparent 4px,
    transparent 8px
  );                                /* Dashed grey line */
}
```

#### 4.4.5 Task Dots

```css
/* Task dot (circle on the connection line) */
.task-dot {
  position: absolute;
  left: -5px;                   /* Centered on the 2px line */
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  background: hsl(var(--card)); /* White center */
  z-index: 1;
}

.task-dot.completed {
  background: hsl(142 76% 36%);
  border-color: hsl(142 76% 36%);
}

.task-dot.in-progress {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.task-dot.not-started {
  background: hsl(var(--card));
  border-color: hsl(var(--muted-foreground) / 0.3);
}

.task-dot.skipped {
  background: hsl(var(--card));
  border-color: hsl(var(--muted-foreground) / 0.2);
}

.task-dot.locked {
  background: hsl(var(--muted) / 0.5);
  border-color: hsl(var(--muted-foreground) / 0.1);
}

/* Pulse animation for current task */
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
  50% { box-shadow: 0 0 0 6px hsl(var(--primary) / 0); }
}
```

#### 4.4.6 Task Row

```css
.task-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 0;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  border-radius: 6px;
  transition: background 150ms;
  min-height: 32px;
}

.task-row:hover {
  background: hsl(var(--accent) / 0.5);
}

/* Current task highlight */
.task-row.current {
  background: hsl(var(--primary) / 0.08);
  font-weight: 600;
  color: hsl(var(--primary));
}

.task-row.current::after {
  content: '';
  position: absolute;
  right: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: hsl(var(--primary));
  border-radius: 2px;
}

/* Completed task */
.task-row.completed {
  color: hsl(var(--muted-foreground));
  text-decoration: line-through;
}

/* Skipped task */
.task-row.skipped {
  color: hsl(var(--muted-foreground) / 0.5);
  text-decoration: line-through;
}

/* Locked task */
.task-row.locked {
  color: hsl(var(--muted-foreground) / 0.4);
  cursor: not-allowed;
}
```

#### 4.4.7 Task Status Summary Table

| Status | Dot Style | Line Style | Text Style | Background | Icon |
|--------|-----------|------------|------------|------------|------|
| Completed | Solid green circle | Green solid line | Strikethrough, muted grey | None | Green checkmark |
| In Progress (current) | Blue pulsing circle | Blue solid line | Bold, primary color | Light blue (primary/8) | Blue arrow indicator |
| In Progress (not current) | Blue solid circle | Blue solid line | Normal, foreground | None | None |
| Not Started | Grey outline circle | Grey dashed line | Normal, foreground | None | None |
| Skipped | Grey outline circle with slash | Grey dashed line | Strikethrough, very muted | None | Skip icon |
| Locked (dependency not met) | Very faint grey circle | No line | Very muted, faint grey | None | Lock icon |

### 4.5 Task Row Interactions

#### 4.5.1 Click: Navigate to Feature

Each task is linked to a specific feature screen via `linkedTab` and `linkedFeature`
in `task-registry.ts`. Clicking a task row triggers navigation:

```typescript
const handleTaskClick = (task: TaskDefinition) => {
  // 1. Switch to the linked tab
  if (task.linkedTab) {
    setActiveTab(task.linkedTab);
  }

  // 2. Trigger feature-specific actions
  switch (task.linkedFeature) {
    case 'start-paper':
      openNewPaperDialog();
      break;
    case 'journal-selector':
      focusJournalSelector();
      break;
    case 'evidence-search':
      setActiveTab('citations');
      setCitationsSubTab('search');
      break;
    case 'evidence-mapping':
      setActiveTab('citations');
      setCitationsSubTab('mapping');
      break;
    case 'flow-analysis':
      setActiveTab('review');
      scrollToFlowAnalysis();
      break;
    case 'compliance-check':
    case 'compliance-final':
      setActiveTab('review');
      scrollToCompliance();
      break;
    case 'editor-introduction':
      setActiveTab('write');
      setActiveSection('INTRODUCTION');
      break;
    case 'editor-methods':
      setActiveTab('write');
      setActiveSection('METHODS');
      break;
    case 'editor-results':
      setActiveTab('write');
      setActiveSection('RESULTS');
      break;
    case 'editor-discussion':
      setActiveTab('write');
      setActiveSection('DISCUSSION');
      break;
    case 'editor-abstract':
      setActiveTab('write');
      setActiveSection('ABSTRACT');
      break;
    // ... more cases
  }
};
```

#### 4.5.2 Hover: Show Tooltip

```
+----------------------------------+
| 2.3 Evidence Extraction         |
|                                  |
| Extract ClaimCards from full-text|
| papers in your library.         |
|                                  |
| Estimated: ~2 hours             |
| Depends on: 2.2 Citation Verify |
+----------------------------------+
```

Tooltip appears after 500ms hover delay. Positioned to the right of the sidebar.
Uses Radix UI `Tooltip` component (already in the project).

#### 4.5.3 Right-Click / Long-Press: Context Menu

```
+----------------------------+
| Mark as completed     [Ctrl+Enter] |
| Skip this task        [Ctrl+S]     |
| ---                                |
| View details                       |
| Reset to not started               |
+----------------------------+
```

Uses Radix UI `ContextMenu` component. Long-press (500ms) on mobile triggers the same menu.

#### 4.5.4 Completion Animation

When a task is marked as completed (manually or auto-detected):

1. **Check animation** (200ms): The dot morphs from current state to green checkmark
   using a CSS transition + SVG path animation.
2. **Line extension** (300ms): The green solid line extends downward to connect to the next task.
3. **Text strike** (200ms): Text color fades to grey and strikethrough appears.
4. **Confetti micro-burst** (300ms): 3-5 tiny green particles burst from the dot.
   Only on manual completion, not auto-completion.
5. **Next task scroll** (400ms): Sidebar smoothly scrolls to center the next incomplete task.
6. **Next Action card update** (300ms): Card content fades out and fades in with new task info.

```css
/* Completion transition */
.task-dot.completing {
  animation: complete-burst 400ms ease-out;
}

@keyframes complete-burst {
  0% { transform: scale(1); background: hsl(var(--primary)); }
  30% { transform: scale(1.5); background: hsl(142 76% 36%); }
  100% { transform: scale(1); background: hsl(142 76% 36%); }
}

/* Line extension */
.task-list.completing::before {
  transition: background 500ms ease-out;
}

/* Text strikethrough */
.task-row.completing .task-label {
  transition: color 200ms, text-decoration 200ms;
}
```

### 4.6 Phase Collapse/Expand

Each phase can be independently collapsed or expanded:

- **Default state**: Completed phases are collapsed. Current phase and one future phase are expanded.
- **Click on phase header**: Toggle collapsed/expanded.
- **Collapsed phase**: Shows only the phase header with status icon and completion count.
- **Transition**: Height animation (200ms) with `overflow: hidden`.

```
+-------------------------------+
| V Phase 1: Preparation  3/3  |  <-- Collapsed, all done
|                               |
| V Phase 2: Literature   4/4  |  <-- Collapsed, all done
|                               |
| > Phase 3: Structure    1/3  |  <-- EXPANDED (current)
| :  V  3.1 Outline            |
| :  >> 3.2 Paragraph design   |
| :  o  3.3 Pre-check          |
|                               |
| > Phase 4: Writing      0/5  |  <-- EXPANDED (next)
| .  o  4.1 Introduction       |
| .  o  4.2 Methods            |
| .  o  4.3 Results            |
| .  o  4.4 Discussion         |
| .  o  4.5 Abstract           |
|                               |
| V Phase 5: Citations    0/4  |  <-- Collapsed
| V Phase 6: Review       0/4  |  <-- Collapsed
| V Phase 7: Submission   0/4  |  <-- Collapsed
+-------------------------------+
```

### 4.7 "Next Action" Card (Always Visible)

The Next Action card is pinned to the bottom of the sidebar. It provides
the researcher with immediate guidance on what to do next.

#### 4.7.1 Card Layout

```
+---------------------------+
| NEXT ACTION               |  <-- Label in caps, muted
|                           |
| Paragraph Design          |  <-- Task name, bold
| Design the role of each   |  <-- Task description
| paragraph (background ->  |
| problem -> gap -> method  |
| -> contribution)          |
|                           |
| Est: ~1 hour              |  <-- Estimated time
| Phase 3: Structure Design |  <-- Phase context
|                           |
| [Start this task ->]      |  <-- Primary button
| [Skip]                    |  <-- Ghost button
+---------------------------+
```

#### 4.7.2 Card Styling

```css
.next-action-card {
  margin: 12px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 0.05),
    hsl(var(--primary) / 0.02)
  );
  border: 1px solid hsl(var(--primary) / 0.15);
  position: sticky;
  bottom: 12px;
}

.next-action-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsl(var(--primary) / 0.6);
  margin-bottom: 8px;
}

.next-action-title {
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.next-action-description {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
  margin-bottom: 12px;
}

.next-action-meta {
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 0.8);
  margin-bottom: 16px;
}

.next-action-start-button {
  width: 100%;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  /* Subtle glow animation to draw attention */
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
  50% { box-shadow: 0 0 12px 2px hsl(var(--primary) / 0.15); }
}
```

#### 4.7.3 Auto-Advance Behavior (Udemy-style)

When a task is completed:

1. **Immediate**: Completion animation plays (section 4.5.4).
2. **After 500ms**: Next Action card content transitions to the next task.
3. **After 1000ms**: The "Start this task" button pulses with a glow effect.
4. **After 2000ms** (if auto-advance enabled): Automatically navigate to the next task's
   feature screen. The main content area transitions to the linked tab/feature.

**Auto-advance setting**: Stored in user preferences (`localStorage`).
Default: **enabled**. Toggle in Settings > Preferences.

```typescript
// Auto-advance logic
const handleTaskComplete = async (taskId: string) => {
  await completeTask(taskId);

  // Play completion animation
  setCompletingTask(taskId);
  setTimeout(() => setCompletingTask(null), 600);

  // Update next action card
  const nextTask = getNextIncompleteTask();
  setNextActionTask(nextTask);

  // Auto-advance if enabled
  const autoAdvance = localStorage.getItem('unmute:auto-advance') !== 'false';
  if (autoAdvance && nextTask) {
    setTimeout(() => {
      handleTaskClick(nextTask);
    }, 2000);
  }
};
```

### 4.8 Sidebar Dimensions and Spacing

| Element | Value | Notes |
|---------|-------|-------|
| Expanded width | 280px | Fixed, not resizable |
| Collapsed width | 48px | Just enough for dots + toggle |
| Phase header height | 36px | Includes 8px padding top/bottom |
| Task row height | 32px min | Can grow for long task names |
| Task dot size | 12px | 2px border |
| Connection line width | 2px | |
| Left margin (dot area) | 26px | Space for dot + line |
| Task text left padding | 20px | From the line to text |
| Sidebar padding | 0 top, 12px bottom | Content flows to edges |
| Progress bar section height | 60px | Including padding |
| Next Action card min-height | 180px | Sticky to bottom |
| Phase gap | 4px | Between phase sections |
| Task gap | 0px | Tasks are tight, line connects them |

### 4.9 Sidebar and Main Content Interaction

The sidebar and main content area are deeply linked:

```
+----+---------+----------------------------------------------+
|    |         |                                              |
| S  | Journey | Main Content Area                            |
| I  | Sidebar | (Write / Citations / Review tab content)     |
| D  |         |                                              |
| E  | Phase 1 | +------------------------------------------+ |
| B  | Phase 2 | |  Editor / Citations / Review panels       | |
| A  | Phase 3 | |                                          | |
| R  | Phase 4 | |                                          | |
|    | Phase 5 | |                                          | |
|    | Phase 6 | |                                          | |
|    | Phase 7 | |                                          | |
|    |         | +------------------------------------------+ |
|    | [Next]  |                                              |
+----+---------+----------------------------------------------+
```

#### Task -> Feature Screen Mapping

| Task | Click Action |
|------|-------------|
| 1.1 Topic definition | Write tab + Open paper settings dialog |
| 1.2 Journal selection | Write tab + Focus journal selector dropdown |
| 1.3 Guidelines review | Review tab + Scroll to Compliance panel |
| 2.1 Paper search | Citations tab + Search sub-tab |
| 2.2 Citation verify | Citations tab + Search sub-tab (library view) |
| 2.3 Evidence extract | Citations tab + Evidence Map sub-tab |
| 2.4 Gap analysis | Citations tab + Coverage sub-tab (future) |
| 3.1 Outline creation | Write tab + Section rail configuration mode |
| 3.2 Paragraph design | Review tab + Flow Analysis panel |
| 3.3 Pre-check | Review tab + Compliance panel |
| 4.1 Introduction | Write tab + Scroll to INTRODUCTION section |
| 4.2 Methods | Write tab + Scroll to METHODS section |
| 4.3 Results | Write tab + Scroll to RESULTS section |
| 4.4 Discussion | Write tab + Scroll to DISCUSSION section |
| 4.5 Abstract | Write tab + Scroll to ABSTRACT section |
| 5.1 Citation Auto-Pilot | Citations tab + Auto-Pilot mode (future) |
| 5.2 Evidence Mapping | Citations tab + Evidence Map sub-tab |
| 5.3 Human Verification | Citations tab + Evidence Map (verification mode) |
| 5.4 Evidence Report | Export dialog + Evidence PPTX option |
| 6.1 Flow Analysis | Review tab + Flow Analysis panel |
| 6.2 Structure Check | Review tab + Structure Check (dialog) |
| 6.3 Final Compliance | Review tab + Compliance panel |
| 6.4 Adversarial Review | Review tab + Adversarial Review (future) |
| 7.1 Format adjustment | Write tab + Format settings |
| 7.2 Export | Export dialog |
| 7.3 Submission checklist | Review tab + Submission Plan panel |
| 7.4 Final confirmation | Review tab + Submission Plan panel |

---

## 5. Dashboard (My Papers) Redesign

### 5.1 Current Dashboard

The current dashboard (`/dashboard/page.tsx`) consists of:
- A heading "My Documents" with plan badge and document count
- A `CreateDocumentButton`
- A `DocumentList` showing cards with: title, version number, update date, journal, language pair, citation count, and a small phase badge
- A `LiteratureWatchWidget` at the bottom

**Problems**:
- No progress visualization (just "Phase 3: Task 3.2" as text)
- No progress bar
- No metrics summary
- No journey starting point for existing documents
- "Documents" terminology
- Cards are link-to-editor, not link-to-workspace

### 5.2 New Dashboard Layout

```
+--------------------------------------------------------------+
| [Site Header: Unmute AI | My Papers | Guide | Pricing | User] |
+--------------------------------------------------------------+
|                                                               |
|  My Papers                          [Start a new paper]       |
|                                                               |
|  +----------------------------------------------------------+|
|  |  Deep learning for medical image segmentation            ||
|  |  ======================================== 65%            ||
|  |  Phase 5: Citations -- Task 5.2: Evidence Mapping        ||
|  |  12 citations | 8 verified | Score: 72 (CLAIM) | 42h    ||
|  |  Updated: 3/15 14:30       [Continue writing ->]         ||
|  +----------------------------------------------------------+|
|                                                               |
|  +----------------------------------------------------------+|
|  |  LLM-based clinical text analysis                        ||
|  |  ======== 15%                                            ||
|  |  Phase 2: Literature -- Task 2.1: Paper search           ||
|  |  3 citations | 0 verified | 5h total                    ||
|  |  Updated: 3/14 09:15       [Continue writing ->]         ||
|  +----------------------------------------------------------+|
|                                                               |
|  +----------------------------------------------------------+|
|  |  [Legacy] Untitled paper                                 ||
|  |  No journey started                                      ||
|  |  Updated: 2/28 16:00       [Start journey ->]            ||
|  +----------------------------------------------------------+|
|                                                               |
|  +-- Literature Watch ----------------------------------------+|
|  |  3 new papers: medical image segmentation, LLM clinical... ||
|  +-----------------------------------------------------------+|
|                                                               |
+---------------------------------------------------------------+
```

### 5.3 Paper Card Component Specification

#### 5.3.1 Card with Active Journey

```
+------------------------------------------------------------------+
|                                                                    |
|  Deep learning for medical image segmentation                      |  <-- Title (font-semibold, text-base)
|                                                                    |
|  [====================================          ] 65%             |  <-- Progress bar (h-2, rounded-full)
|                                                                    |
|  Phase 5: Citations  >  Task 5.2: Evidence Mapping                |  <-- Current position (text-sm, text-primary)
|                                                                    |
|  +-------+ +--------+ +-----------+ +------+                      |
|  | 12 ref| | 8 vfied| | 72 CLAIM  | | 42h  |                     |  <-- Metric pills
|  +-------+ +--------+ +-----------+ +------+                      |
|                                                                    |
|  Updated: 3/15 14:30                    [Continue writing ->]      |
|                                                                    |
+------------------------------------------------------------------+
```

#### 5.3.2 Card without Journey (Legacy Document)

```
+------------------------------------------------------------------+
|                                                                    |
|  Untitled paper                                         v3         |
|                                                                    |
|  No guided journey active                                          |
|  ja -> en | general | 0 citations                                  |
|                                                                    |
|  Updated: 2/28 16:00                    [Start journey ->]         |
|                                                                    |
+------------------------------------------------------------------+
```

#### 5.3.3 Card Styling

```css
.paper-card {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 20px 24px;
  background: hsl(var(--card));
  transition: border-color 200ms, box-shadow 200ms;
  cursor: pointer;
}

.paper-card:hover {
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: 0 2px 8px hsl(var(--primary) / 0.08);
}

.paper-card-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 12px;
}

.paper-card-progress {
  height: 8px;
  border-radius: 4px;
  background: hsl(var(--muted));
  margin-bottom: 12px;
  overflow: hidden;
}

.paper-card-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg,
    hsl(142 76% 36%),              /* Green for completed portion */
    hsl(var(--primary))            /* Blue for current phase */
  );
  transition: width 500ms ease;
}

.paper-card-phase {
  font-size: 14px;
  color: hsl(var(--primary));
  font-weight: 500;
  margin-bottom: 12px;
}

.paper-card-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.paper-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.paper-card-date {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.paper-card-action {
  /* Primary ghost button */
}
```

### 5.4 Metrics Displayed on Paper Card

| Metric | Icon | Source | Format |
|--------|------|--------|--------|
| Citations | BookOpen | `manuscriptCitations.count` | "12 citations" |
| Verified | CheckCircle | Evidence records with `humanVerified=true` | "8 verified" |
| Compliance Score | Shield | Latest compliance check result | "72 CLAIM" |
| Total Time | Clock | Sum of `WritingSession.duration` | "42h total" |
| Progress | ProgressBar | `PaperJourney.taskStatuses` | "65%" |

### 5.5 Journey Start for Existing Documents

When a document has no `PaperJourney` record, the card shows a
"Start journey" button instead of progress information.

**Start Journey Flow**:

1. User clicks "Start journey" on a legacy document card.
2. System analyzes the current state of the document:
   - Has text content? -> Skip to Phase 4
   - Has citations? -> Mark Phase 2 tasks as complete
   - Has journal selected? -> Mark 1.2 as complete
   - Has custom title? -> Mark 1.1 as complete
3. A `PaperJourney` record is created with pre-computed statuses.
4. User is redirected to the paper workspace with the sidebar showing.

```typescript
async function startJourneyForExistingDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      _count: { select: { manuscriptCitations: true } },
    },
  });

  if (!doc) throw new Error('Document not found');

  const taskStatuses: Record<string, string> = {};
  const latestVersion = doc.versions[0];

  // Auto-detect completed tasks based on current document state
  if (doc.title && doc.title !== 'Untitled paper' && doc.title !== 'Untitled translation') {
    taskStatuses['1.1'] = 'completed';
  }
  if (latestVersion?.journal && latestVersion.journal !== 'general') {
    taskStatuses['1.2'] = 'completed';
  }
  if (doc._count.manuscriptCitations > 0) {
    taskStatuses['2.1'] = 'completed';
  }
  const sourceText = latestVersion?.sourceText ?? '';
  if (sourceText.trim().length > 500) {
    taskStatuses['4.1'] = 'completed';
  }

  // Compute position
  const { currentPhase, currentTask, phaseStatuses } = computeCurrentPosition(taskStatuses);

  await prisma.paperJourney.create({
    data: {
      documentId,
      currentPhase,
      currentTask,
      phaseStatuses: JSON.parse(JSON.stringify(phaseStatuses)),
      taskStatuses: JSON.parse(JSON.stringify(taskStatuses)),
      guideVisible: true,
    },
  });
}
```

---

## 6. Paper Workspace Layout

### 6.1 Overall Composition

The Paper Workspace is the main working area. It replaces the current
full-screen editor with a two-column layout.

```
+---------------------------------------------------------------------+
| [Workspace Header]                                                   |
+----+---------+-------------------------------------------------------+
|    |         | [Write] [Citations] [Review]          <- Workflow Tabs |
|    |         | [Abstract|Intro|Methods|Results|...]  <- Section Rail |
|    |         |                                                       |
|    | Journey | +---------------------------------------------------+ |
|    | Sidebar | |                                                   | |
|    |         | |  Main Content Area                                | |
|    | (280px  | |  (Editor panels / Citations / Review)             | |
|    |  or     | |                                                   | |
|    |  48px)  | |                                                   | |
|    |         | |                                                   | |
|    |         | |                                                   | |
|    |         | +---------------------------------------------------+ |
|    |         |                                                       |
|    | [Next   |                                                       |
|    |  Action]|                                                       |
+----+---------+-------------------------------------------------------+
```

### 6.2 Layout Implementation

```tsx
// Paper Workspace layout structure
<div className="flex flex-col h-screen">
  {/* Workspace Header */}
  <WorkspaceHeader
    documentId={documentId}
    title={displayTitle}
    currentPhase={journey?.currentPhase}
    totalPhases={7}
    phaseName={currentPhase?.name}
    onToggleSidebar={toggleSidebar}
  />

  {/* Main workspace area */}
  <div className="flex flex-1 min-h-0">
    {/* Journey Sidebar */}
    <JourneySidebar
      documentId={documentId}
      collapsed={sidebarCollapsed}
      onToggle={toggleSidebar}
      onTaskClick={handleTaskClick}
    />

    {/* Content area */}
    <div className="flex flex-col flex-1 min-w-0">
      {/* Language Bar (Write tab only) */}
      {activeTab === 'write' && <LanguageBar ... />}

      {/* Workflow Tabs */}
      <WorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Section Rail (Write tab only) */}
      {activeTab === 'write' && <SectionRail ... />}

      {/* Tab Content */}
      {activeTab === 'write' && <WriteView ... />}
      {activeTab === 'citations' && <CitationsView ... />}
      {activeTab === 'review' && <ReviewView ... />}
    </div>
  </div>
</div>
```

### 6.3 Sidebar-Content Synchronization

When the sidebar task is clicked, the main content area responds:

```
Task 1.1 clicked -> setActiveTab('write') -> open paper setup dialog
Task 2.1 clicked -> setActiveTab('citations') -> setCitationsSubTab('search')
Task 3.2 clicked -> setActiveTab('review') -> scrollTo(flowAnalysisPanel)
Task 4.1 clicked -> setActiveTab('write') -> setActiveSection('INTRODUCTION')
Task 5.2 clicked -> setActiveTab('citations') -> setCitationsSubTab('mapping')
Task 6.1 clicked -> setActiveTab('review') -> scrollTo(flowAnalysisPanel)
Task 6.3 clicked -> setActiveTab('review') -> scrollTo(compliancePanel)
Task 7.3 clicked -> setActiveTab('review') -> scrollTo(submissionPlanPanel)
```

This is already partially implemented in `editor-page-client.tsx` line 372-376:

```typescript
const handleJourneyTaskClick = useCallback((task: TaskDefinition) => {
  if (task.linkedTab) {
    setActiveTab(task.linkedTab);
  }
}, []);
```

The new implementation extends this with `linkedFeature`-based navigation.

### 6.4 Responsive Behavior

| Breakpoint | Sidebar | Content |
|------------|---------|---------|
| >= 1280px (xl) | Expanded (280px) by default | Full content area |
| 1024-1279px (lg) | Collapsed (48px) by default | Full content area |
| 768-1023px (md) | Hidden. Toggle shows as overlay | Full width |
| < 768px (sm) | Bottom sheet (swipe up) | Full width, stacks vertically |

#### Mobile Bottom Sheet

On mobile (< 768px), the sidebar becomes a bottom sheet:

```
+----------------------------------+
| [Main Content]                   |
|                                  |
|                                  |
|                                  |
+----------------------------------+
| Phase 3/7: Structure  35%  [^]  |  <-- Peek bar (always visible, 48px)
+----------------------------------+
```

Swipe up or tap [^] to expand:

```
+----------------------------------+
| [Main Content (dimmed)]          |
|                                  |
+----------------------------------+
| Paper Writing Journey            |
| =================== 35%         |
|                                  |
| Phase 1: Preparation       3/3  |
| Phase 2: Literature        4/4  |
| > Phase 3: Structure       1/3  |
|   V  3.1 Outline                |
|   >> 3.2 Paragraph design       |
|   o  3.3 Pre-check              |
| Phase 4: Writing           0/5  |
| ...                              |
|                                  |
| [Next: Paragraph Design ->]     |
+----------------------------------+
```

---

## 7. Detailed Component Specifications

### 7.1 JourneySidebar Component API

```typescript
interface JourneySidebarProps {
  documentId: string;
  collapsed: boolean;
  onToggle: () => void;
  onTaskClick: (task: TaskDefinition) => void;
  className?: string;
}

interface JourneyState {
  currentPhase: number;
  currentTask: string;
  phaseStatuses: Record<string, 'completed' | 'in_progress' | 'not_started'>;
  taskStatuses: Record<string, 'completed' | 'in_progress' | 'not_started' | 'skipped'>;
  guideVisible: boolean;
}
```

### 7.2 WorkspaceHeader Component API

```typescript
interface WorkspaceHeaderProps {
  documentId: string;
  title: string;
  onTitleChange: (title: string) => void;
  currentPhase: number;
  totalPhases: number;
  phaseName: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}
```

### 7.3 PaperCard Component API

```typescript
interface PaperCardProps {
  paper: {
    id: string;
    title: string;
    updatedAt: Date;
    versions: {
      versionNumber: number;
      sourceLang: string;
      targetLang: string;
      journal: string | null;
    }[];
    _count: {
      manuscriptCitations: number;
    };
    journey: {
      currentPhase: number;
      currentTask: string;
      taskStatuses: Record<string, string>;
      phaseStatuses: Record<string, string>;
    } | null;
    // Extended metrics
    verifiedCitationCount?: number;
    latestComplianceScore?: number;
    latestComplianceGuideline?: string;
    totalWritingMinutes?: number;
  };
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onStartJourney?: (id: string) => void;
}
```

### 7.4 NextActionCard Component API

```typescript
interface NextActionCardProps {
  task: TaskDefinition | null;
  phase: PhaseDefinition | null;
  onStart: (task: TaskDefinition) => void;
  onSkip: (task: TaskDefinition) => void;
  isAnimating?: boolean;
}
```

---

## 8. Color System and Visual Language

### 8.1 Journey Status Colors

```css
:root {
  /* Completed status */
  --journey-completed: 142 76% 36%;         /* green-600 */
  --journey-completed-bg: 142 76% 36% / 0.1;
  --journey-completed-line: 142 76% 36%;
  --journey-completed-dot: 142 76% 36%;

  /* In-progress status */
  --journey-active: var(--primary);           /* Brand blue */
  --journey-active-bg: var(--primary) / 0.08;
  --journey-active-line: var(--primary);
  --journey-active-dot: var(--primary);

  /* Not started status */
  --journey-pending: var(--muted-foreground);
  --journey-pending-bg: transparent;
  --journey-pending-line: var(--muted-foreground) / 0.2;
  --journey-pending-dot: var(--muted-foreground) / 0.3;

  /* Skipped status */
  --journey-skipped: var(--muted-foreground) / 0.4;

  /* Locked status (dependency not met) */
  --journey-locked: var(--muted-foreground) / 0.15;
}
```

### 8.2 Dark Mode Adjustments

All colors use HSL with opacity, so they automatically adapt to dark mode
via the existing Tailwind `dark:` variants. The green completion color
lightens slightly in dark mode:

```css
.dark {
  --journey-completed: 142 71% 45%;        /* green-500 in dark mode */
}
```

### 8.3 Animation Timing

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Sidebar expand/collapse | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Toggle button |
| Progress bar fill | 500ms | cubic-bezier(0.4, 0, 0.2, 1) | Task completion |
| Task completion burst | 400ms | ease-out | Manual task completion |
| Line color transition | 500ms | ease-out | Task completion |
| Next action card fade | 300ms | ease-in-out | Task change |
| Phase collapse/expand | 200ms | ease | Phase header click |
| Task hover | 150ms | ease | Mouse enter/leave |
| Dot pulse (current) | 2000ms | cubic-bezier(0.4, 0, 0.6, 1) | Continuous |
| Glow pulse (CTA) | 3000ms | ease-in-out | Continuous |
| Scroll to next task | 400ms | ease-out | Task completion |
| Auto-advance delay | 2000ms | - | After completion animation |

---

## 9. Keyboard Shortcuts

### 9.1 Global Shortcuts (Paper Workspace)

| Shortcut | Action |
|----------|--------|
| `Cmd+\` | Toggle sidebar collapse/expand |
| `Cmd+J` | Jump to next incomplete task |
| `Cmd+Enter` | Complete current task |
| `Cmd+Shift+S` | Skip current task |
| `Cmd+1` | Switch to Write tab |
| `Cmd+2` | Switch to Citations tab |
| `Cmd+3` | Switch to Review tab |
| `Cmd+E` | Toggle Evidence panel (existing) |
| `Cmd+S` | Save (existing) |

### 9.2 Sidebar-Focused Shortcuts

| Shortcut | Action |
|----------|--------|
| `ArrowUp` | Select previous task |
| `ArrowDown` | Select next task |
| `Enter` | Navigate to selected task |
| `Space` | Toggle selected phase collapse/expand |

---

## 10. Data Model Changes

### 10.1 Existing PaperJourney Model (No Changes Needed)

The current `PaperJourney` model already supports everything needed:

```prisma
model PaperJourney {
  id             String           @id @default(cuid())
  documentId     String           @unique
  document       Document         @relation(fields: [documentId], references: [id], onDelete: Cascade)
  currentPhase   Int              @default(1)
  currentTask    String           @default("1.1")
  phaseStatuses  Json             @default("{}")
  taskStatuses   Json             @default("{}")
  guideVisible   Boolean          @default(true)
  taskCompletions TaskCompletion[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
}
```

### 10.2 New Fields for Enhanced Dashboard

To support the metrics on paper cards, we need to add aggregation queries
(not schema changes). The metrics come from existing tables:

| Metric | Query Source |
|--------|-------------|
| Citation count | `Document._count.manuscriptCitations` (existing) |
| Verified count | `EvidenceRecord.where(humanVerified: true).count` |
| Compliance score | `ReviewFinding.where(type: 'compliance').latest` |
| Total writing time | `WritingSession.sum(duration)` |
| Progress percentage | `getProgress(journey.taskStatuses)` (existing) |

### 10.3 User Preferences Extension

Add journey-related preferences to user settings:

```typescript
interface JourneyPreferences {
  autoAdvance: boolean;             // Auto-navigate to next task on completion
  sidebarDefaultCollapsed: boolean; // Start with sidebar collapsed
  completedPhasesCollapsed: boolean;// Auto-collapse completed phases
  showEstimatedTimes: boolean;      // Show estimated time per task
}
```

Storage: `localStorage` key `unmute:journey-preferences`

---

## 11. Implementation Plan

### Phase A: Journey Sidebar Component (1-2 weeks)

**Goal**: Replace `journey-nav.tsx` with the full sidebar component.

#### A.1: Core Sidebar Structure (3 days)
- [ ] Create `journey-sidebar.tsx` component
- [ ] Implement expanded/collapsed states with animation
- [ ] Render phase headers with status colors
- [ ] Render task rows with dot indicators
- [ ] Implement GitHub-style connection lines (CSS)
- [ ] Wire up existing journey API (`/api/v2/journey/[documentId]`)

#### A.2: Task Interactions (2 days)
- [ ] Click -> feature navigation (extend `handleJourneyTaskClick`)
- [ ] Hover -> tooltip with description/estimated time
- [ ] Right-click -> context menu (complete/skip/reset)
- [ ] Complete/skip API calls (existing endpoints)

#### A.3: Completion Animations (2 days)
- [ ] Dot morphing animation (current -> completed)
- [ ] Line color extension animation
- [ ] Text strikethrough transition
- [ ] Micro-confetti burst (manual completion only)
- [ ] Auto-scroll to next task

#### A.4: Next Action Card (1 day)
- [ ] Card component with task info, description, estimated time
- [ ] "Start this task" button wired to feature navigation
- [ ] "Skip" button wired to skip API
- [ ] Content transition animation on task change

#### A.5: Auto-Advance Logic (1 day)
- [ ] Implement auto-advance with configurable delay
- [ ] Add preference toggle in settings
- [ ] Handle edge cases (last task, all tasks complete)

### Phase B: Workspace Layout (1 week)

**Goal**: Create the two-column workspace layout with sidebar + content.

#### B.1: New Route Structure (2 days)
- [ ] Create `/papers/[id]/page.tsx` route
- [ ] Set up redirects from `/documents/[id]` to `/papers/[id]`
- [ ] Create `/papers/page.tsx` (new dashboard)
- [ ] Set up redirect from `/dashboard` to `/papers`

#### B.2: Workspace Layout (2 days)
- [ ] Create `PaperWorkspace` layout component
- [ ] Integrate sidebar + main content in flex layout
- [ ] Move language bar, workflow tabs, section rail into content area
- [ ] Responsive breakpoints for sidebar behavior

#### B.3: Workspace Header (1 day)
- [ ] Create `WorkspaceHeader` component
- [ ] Phase indicator badge in center
- [ ] Back-to-papers navigation
- [ ] Migrate existing header actions (Pomodoro, Save, Export, etc.)

### Phase C: Dashboard Rebuild (1 week)

**Goal**: Replace document list with paper cards showing journey progress.

#### C.1: Paper Card Component (2 days)
- [ ] Create `PaperCard` component with progress bar
- [ ] Display current phase/task, metrics pills
- [ ] "Continue writing" action button
- [ ] "Start journey" for legacy documents

#### C.2: Dashboard Data Loading (1 day)
- [ ] Extend `getDocuments()` to include journey data + metrics
- [ ] Add aggregation queries for verified count, compliance score, writing time
- [ ] Cache aggregated metrics (avoid N+1 queries)

#### C.3: Dashboard Page (2 days)
- [ ] Create `/papers/page.tsx` with new layout
- [ ] "Start a new paper" wizard flow
- [ ] Integration with existing `LiteratureWatchWidget`
- [ ] Terminology update: "My Papers" throughout

### Phase D: Polish and Mobile (1 week)

**Goal**: Refine animations, add keyboard shortcuts, mobile support.

#### D.1: Animation Polish (2 days)
- [ ] Smooth sidebar expand/collapse with content reflow
- [ ] Progress bar animations
- [ ] Phase collapse/expand height transitions
- [ ] Test all animations at 60fps

#### D.2: Keyboard Shortcuts (1 day)
- [ ] Implement global shortcuts (`Cmd+\`, `Cmd+J`, etc.)
- [ ] Sidebar-focused navigation (arrow keys when sidebar focused)
- [ ] Show shortcut hints in tooltips

#### D.3: Mobile Responsive (2 days)
- [ ] Bottom sheet implementation for sidebar on mobile
- [ ] Swipe gesture handling
- [ ] Peek bar with phase indicator
- [ ] Test on iOS Safari, Android Chrome

---

## 12. Breaking Changes Management

### 12.1 URL Changes

| Change | Migration |
|--------|-----------|
| `/dashboard` -> `/papers` | 301 redirect in `next.config.js` |
| `/documents/[id]` -> `/papers/[id]` | 301 redirect in middleware |
| API routes unchanged | No migration needed |

```javascript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/papers',
        permanent: true,
      },
      {
        source: '/:locale/dashboard',
        destination: '/:locale/papers',
        permanent: true,
      },
      {
        source: '/documents/:id',
        destination: '/papers/:id',
        permanent: true,
      },
      {
        source: '/:locale/documents/:id',
        destination: '/:locale/papers/:id',
        permanent: true,
      },
    ];
  },
};
```

### 12.2 Component Changes

| Current Component | Change | New Component |
|-------------------|--------|---------------|
| `journey-nav.tsx` | Replace | `journey-sidebar.tsx` |
| `editor-page-client.tsx` | Refactor | `paper-workspace.tsx` |
| `document-list.tsx` | Replace | `paper-list.tsx` with `paper-card.tsx` |
| `site-header.tsx` | Update | Add "My Papers" and "Guide" links |
| `workflow-tabs.tsx` | Keep | No change (move into content area) |
| `section-rail.tsx` | Keep | No change (move into content area) |

### 12.3 Terminology Changes in i18n

```json
// en.json additions/changes
{
  "header": {
    "dashboard": "My Papers",     // was "Dashboard"
    "guide": "Guide"              // new
  },
  "dashboard": {
    "myDocuments": "My Papers",   // was "My Documents"
    "noDocuments": "No papers yet", // was "No documents"
    "noDocumentsHint": "Start writing your first paper",
    "startJourney": "Start Journey",
    "continueWriting": "Continue writing"
  }
}
```

```json
// ja.json additions/changes
{
  "header": {
    "dashboard": "My Papers",
    "guide": "Guide"
  },
  "dashboard": {
    "myDocuments": "My Papers",
    "noDocuments": "No papers yet",
    "noDocumentsHint": "Start writing your first paper",
    "startJourney": "Start Journey",
    "continueWriting": "Continue writing"
  }
}
```

### 12.4 Data Migration

No database migration needed. The `PaperJourney` model is already in place.
For existing documents without a journey record, the "Start journey" flow
(section 5.5) handles initialization.

---

## 13. Accessibility Considerations

### 13.1 ARIA Labels

```tsx
// Sidebar
<nav aria-label="Paper writing journey" role="navigation">
  <div role="progressbar" aria-valuenow={35} aria-valuemin={0} aria-valuemax={100}>
    35% complete
  </div>

  <div role="tree" aria-label="Journey phases and tasks">
    <div role="treeitem" aria-expanded={true} aria-label="Phase 1: Preparation, completed">
      <div role="group">
        <div role="treeitem" aria-label="Task 1.1: Topic definition, completed" />
        <div role="treeitem" aria-label="Task 1.2: Journal selection, completed" />
      </div>
    </div>
  </div>
</nav>

// Next Action Card
<section aria-label="Next recommended action">
  <h3>Paragraph Design</h3>
  <p>Design the role of each paragraph</p>
  <button aria-label="Start task: Paragraph Design">Start this task</button>
  <button aria-label="Skip task: Paragraph Design">Skip</button>
</section>
```

### 13.2 Focus Management

- Sidebar toggle: Focus returns to toggle button after collapse/expand
- Task completion: Focus moves to next incomplete task
- Tab switching: Focus moves to the first interactive element in the new tab
- Phase collapse: Focus stays on the phase header

### 13.3 Screen Reader Announcements

```typescript
// Announce task completion
announceToScreenReader(`Task ${task.name} completed. ${nextTask.name} is next.`);

// Announce phase completion
announceToScreenReader(`Phase ${phase.name} completed. Moving to Phase ${nextPhase.name}.`);

// Announce progress
announceToScreenReader(`Paper progress: ${percentage}% complete.`);
```

---

## 14. Performance Considerations

### 14.1 Sidebar Rendering

- **Phase collapse**: Collapsed phases render only the header. Task rows are unmounted.
- **Virtualization**: Not needed. Maximum 27 task rows is well within DOM limits.
- **Animation**: All animations use CSS transforms and opacity (GPU-accelerated).
  No JavaScript-driven frame-by-frame animations.

### 14.2 API Polling

Current implementation polls `/api/v2/journey/[documentId]` every 30 seconds.
This is acceptable for the sidebar. Consider:

- **Optimistic updates**: Complete/skip tasks optimistically in the UI, then confirm via API.
- **Event-driven updates**: When auto-completion triggers server-side, push update via SSE or
  polling response includes a "changed" flag.

### 14.3 Dashboard Loading

The new dashboard shows more data per card. Optimize:

- **Single query**: Join `PaperJourney` + aggregated metrics in one Prisma query
- **Cached counts**: Store `verifiedCitationCount` and `totalWritingMinutes` in `Document` model
  or compute in a background job

---

## 15. Success Metrics

### 15.1 User Engagement

| Metric | Current Baseline | Target | Measurement |
|--------|-----------------|--------|-------------|
| Journey guide visibility rate | ~20% (most hide it) | 80%+ | `PaperJourney.guideVisible` |
| Task completion rate | Unknown | 5+ tasks/paper | `TaskCompletion` count |
| Feature discovery rate | Low | 3+ tabs used per paper | Tab switch tracking |
| Time to first citation | Unknown | < 30 min | `TaskCompletion` for 2.1 timestamp |
| Session duration | Unknown | 45+ min (1 pomodoro) | `WritingSession` |

### 15.2 Product Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sidebar FPS | 60fps on all animations | Chrome DevTools Performance |
| Sidebar memory | < 5MB additional | Chrome DevTools Memory |
| Dashboard load time | < 500ms (server) | Server timing |
| Auto-advance satisfaction | > 70% keep it enabled | localStorage setting |

---

## 16. Open Questions and Future Considerations

### 16.1 Open Questions

1. **Phase ordering flexibility**: Should users be able to reorder phases?
   Current recommendation: No. Fixed order with skip capability.

2. **Multi-paper journey comparison**: Should the dashboard show a
   comparative view of multiple papers' progress?
   Current recommendation: Defer to v2. One paper at a time is sufficient.

3. **Collaborative journey**: If multiple authors work on a paper,
   should they share a journey or have individual views?
   Current recommendation: Shared journey with individual task assignments (future).

4. **Journey templates**: Different paper types (review, original research, case study)
   may have different task structures.
   Current recommendation: Single universal template for now.
   Task templates per paper type in v2.

### 16.2 Future Enhancements (Post-MVP)

1. **AI-powered task estimation**: Use historical data to provide personalized
   time estimates per task.

2. **Journey analytics**: Dashboard showing writing patterns, average time per phase,
   comparison to peers.

3. **Milestone celebrations**: Larger celebration animations for phase completion
   (confetti shower, achievement badges).

4. **Collaborative features**: Real-time multi-user journey progress, task assignment
   to co-authors.

5. **Custom task insertion**: Allow researchers to add their own tasks within phases.

6. **Integration with calendar**: Export journey timeline to Google Calendar / iCal.

7. **Progress sharing**: Generate a shareable progress image for social media
   ("I'm 65% done with my paper!").

---

## 17. Appendix

### 17.1 Full Task Registry (Current)

Phase 1: Preparation (3 tasks, 1-2 hours)
- 1.1 Topic/title definition (5 min)
- 1.2 Target journal selection (10 min)
- 1.3 Guideline review (30 min)

Phase 2: Literature Review (4 tasks, 8-16 hours)
- 2.1 Related paper search (120 min)
- 2.2 Citation verification (60 min)
- 2.3 Evidence extraction (120 min)
- 2.4 Gap analysis (60 min)

Phase 3: Structure Design (3 tasks, 2-4 hours)
- 3.1 Outline creation (30 min)
- 3.2 Paragraph design (60 min)
- 3.3 Pre-check (30 min)

Phase 4: Writing (5 tasks, 40-80 hours)
- 4.1 Introduction (480 min)
- 4.2 Methods (480 min)
- 4.3 Results (480 min)
- 4.4 Discussion (480 min)
- 4.5 Abstract (60 min)

Phase 5: Citations & Evidence (4 tasks, 4-8 hours)
- 5.1 Citation Auto-Pilot (120 min)
- 5.2 Evidence Mapping (60 min)
- 5.3 Human Verification (120 min)
- 5.4 Evidence Report (15 min)

Phase 6: Review & Polish (4 tasks, 4-8 hours)
- 6.1 Paragraph Flow Analysis (30 min)
- 6.2 Structure Check (30 min)
- 6.3 Final Compliance Check (30 min)
- 6.4 Adversarial Review (15 min)

Phase 7: Submission (4 tasks, 2-4 hours)
- 7.1 Format adjustment (30 min)
- 7.2 Export (10 min)
- 7.3 Submission checklist (30 min)
- 7.4 Final confirmation (30 min)

**Total: 7 phases, 27 tasks, estimated 61-122 hours**

### 17.2 File Impact Map

Files to create:
```
src/components/journey/journey-sidebar.tsx       # Main sidebar component
src/components/journey/next-action-card.tsx       # Next action card
src/components/journey/phase-header.tsx           # Phase header with status
src/components/journey/task-row.tsx               # Individual task row
src/components/journey/connection-line.tsx        # GitHub-style connection lines
src/components/workspace/workspace-header.tsx     # New workspace header
src/components/workspace/paper-workspace.tsx      # Workspace layout
src/components/dashboard/paper-card.tsx           # New paper card component
src/components/dashboard/paper-list.tsx           # New paper list
src/app/[locale]/papers/page.tsx                  # New dashboard page
src/app/[locale]/papers/[id]/page.tsx             # New workspace page
```

Files to modify:
```
src/components/layout/site-header.tsx             # Add "My Papers", "Guide"
src/components/editor/editor-page-client.tsx      # Extract into workspace layout
src/components/editor/workflow-tabs.tsx            # Move into content area
src/app/[locale]/dashboard/page.tsx               # Redirect to /papers
src/app/[locale]/documents/[id]/page.tsx          # Redirect to /papers/[id]
src/lib/journey/task-registry.ts                  # No changes (already complete)
src/lib/journey/auto-complete.ts                  # Extend with journey start logic
next.config.js                                    # Add redirects
```

Files to deprecate (after migration):
```
src/components/editor/journey-nav.tsx             # Replaced by journey-sidebar.tsx
```

### 17.3 Reference Screenshots and Inspirations

- **Udemy course sidebar**: Two-level hierarchy, check marks, auto-advance
- **GitHub commit graph**: Dots, lines, colors indicating status
- **Linear app sidebar**: Collapsible groups, status indicators, keyboard navigation
- **Notion page outline**: Always-visible TOC, current position highlight
- **VS Code activity bar**: Collapsed icon strip (48px), expandable sidebar

---

*End of document*

*Document ID: DD-UXO*
*Version: 1.0*
*Author: Unmute AI Design Team*
*Date: 2026-03-16*
