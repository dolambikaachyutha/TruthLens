# TruthLens — Design Decisions

## DP1: Similar-claim support first, then recency

### Decision

The public feed and similar-claims sections use different ordering purposes.

The main public feed defaults to:

1. Highest-supported matching or similar claims first.
2. Claims with equal support counts are ordered by newest update.
3. If support count and update time are equal, use a stable ID order.

The ranking formula for similar or matching claims is:

```text
support_count DESC,
updated_at DESC,
id ASC
```

The section title must be:

```text
Most supported similar claims
```

The interface must allow users to choose other sorting options where available:

- Most supported.
- Newest.
- Oldest.
- Recently updated.
- Highest review priority.

The default for the similar-claims section is:

```text
Most supported, then newest
```

### Meaning of support

A support action means that a user identifies a claim as similar to, related
to, or representative of the same issue.

Support count does not mean:

- The claim is true.
- The claim is false.
- The claim is verified.
- The evidence is stronger.
- The reviewer is more confident.
- The claim is more important.
- The claim has been confirmed by experts.

The interface must display:

```text
Support count shows how many people identified this as a similar claim. It
does not prove that the claim is true or false.
```

### Rationale

Users may encounter multiple versions of the same misinformation or the same
public issue. Ranking similar claims by support count helps surface the version
that the community has identified most often.

This makes the first interaction with TruthLens more useful:

1. Users see the most commonly identified similar claim.
2. They can open its evidence and review.
3. They can inspect the next similar claim.
4. They can compare multiple reviewed and unreviewed claims.
5. They can find an existing claim instead of submitting the same claim again.

The ordering is intended to improve discovery and reduce repeated submissions.
It is not intended to replace evidence-based fact-checking.

### Tie-breaking

If two similar claims have the same support count:

```text
The newer updated claim appears first.
```

If they also have the same update time:

```text
The stable claim ID determines the final order.
```

This prevents the list from changing randomly between page loads.

### Constraints

TruthLens must not rank similar claims by:

- Number of views.
- Political category.
- Reviewer identity.
- Final verdict.
- Hidden popularity score.
- External fact-check rating.
- Risk level alone.
- Number of page clicks.

Support count may help with discovery and triage, but evidence and human review
remain the only basis for a final factual verdict.

---

## DP2: Unverified claims remain visible and help prevent duplicates

### Decision

Claims without a final human verdict remain publicly visible after automated
intake checks are complete.

They appear in a clearly separated section:

```text
Under Review
```

The public interface must distinguish between:

```text
Reviewed Claims
```

and:

```text
Under Review
```

Only claims with a published human review and completed quality requirements
appear in `Reviewed Claims`.

Unverified claims must always display:

```text
Unverified
Human review pending
```

### Rationale

Showing unverified claims supports transparency and helps users discover that
the same or a similar claim has already been submitted.

This reduces duplicate submissions because users can:

- Search existing claims.
- See related claims.
- Open the existing claim.
- Read its evidence status.
- Follow the review progress.
- Add context instead of submitting the same claim again.

Hiding every unverified claim would make the platform look empty and would
prevent the community from seeing what is currently being investigated.

However, unverified claims must never be displayed as though they have a final
truth status.

### Visibility rules

An unverified claim may appear in `Under Review` only when:

```text
status = unverified OR in_review
AND intake_status = ready_for_review
AND is_visible_in_under_review = true
AND deleted_at IS NULL
```

A claim appears in `Reviewed Claims` only when:

```text
status = verified_true
OR status = verified_false
OR status = misleading
AND a published human review exists
AND the review quality checklist passed
AND is_visible_in_reviewed_feed = true
AND deleted_at IS NULL
```

A claim must remain hidden from public feed sections while:

- Automated checks are still running.
- The claim is blocked for safety or privacy.
- The claim contains malicious content.
- The claim contains exposed personal information.
- The claim is deleted.

### Required labels

Every unverified claim must show:

```text
Under Review
Unverified
Human review pending
```

