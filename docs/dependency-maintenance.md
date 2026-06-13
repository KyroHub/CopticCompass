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

### Current Audit Snapshot

As of June 13, 2026, `npm audit` reports five moderate and two high findings for
the checked-in lockfile:

- the two high findings are the Vite development-tooling chain through
  `esbuild`; npm currently proposes a Vite 8 major update as the available fix
- Next.js still carries the nested PostCSS moderate advisory
- `brace-expansion` remains in the development dependency tree
- the Vercel Analytics and Speed Insights packages inherit the Next.js moderate
  finding

Because CI runs `npm audit --audit-level=high`, the Vite/esbuild finding is a
current CI blocker and should be handled on a dedicated dependency-maintenance
branch with release-note review and the full validation suite. Re-run
`npm audit` whenever the lockfile changes rather than treating this dated
snapshot as permanent.

`@react-email/components` also pulls deprecated subpackages during `npm ci`;
that warning is separate from the audit findings above.

The Supabase CLI is intentionally not kept as an npm `devDependency`.
Migration scripts still call `supabase`, so contributors should install the
official CLI through a trusted supported channel and keep it on `PATH`.

## Automation

Dependabot is configured to automatically approve and merge **minor and patch** version updates through the `.github/workflows/dependabot-auto-merge.yml` workflow.

This auto-merge relies entirely on the CI safety net
(`.github/workflows/ci.yml`). GitHub will wait for the protected checks,
including the dependency audit, formatting, Knip, lint, unit tests, production
build, and Playwright end-to-end tests, before merging the PR.

Major version updates, however, are deliberately excluded from auto-merge and still require manual human review to check release notes, migration guides, and focused validation.

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
