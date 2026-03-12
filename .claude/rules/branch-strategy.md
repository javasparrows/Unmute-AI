# Branch Strategy

Every code change MUST follow this branch lifecycle. No exceptions.

## Workflow

```
1. git checkout -b <type>/<short-description>   # Create branch from main
2. (make changes, commit)
3. git push -u origin <branch>                  # Push to remote
4. gh pr create --title "..." --body "..."       # Create pull request
5. gh pr merge <number> --squash --delete-branch # Merge PR to main
6. git checkout main && git pull origin main     # Return to main locally
```

## Branch Naming

Format: `<type>/<short-description>`

| Type | Usage |
|------|-------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code refactoring |
| `docs/` | Documentation only |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance, CI, dependencies |

Examples: `feat/scroll-sync`, `fix/auth-redirect`, `refactor/split-utils`

## Rules

1. **Never commit directly to main** — always use a feature branch
2. **One branch per task** — do not mix unrelated changes
3. **Always create a PR** — even for small changes, use `gh pr create`
4. **Squash merge** — keep main history clean with `--squash`
5. **Delete remote branch after merge** — use `--delete-branch` flag
6. **Return to main** — after merge, always `git checkout main && git pull`

## Commit Messages

Follow conventional commits within the branch:

```
<type>: <concise description>
```

The PR title becomes the squash commit message on main.

## Applies To

This workflow applies to **all agents** (Claude, Codex subagents, Gemini subagents).
When delegating implementation to a subagent, include this instruction:
> "Create a branch, commit, push, and create a PR. Do NOT commit directly to main."
