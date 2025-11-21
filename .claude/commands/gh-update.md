---
description: Add progress update comment to GitHub issue(s)
argument-hint: [issue-number(s)] [message]
allowed-tools: Bash(gh *)
---

# Update GitHub Issues: $1

Adding progress update to issue(s)...

!for issue in ${1//,/ }; do echo "Updating issue #$issue..."; gh issue comment $issue --body "$2 $3 $4 $5 $6 $7 $8 $9"; echo "✅ Issue #$issue updated"; done

---

**Usage Examples:**

- `/gh-update 42 Working on authentication fix`
- `/gh-update 42,17 Fixed the booking state bug, now testing`
- `/gh-update 19,17,16 Completed implementation, ready for review`

**Tip:** Use this command to keep stakeholders informed about your progress on one or multiple issues.
