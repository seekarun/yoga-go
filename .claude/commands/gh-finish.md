---
description: Finish work and create PR for GitHub issue(s)
argument-hint: [issue-number(s)] (comma-separated)
allowed-tools: Bash(git *), Bash(gh *)
---

# Complete Work on GitHub Issues: $ARGUMENTS

I'll help you finish work on issue(s) and create a pull request. Here's the workflow:

## Step 1: Verify Current Branch

!git branch --show-current

Making sure we're on the feature branch for issue(s): $ARGUMENTS

## Step 2: Check Status and Stage Changes

!git status

I'll review what changes need to be committed.

## Step 3: Commit Changes

I'll create a commit message that references all issues. First, let me stage all changes:

!git add .

Now committing with a descriptive message:

!ISSUE_REFS=$(echo "$ARGUMENTS" | sed 's/,/, #/g' | sed 's/^/#/'); git commit -m "Fix $ISSUE_REFS: [Brief description based on changes]

[Detailed description of what was implemented]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

## Step 4: Push Branch

!git push -u origin HEAD

## Step 5: Create Pull Request

Creating PR that will auto-close all issues when merged:

!FIXES_REFS=$(echo "$ARGUMENTS" | sed 's/,/, #/g' | sed 's/^/Fixes #/'); gh pr create --title "Fix #${ARGUMENTS//,/, #}: [Combined issue titles]" --body "## Summary
[Brief summary of changes]

## Changes Made

- [List of changes]

## Test Plan

- [ ] Tested locally
- [ ] All builds pass
- [ ] No breaking changes

$FIXES_REFS

🤖 Generated with [Claude Code](https://claude.com/claude-code)" --base main

---

**Note:**

- This command commits ALL staged and unstaged changes
- Review changes with `git status` and `git diff` first
- The PR will automatically close ALL listed issues when merged
- For multiple issues: make sure all are addressed in this PR
