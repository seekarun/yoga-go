---
description: Start work on GitHub issue(s) (complete workflow)
argument-hint: [issue-number(s)] (comma-separated)
allowed-tools: Bash(gh *), Bash(git *)
---

# Starting Work on GitHub Issues: $ARGUMENTS

I'll help you start work on issue(s) from the yoga-go repository. Let me set up the complete workflow:

## Step 1: Fetch Issue Details

!for issue in ${ARGUMENTS//,/ }; do echo ""; echo "### Issue #$issue"; gh issue view $issue --json title,body,state,labels --jq '"**Title:** \(.title)\n**State:** \(.state)\n**Labels:** \([.labels[].name] | join(", "))\n\n**Description:**\n\(.body)"'; echo ""; done

## Step 2: Create Feature Branch

Creating a feature branch for issue(s): $ARGUMENTS

!git checkout -b feature/issues-${ARGUMENTS//,/-}

(I'll suggest a better branch name after seeing the issue titles)

## Step 3: Update GitHub Issue Status

Adding comments to notify that work has started...

!for issue in ${ARGUMENTS//,/ }; do gh issue comment $issue --body "🚀 Started work on this issue"; done

## Step 4: Create Implementation Todo List

Based on the issue requirements above, I'll create a structured TodoWrite list breaking down:

- Research/exploration tasks for each issue
- Implementation tasks
- Testing requirements
- Documentation needs

## Step 5: Begin Implementation

Now let's start coding! I'll help you implement the requirements based on the issue details.

---

**Note:** Make sure you have:

- GitHub CLI (`gh`) installed and authenticated
- Current working directory is the yoga-go repository
- No uncommitted changes (or they will be carried to the new branch)
- For multiple issues: make sure they're related and can be worked on together
