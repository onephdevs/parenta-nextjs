---
name: git-push-update
description: >-
  Commit scoped local changes with a conventional message and push to the
  tracked remote branch. Use when the user asks to push an update to git,
  push changes, commit and push, or sync the current work to GitHub/origin.
---

# Git Push Update

Commit the intended changes and push them to the remote. Do this only when the user explicitly asks to push (or commit and push).

## Safety rules (never violate)

- Never update git config
- Never force push to `main`/`master` unless the user explicitly requests it
- Never use `--no-verify`, `--no-gpg-sign`, or interactive flags (`-i`)
- Never commit secrets (`.env*`, credentials, private keys)
- Never amend unless the user explicitly asks and amend conditions from user rules are met
- Stage only files that belong to the requested change; leave unrelated dirty/untracked files alone
- If there is nothing to commit, do not create an empty commit; still push if the branch is ahead

## Workflow

Run from the repo root.

### 1. Inspect state (parallel)

```bash
git status -sb
git diff
git diff --cached
git log -5 --oneline
git branch -vv
```

Identify:
- Current branch and upstream tracking
- Files that belong to **this** change vs unrelated work
- Recent commit message style (prefer conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

### 2. Confirm scope with the user if unclear

If multiple unrelated changes are dirty, commit/push **only** what the user meant (e.g. “this change”). Ask when ambiguous.

### 3. Stage and commit

```bash
git add -- <paths...>
git commit -m "$(cat <<'EOF'
<type>: <short why-focused summary>

EOF
)"
git status -sb
```

Commit message:
- 1–2 sentences max
- Focus on **why**, not a file list
- Match repo style from `git log`

If the commit fails due to a hook, fix the issue and create a **new** commit (do not amend unless amend rules allow it).

### 4. Push

```bash
# Branch already tracks remote:
git push

# New branch / no upstream yet:
git push -u origin HEAD
```

Use full network permissions for push. On auth failure, report the error and stop.

### 5. Report back

Tell the user:
- Branch name
- Commit hash + subject
- Remote result (`pushed to origin/<branch>` or up-to-date)
- Any files intentionally left uncommitted

## Default exclusions

Do not stage unless the user explicitly includes them:
- `.env*` and credential files
- Large generated artifacts (`verification-raw.json`, build dumps)
- Unrelated local docs/scripts from other workstreams
- Nested tool skill mirrors (`.agents/`, `.claude/`, `.windsurf/`) unless the change is about those skills

## Examples

**User:** “push this change” after a feature edit  
→ Stage only those feature files → `feat: ...` → `git push`

**User:** “push update to git” with branding + auth redirects  
→ One commit covering that scope → push current branch

**User:** “push” but working tree has unrelated deletions  
→ Stage only the requested paths; mention what was left out