Use this explanation:

```text
Automated evidence gathering organizes references for review. It does not
determine whether the claim is true or false.
```

### Duplicate detection

Before submission or immediately after the user enters the claim, TruthLens
should search for:

- Exact text matches.
- Normalized text matches.
- Similar wording.
- Matching source URLs.
- Similar categories.
- Existing related claims.
- Existing claims with the same event, date, or location.

If a similar claim exists, show:

```text
A similar claim already exists
```

Show the existing claim’s:

- Text.
- Status.
- Support count.
- Evidence count.
- Review state.
- Link to the claim detail page.

Provide these options:

```text
View existing claim
Continue with additional context
Submit anyway
```

The user must not be forced to abandon a claim automatically. A new
submission may contain a different date, location, source, or important
context.

If the user submits a similar claim anyway:

- Preserve the new submission.
- Link it to the existing claim.
- Show the relationship on both claim pages.
- Do not silently merge the claims.
- Do not silently delete the original.
- Keep each claim’s evidence and review history separate.

### Feed ordering

The default main feed should show:

1. Reviewed claims.
2. Under Review claims.

Within the similar-claims section:

```text
support_count DESC,
updated_at DESC,
id ASC
```

Within the Under Review section, use the same support-first ordering when
support data is available; otherwise use:

```text
updated_at DESC,
id ASC
```

---

## DP3: Submitted claims cannot be edited, but controlled deletion is allowed

### Decision

After submission, the original claim text cannot be edited through the reviewer
workspace.

The reviewer must not receive a general:

```text
Edit claim
```

option.

The original submitted claim must remain preserved, including:

- Original claim text.
- Original title, if used.
- Original source URL.
- Original platform.
- Original category.
- Original submission time.
- Original submission context.

Reviewers may append information without rewriting the original claim.

They may:

- Add evidence.
- Add reviewer analysis.
- Add a reviewer note.
- Publish a verdict.
- Submit a correction.
- Report a problem.
- Delete the claim through the controlled delete workflow.

### Rationale

Preventing edits protects audit integrity.

If a claim could be silently changed after evidence gathering, users would not
know which version the reviewer actually investigated. Preserving the original
claim allows readers to reconstruct:

1. What was originally submitted.
2. What evidence was gathered.
3. What the reviewer wrote.
4. Which verdict was published.
5. Whether a correction occurred.
6. Why a claim was removed, if deletion happened.

Corrections must append new information rather than overwrite the original
record. Open and transparent corrections are a core part of trustworthy
fact-checking practice. [web:130][web:131]

### Allowed reviewer actions

A reviewer may:

- View the original claim.
- Add evidence.
- Add a reviewer note.
- Select a final verdict.
- Publish a review.
- Submit or process a correction.
- Delete a claim for a valid operational or safety reason.

A reviewer may not:

- Rewrite the original claim.
- Change the original claim to fit the evidence.
- Change the original submission date.
- Silently replace the source URL.
- Silently change the platform.
- Silently change the category.
- Silently overwrite another reviewer’s note.
- Delete a claim because they disagree with it.
- Delete a claim because it is politically inconvenient.
- Delete a claim because it is difficult to verify.
- Delete a claim only because it has a high-risk signal.

### Controlled delete option

A delete option may be provided for:

- Spam.
- Duplicate submissions.
- Personal information.
- Safety issues.
- Malicious links.
- Test submissions.
- Policy violations.
- Other documented operational reasons.

Prefer soft deletion.

Use these fields:

```text
deleted_at
deleted_reason
deleted_by
```

A deleted claim must:

- Disappear from the public feed.
- Disappear from the Under Review section.
- Disappear from Reviewed Claims.
- Disappear from search results.
- Disappear from similar-claim results.
- Remain in an internal or audit history where appropriate.
- Preserve the original record where legally and technically safe.

### Delete confirmation

Deletion must use a confirmation dialog.

Dialog title:

```text
Delete claim?
```

Dialog warning:

