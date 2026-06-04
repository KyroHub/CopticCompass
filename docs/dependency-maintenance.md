# Dependency Maintenance

Use this guide when reviewing Dependabot PRs or making manual package updates.

## Dependabot Cadence

Dependabot checks the root npm workspace weekly on Monday at 08:00 Europe/Brussels
time. Version-update PRs are grouped for the areas that usually move together:

- Supabase packages
- AI SDK packages
- Next.js and related Next tooling
- React, React DOM, and their type packages
- development tooling patch and minor updates

The broad development-tooling group excludes packages that belong to dedicated
groups, so Next, React, Supabase, and AI SDK updates stay reviewable in their
own PRs.

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
- React stack updates where `react` and `react-dom` do not resolve to the same
  exact version
- Supabase auth, session, or SSR updates
- packages that touch privacy, cookies, analytics, security, email delivery, or
  user data
- build-tooling changes that alter production output, deployment, or test
  behavior

Do not use `npm audit fix --force` as a default response to audit findings. Read
the advisory, identify whether the vulnerable package is production or
development-only, check whether the affected code path is reachable, and prefer a
targeted update.

## Audit Posture

CI runs `npm audit --audit-level=high` after `npm ci`. This keeps high and
critical advisories from slipping into deployable branches while avoiding noisy
pipeline failures for reviewed moderate upstream findings.

Run a normal `npm audit fix` only on a dedicated maintenance branch, then run the
full CI suite before merging. Do not force audit fixes that downgrade framework
packages or jump across unrelated major versions.

As of June 4, 2026, the reviewed moderate findings are tracked through
Dependabot instead of force-fixed:

- Next.js has a nested PostCSS advisory that should move through the normal Next
  maintenance track.
- `brace-expansion` appears in the development dependency tree and should be
  updated through the owning package chain.
- `@react-email/components` pulls deprecated subpackages during `npm ci`.

The Supabase CLI is intentionally not kept as an npm `devDependency` while the
`supabase` npm package has an active critical malware advisory. Migration scripts
still call `supabase`, but contributors should install the CLI through a trusted
external channel and keep it on `PATH`.

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
