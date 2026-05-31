## Summary

Describe the change in a few sentences.

## Type of Change

- [ ] Dictionary data or lexical correction
- [ ] Grammar lesson or educational content
- [ ] Publications or metadata update
- [ ] UI or design refinement
- [ ] Documentation
- [ ] Build, tooling, or infrastructure
- [ ] Bug fix

## Why This Change

Explain the problem this PR solves or the improvement it introduces.

## Architecture Fit

- [ ] Route/page/API files remain thin, or this PR explains why they need more responsibility
- [ ] Feature-specific UI, logic, queries, and workflows live under `src/features/<feature>`
- [ ] Server-only feature code lives under `src/features/<feature>/lib/server` where applicable
- [ ] `src/actions` changes are focused server-action entry points, not new logic hubs
- [ ] `src/lib` changes are genuine cross-feature infrastructure
- [ ] Docs were updated if this PR changes an architectural pattern

## Validation

List the checks you ran.

- [ ] `npm run format:check`
- [ ] `npm run knip`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e` or `npm run test:e2e:local` if relevant
- [ ] Supabase migration dry-run or push if relevant
- [ ] Manual review in the browser if relevant

## Screenshots

Add before/after screenshots when the change affects the UI.

## Content and Source Notes

If this PR changes dictionary entries, grammar content, translations, or publication metadata, note the source, rationale, or editorial judgment here.

## Additional Context

Anything reviewers should know before merging.
