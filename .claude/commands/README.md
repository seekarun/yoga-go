# GitHub Issue Workflow Commands

Automated commands for working with GitHub issues in the yoga-go repository using GitHub CLI.

## Setup (One-Time)

### 1. Install GitHub CLI

```bash
brew install gh
```

### 2. Authenticate with GitHub

```bash
gh auth login
```

Follow the prompts:

- Choose: **GitHub.com**
- Choose: **HTTPS**
- Authenticate: **Login with a web browser**
- Copy the code and paste in browser
- Grant required permissions

### 3. Verify Setup

Test that everything works:

```bash
gh repo view
gh issue list
```

You should see the yoga-go repository and any open issues.

## Multi-Issue Support

**All commands support comma-separated issue numbers!**

Examples:

- `/issue 19,17,16` - View multiple issues at once
- `/start-work 19,17` - Work on related issues together
- `/gh-update 19,17,16 Working on auth fixes` - Update multiple issues
- `/gh-finish 19,17` - Create one PR that closes multiple issues

## Available Commands

### `/issue [number(s)]`

**Description:** Fetch and display GitHub issue details (supports multiple)

**Examples:**

```
/issue 42
/issue 19,17,16
```

**Output:**

- **Summary table** showing all issues at a glance
- **Full details** for each issue (title, description, status, labels, assignees, timestamps)
- Brief summary of requirements
- Whether issues are related

---

### `/start-work [number(s)]`

**Description:** Complete workflow to start working on one or more related issues

**Examples:**

```
/start-work 42
/start-work 19,17,16
```

**What it does:**

1. Fetches details for all specified issues from GitHub
2. Creates a feature branch (`feature/issues-19-17-16` or `feature/issue-42`)
3. Adds "🚀 Started work on this issue" comment to ALL issues
4. Creates a TodoWrite list based on combined requirements
5. Displays all issue context for implementation

**Prerequisites:**

- No uncommitted changes (or they'll be carried to new branch)
- Currently on main/master branch
- **For multiple issues:** Make sure they're related and can be worked on together

---

### `/gh-update [number(s)] [message]`

**Description:** Add progress update comment to one or multiple GitHub issues

**Examples:**

```
/gh-update 42 Working on authentication fix
/gh-update 19,17 Fixed the booking state bug, now testing
/gh-update 19,17,16 Completed implementation, ready for review
```

**What it does:**

- Adds your message as a comment to ALL specified issues
- Keeps stakeholders informed of progress across multiple related issues

---

### `/gh-finish [number(s)]`

**Description:** Complete work and create pull request (closes one or multiple issues)

**Examples:**

```
/gh-finish 42
/gh-finish 19,17,16
```

**What it does:**

1. Verifies you're on the correct feature branch
2. Shows current git status
3. Stages and commits all changes with message: `Fix #19, #17, #16: [description]`
4. Pushes branch to origin
5. Creates PR with `Fixes #19, #17, #16` (auto-closes ALL issues on merge)
6. Single PR closes all related issues

**Note:** Commits ALL changes. Review with `git status` first!

---

## Complete Workflow Examples

### Single Issue Workflow

```bash
# 1. Start work on issue #42
/start-work 42

# 2. [Implement the feature - code, test, etc.]

# 3. Update progress (optional, can do multiple times)
/gh-update 42 Implemented the core functionality, working on tests

# 4. Finish and create PR
/gh-finish 42
```

### Multi-Issue Workflow (Related Features)

```bash
# 1. View related issues first
/issue 19,17,16

# 2. Start work on all three related issues
/start-work 19,17,16

# 3. [Implement all features together]

# 4. Update progress on all issues
/gh-update 19,17,16 Completed auth flow implementation

# 5. Finish and create ONE PR that closes all three issues
/gh-finish 19,17,16
```

## Tips

1. **Check issue details first:** Use `/issue [number(s)]` before `/start-work` to review requirements
2. **Multi-issue support:** Use comma-separated numbers (no spaces): `19,17,16` not `19, 17, 16`
3. **Group related issues:** Only work on multiple issues together if they're related features
4. **Update frequently:** Use `/gh-update` to keep team informed across all related issues
5. **Review before finish:** Always run `git status` and `git diff` before `/gh-finish`
6. **Branch naming:**
   - Single issue: `feature/issue-42-brief-title`
   - Multiple issues: `feature/issues-19-17-16`
7. **Auto-close issues:** PRs include "Fixes #number" or "Fixes #19, #17, #16" to auto-close on merge

## Troubleshooting

### "gh: command not found" error

- Install GitHub CLI: `brew install gh`
- Restart your terminal after installation

### "Authentication failed" error

- Run `gh auth login` and re-authenticate
- Make sure you granted all required permissions (repo access)

### "Issue not found" error

- Verify the issue number exists in the yoga-go repository
- Check you have access to the repository: `gh repo view`

### Git conflicts

- Make sure you're starting from a clean working directory
- Fetch latest changes before `/start-work`: `git fetch origin && git checkout main && git pull`

## Configuration Location

- **GitHub CLI Config:** `~/.config/gh/` (not in repo, local only)
- **Slash Commands:** `.claude/commands/` (committed to repo)

## Security Notes

- GitHub authentication tokens are stored locally by `gh` CLI
- Never commit tokens or credentials to the repository
- These slash command files are safe to commit (no credentials)
