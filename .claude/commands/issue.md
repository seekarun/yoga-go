---
description: Fetch and display GitHub issue details
argument-hint: [issue-number(s)] (comma-separated)
allowed-tools: Bash(gh *)
---

# GitHub Issues: $ARGUMENTS

Fetching issue details from GitHub...

## Summary Table

!for issue in ${ARGUMENTS//,/ }; do gh issue view $issue --json number,title,state,labels --jq '"\(.number)\t\(.state)\t\(.title)\t\([.labels[].name] | join(", "))"'; done | column -t -s $'\t' -N "ISSUE,STATE,TITLE,LABELS"

---

## Full Details

!for issue in ${ARGUMENTS//,/ }; do echo ""; echo "### Issue #$issue"; echo ""; gh issue view $issue --json title,body,state,labels,assignees,createdAt,updatedAt --jq '"**Title:** \(.title)\n**State:** \(.state)\n**Labels:** \([.labels[].name] | join(", "))\n**Assignees:** \([.assignees[].login] | join(", "))\n**Created:** \(.createdAt)\n**Updated:** \(.updatedAt)\n\n**Description:**\n\(.body)"'; echo "---"; done

---

After viewing the issue details above, please provide:

- Brief summary of what needs to be implemented
- Any acceptance criteria mentioned
- Technical approach if specified
- Estimated complexity
- Whether these issues are related/can be worked on together
