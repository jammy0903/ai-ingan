# Git Rules

Rules for every git operation — commits, branches, staging. Burn them in before starting.
(Rules in English; talk to the user and write commit messages in the language the user specifies.)

## 1. Always separate refactor and feature commits.
Never put refactored code and new-feature code in the same commit. When the refactor is done, commit it first as `refactor:`, then build the feature on top and propose it as a separate `feat:` commit.

## 2. Always follow the commit-message template (Conventional Commits).
Write in the language the user specified (EN/KO), and match the prefix exactly:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code-structure change with no behavior change
- `style:` — formatting, missing semicolons, etc. (no behavior change)
- `docs:` — documentation and comment edits

Keep the subject concise (noun phrase or imperative). If the *why* matters, put it in the body.

## 3. Commit at the smallest indivisible unit of work.
Don't finish five or six features and lump them into one "feat: added several features" commit. Split by single function / single component so the git history stays cleanly traceable.

## 4. Never stage stray files (`git add`).
Don't sneak in debug `console.log` / print statements or temporary test files. Check `git diff` thoroughly and stage only the files the user asked to change.

## 5. Always check the branch before starting.
Confirm the currently checked-out branch. If about to work directly on `main`/`master`, stop and ask the user first: "Should I cut a new branch?"

---
Run git commands and give commit guidance per these rules.
