# Dependency Maintenance

Use this guide when reviewing Dependabot PRs or making manual package updates.

## Dependabot Cadence

Dependabot checks the root npm workspace weekly on Monday at 08:00 Europe/Brussels
time. Version-update PRs are grouped for the areas that usually move together:

- Supabase packages
- AI SDK packages
- Next.js and related Next tooling
- development tooling patch and minor updates

Routine Dependabot version updates ignore semver-major updates. Review major
updates manually with release notes, migration guides, and focused validation.

Dependabot security updates are enabled separately in GitHub settings. Keep those
security PRs separate from routine version-update groups so the vulnerable
package, advisory, and fix can be reviewed directly.

## Review Rules

Treat patch and minor dependency PRs as usually safe after CI passes, but still
scan the changed packages and release notes before merging.

Review these updates manually even when CI passes:

- major version updates
- Next.js, React, Vercel Analytics, or Vercel Speed Insights updates
- Supabase auth, session, or SSR updates
- packages that touch privacy, cookies, analytics, security, email delivery, or
  user data
- build-tooling changes that alter production output, deployment, or test
  behavior

Do not use `npm audit fix --force` as a default response to audit findings. Read
the advisory, identify whether the vulnerable package is production or
development-only, check whether the affected code path is reachable, and prefer a
targeted update.

## Optional Automation

Leave broad auto-merge disabled. After several quiet weeks of Dependabot PRs, it
may be reasonable to consider auto-merge for low-risk patch updates only, but
keep manual review for major updates and for the sensitive package areas listed
above.

If auto-merge is introduced later, require passing CI and keep the rule narrow
enough that it cannot merge Next.js, Supabase auth, analytics, privacy, security,
or email-delivery changes without human review.

## First-Run Validation

After the Dependabot config is committed and pushed to the default branch, verify
the first run in GitHub:

- Dependency graph shows npm version updates configured for the repository.
- First Dependabot PRs are grouped as expected instead of opening a large stream
  of one-package PRs.
- CI runs on Dependabot PRs.
- Major updates are not mixed into routine low-risk review.
- Existing npm audit findings remain reviewed and tracked instead of being
  blindly force-fixed.
