# Email Inbox Enhancement Plan

## Current State

SES + S3 + Lambda + DynamoDB pipeline with basic inbox: receive, view, reply, star, delete, search, threading, attachments, custom domain setup, CAL AI inbox.

---

## Tier 1 — Core Missing Features

1. **Compose New Email** — Draft and send emails to any recipient (not just replies)
2. **Drafts System** — Auto-save and manually save drafts, resume editing
3. **Multiple Recipients** — To/CC/BCC fields on compose and reply
4. **Reply All / Forward** — Reply to all recipients or forward to new ones
5. **Email Signatures** — Configurable per-tenant signature auto-appended to outgoing mail
6. **Sent Folder** — Dedicated view for outgoing emails
7. **Trash/Archive Folders** — Proper trash with restore, archive for decluttering

## Tier 2 — Organization & Productivity

8. **Labels/Tags** — User-defined labels with color coding (like Gmail labels)
9. **Folders** — Move emails into custom folders (Inbox, Sent, Drafts, Trash, Archive, custom)
10. **Bulk Actions** — Select multiple emails: mark read, delete, star, label, move
11. **Snooze** — Hide an email until a specified date/time
12. **Scheduled Send** — Queue an email to be sent at a future time
13. **Email Templates** — Save and reuse canned responses
14. **Contact Autocomplete** — Suggest recipients from past correspondence

## Tier 3 — Rich Compose Experience

15. **Rich Text Editor** — WYSIWYG compose with formatting (bold, italic, links, lists)
16. **Inline Images** — Paste/drag images into compose body
17. **Drag & Drop Attachments** — Drop files onto compose area
18. **Attachment Preview** — Inline preview for images/PDFs without downloading
19. **Email Signature with HTML** — Rich signatures with logo, links, social icons

## Tier 4 — Search & Filtering

20. **Advanced Search** — Filter by date range, has:attachment, from:, to:, label:
21. **Search Within Thread** — Find specific messages in long threads
22. **Saved Searches / Smart Folders** — Persist frequently used filter combinations

## Tier 5 — Notifications & Real-time

23. **Real-time Inbox Updates** — WebSocket or polling for new email notifications
24. **Push Notifications** — Browser notifications for new emails
25. **Unread Badge** — Show unread count in nav/tab title
26. **Desktop Notifications** — OS-level notifications via Service Worker

## Tier 6 — Security & Deliverability

27. **Spam Detection** — Basic spam scoring/filtering on incoming mail
28. **Block Sender** — Block specific senders from appearing in inbox
29. **Unsubscribe Detection** — Detect List-Unsubscribe headers, one-click unsubscribe
30. **DMARC/SPF Validation Display** — Show authentication status of received emails

## Tier 7 — Power User Features

31. **Keyboard Shortcuts** — j/k navigation, e archive, r reply, c compose (Gmail-style)
32. **Undo Send** — Brief delay window to cancel outgoing emails
33. **Email Aliases** — Support multiple email addresses per domain
34. **Auto-responder / Vacation Mode** — Out-of-office auto-replies
35. **Read Receipts** — Track if outgoing emails were opened
36. **Priority Inbox** — AI-powered sorting of important vs. low-priority

## Tier 8 — Integration & Import

37. **Import Emails** — Import from Gmail/Outlook via IMAP or Google API
38. **Export/Download** — Export emails as .eml or .mbox
39. **Calendar Integration** — Detect meeting invites (ICS) and link to calendar
40. **Contact Management** — Full contacts list derived from email history