```text
This action removes the claim from the public feed. Use it only for spam,
duplicates, privacy, safety, malicious links, test submissions, or policy
violations.
```

Required delete reasons:

- Spam.
- Duplicate.
- Personal information.
- Safety issue.
- Malicious link.
- Test submission.
- Policy violation.
- Other.

If `Other` is selected, require an explanation.

The dialog must include:

```text
Cancel
Delete claim
```

Deletion must:

1. Require an explicit confirmation.
2. Save the deletion reason.
3. Save the deletion timestamp.
4. Save the deleting actor label.
5. Create a timeline or audit event.
6. Remove the claim from public results.
7. Show a success message.
8. Show an error message if deletion fails.

### No-authentication limitation

If authentication is not implemented, display:

```text
Public demo delete
```

Document this limitation:

```text
Production deletion should require authenticated moderator permissions.
This demo uses a controlled delete flow because authentication is intentionally
disabled.
```

Do not invent a moderator name or identity.

### Corrections instead of editing

If the original claim or published review contains an error, use a correction
record instead of silently editing it.

A correction must preserve:

- Original claim text.
- Original verdict.
- Updated verdict, if changed.
- Correction reason.
- New evidence.
- Correction timestamp.
- Public explanation.
- Correction history.

Do not silently overwrite published reviews.

---

## Combined TruthLens workflow

```text
User submits a claim
        ↓
TruthLens searches for similar existing claims
        ↓
User can view existing claims or continue with context
        ↓
Automated intake and evidence checks run
        ↓
Safe unverified claim appears in Under Review
        ↓
Similar claims are ranked by support count, then recency
        ↓
Reviewer adds evidence and publishes a human verdict
        ↓
Claim appears in Reviewed Claims
        ↓
Corrections remain visible in the history
        ↓
Valid moderation issues may trigger controlled deletion
```

The three central principles are:

1. Similar claims are ordered by community support count, then recency, to help
   users find commonly encountered versions first.
2. Unverified claims remain visible and clearly marked, helping users discover
   existing claims and avoid duplicate submissions.
3. Submitted claims cannot be edited after submission, but controlled,
   reason-based deletion is available for valid moderation, privacy, safety,
   duplicate, or operational reasons.

---

## Multi-reviewer independent assessments (feed)

### Decision

Any public visitor may add an **independent review** from the feed (or claim
detail) without authentication.

- Multiple reviewers may each submit one assessment per claim.
- Each assessment records: optional reviewer name, stance, note, optional
  evidence URL, confidence, timestamp, and session id.
- Independent reviews **never** replace `publishedReview`, never change
  `claimStatus` to Verified True/False/Misleading, and are never automatic
  truth labels.
- Original claim text and the official published verdict remain preserved.
- Timeline event action: `community_review`.
- One assessment per browser session per claim prevents silent spam while still
  allowing other sessions/reviewers to add their own.

### Rationale

Reviewers other than the primary Community reviewer need a lightweight way to
record findings on the public feed. Keeping these as append-only independent
assessments preserves audit integrity and meets the rule that automation and
UI shortcuts never auto-label a claim true or false.

---

## Shared local-server claim storage

### Decision

Supabase is the only source of truth for claims, feed visibility, statuses,
reviews, evidence, support counts, and timestamps. The public `/api/claims`
route reads and writes the `truthlens_claims` table. Every browser refreshes
from that same database-backed list.

- `GET /api/claims` returns the shared claim list.
- `POST /api/claims` upserts one claim or a batch of claims.
- The client keeps only an in-memory rendering cache; it never stores claims
        in browser storage or merges browser-only claims into the feed.
- Updates (status, reviews, votes, deletes, evidence) write through to
        Supabase; the client refreshes after mutations, on focus, and every five
        seconds.
- Original claim text is never rewritten by client mutation helpers.

### Rationale

A single shared queue is required so the public feed is visible to everyone,
not only the browser that submitted a claim. Supabase provides durable shared
storage while the Next.js API remains the single application backend.