# Coptic Compass UI Guide

This guide is a practical companion to
`docs/coptic-compass-brand-guide.md`. The brand book defines the identity,
voice, visual principles, and product posture. This guide translates those
principles into repeatable interface patterns for contributors working inside
the app.

Use this document when adding a new page, changing a control surface, reviewing
mobile behavior, or deciding whether a piece of copy or layout treatment helps
the product feel coherent.

## Contents

| Section | Title                     | Purpose                                            |
| :------ | :------------------------ | :------------------------------------------------- |
| 01      | UI Principles             | Product-level rules for coherent interface work    |
| 02      | Page Intro Rhythm         | Titles, subtitles, breadcrumbs, and top actions    |
| 03      | Buttons And Actions       | CTA sizing, icon use, and responsive action groups |
| 04      | Filters And Controls      | Search, filter bars, dropdowns, and mode controls  |
| 05      | Panels, Cards, And Radius | Surface usage, density, and visual containment     |
| 06      | Mobile Scroll Fatigue     | Mobile-specific reduction and layout rules         |
| 07      | Copy Density              | When to keep, shorten, or remove explanatory text  |
| 08      | Accessibility And QA      | Keyboard, focus, responsive checks, and testing    |
| 09      | Contributor Checklist     | A quick review list before merging UI changes      |

## 01. UI Principles

Coptic Compass should feel like one product even when the user moves between
Dictionary, Grammar, Practice, Publications, Analytics, account pages, admin
surfaces, and developer tools.

Core UI principles:

- **One platform, many workflows**: pages may have different densities, but
  navigation, headings, controls, buttons, cards, and empty states should feel
  related.
- **Product first**: build the usable workflow as the first screen. Avoid
  marketing-style sections on tool pages.
- **Content over decoration**: Coptic text, publication data, grammar content,
  and controls should be the visual focus.
- **Shared primitives before local invention**: prefer existing components and
  patterns before adding a page-specific UI treatment.
- **Mobile is a first-class workflow**: reduce scroll fatigue, keep controls
  reachable, and avoid stacking actions when paired buttons can fit side by
  side.
- **Quiet confidence**: operational pages should feel clear, compact, and
  stable rather than theatrical.

## 02. Page Intro Rhythm

Top-level product pages should use a consistent title-first rhythm.

Preferred primitives:

- `PageShell` for the outer page environment.
- `AppPageIntro` for product-page breadcrumbs, title, and actions.
- `PageHeader` for local document headers and non-standard page contexts.

Default pattern:

```tsx
<AppPageIntro
  spacing="compact"
  breadcrumbs={[
    { label: t("nav.home"), href: getLocalizedHomePath(language) },
    { label: t("nav.dictionary") },
  ]}
  title={t("dict.title")}
/>
```

Use compact top-level intros for pages where the controls immediately explain
the workflow. Dictionary, Publications, Practice, Analytics, and Grammar should
not carry descriptive subtitles unless the subtitle adds orientation the title
and controls cannot provide.

Keep descriptions only when they do real work:

- the page is conceptually unfamiliar;
- the user must understand a risk, limitation, or state before acting;
- the page has no obvious primary control surface;
- the copy explains what is materially different from adjacent features.

Avoid descriptions that repeat the page title, list obvious features, or slow
the user before a search, filter, lesson, or practice workflow.

## 03. Buttons And Actions

Use shared button primitives:

- `buttonClassName` for links styled as buttons.
- `Button` for ordinary button elements.
- `iconButtonClassName` for icon-only controls.
- `AuthGatedActionButton` for actions that must expose a locked state.

Use Lucide icons where an icon exists. Buttons that perform a tool-like action
should usually include an icon and a short label.

### Mobile CTA Widths

Single primary action:

```tsx
className={buttonClassName({
  className: "w-full sm:w-auto",
  variant: "primary",
})}
```

Two related actions:

```tsx
<div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
  <Link
    className={buttonClassName({
      className: "w-full min-w-0 px-3 sm:w-auto sm:px-4",
      variant: "primary",
    })}
    href={primaryHref}
  >
    {primaryLabel}
  </Link>
  <Link
    className={buttonClassName({
      className: "w-full min-w-0 px-3 sm:w-auto sm:px-4",
      variant: "secondary",
    })}
    href={secondaryHref}
  >
    {secondaryLabel}
  </Link>
</div>
```

Use this paired pattern for Dictionary page actions, lesson actions such as
Practice and Download PDF, and similar two-action groups. If there is only one
available action in a conditional pair, use a single-column mobile layout so the
button does not occupy half the row for no reason.

### Action Rules

- Prefer two side-by-side mobile CTAs when both labels fit professionally.
- Use full-width single CTAs on mobile.
- Return to natural button widths on desktop.
- Keep labels short enough to fit without awkward wrapping.
- Do not use legacy `.btn-*` utility classes in new UI.
- Do not hide an action on mobile unless the same path remains reachable through
  another nearby control.

## 04. Filters And Controls

Search should remain visually primary when a page is search-driven. Filters
should sit below the search field in a shared responsive surface, usually inside
an `app-sticky-panel`.

When using sticky panels:

- Use `var(--app-sticky-offset)` (currently `6rem`) for standard top-level search bars.
- Use `var(--app-rail-sticky-offset)` (currently `8rem`) for side rails (like the Grammar Study rails) to ensure they have enough breathing room from the top navigation without breaking standard search bar placement.

Use these primitives:

- `SegmentedControl` embedded inside expandable panels for option sets such as status, language, or dialect.
- `trailingControls` nodes injected directly into search fields to contain filter toggle buttons.

Preferred filter behavior:

- collapsed by default on mobile;
- inline filter toggle icon buttons located directly inside the search bar (`trailingControls`);
- clicking the toggle expands a clean `<section>` panel underneath the search bar;
- simple SegmentedControl layouts stacked vertically with divider lines;
- one clear/reset action when filters are active;
- keyboard support for opening, closing, and moving through options.

Use vertical stacked rows of `SegmentedControl` inputs for most search filters. This keeps the interaction model consistent across Dictionary, Publications, and Analytics. Do not use dropdown-style menus or native selects for public result filtering unless there is a strong reason.

Use native selects for ordinary forms where the user is submitting data, not for
public result filtering unless there is a strong reason.

## 05. Panels, Cards, And Radius

Use visual containment intentionally.

Preferred primitives:

- `SurfacePanel` for framed product surfaces.
- `Badge` for small status or classification labels.
- `EmptyState` for no-results and unavailable-state messaging.
- `StatusNotice` for warnings, errors, and important contextual states.
- `AdminErrorDisclosure` for admin-only operational failures where a calm
  summary should appear before collapsible technical details.

Rules:

- Cards are for repeated items, modals, framed tools, and clear content units.
- Do not put cards inside cards unless the nested surface is genuinely a tool
  or modal.
- Do not style whole page sections as floating decorative cards.
- Keep border radii restrained. Prefer the shared component defaults and
  `rounded-lg`-scale treatments.
- Avoid raw oversized radii for ordinary product UI.
- Keep admin, dashboard, and API pages denser and more utilitarian than
  editorial pages.
- In admin surfaces, do not make raw database, provider, or environment errors
  the main visible copy. Put those strings behind technical-details disclosure
  and show a recoverable summary first.
- Let publication surfaces carry more ceremonial weight when it helps the
  material, but keep controls consistent.

Avoid decorative effects that make the app feel generic:

- gradient blobs or orbs;
- purely atmospheric backgrounds;
- decorative cards that do not contain a real task;
- image treatments that obscure the actual object, publication, or content.

## 06. Mobile Scroll Fatigue

Mobile pages should prioritize the action the user came to perform.

Good mobile reductions:

- remove low-value subtitles when the title and controls already explain the
  page;
- hide secondary stats blocks that do not change the immediate task;
- collapse filter and setup panels;
- keep paired actions side by side when they fit;
- place search before catalog or summary content on searchable pages;
- use horizontal control rails rather than vertical stacks for filter triggers;
- keep first useful content visible earlier on the page.

Watch for these risks:

- stacked CTAs that create unnecessary vertical length;
- nested scrolling areas inside panels;
- repeated explanatory copy before controls;
- labels that overflow buttons;
- collapsed panels that lose the active configuration summary;
- actions that become unreachable after mobile-only hiding.

## 07. Copy Density

Interface copy should be useful, not merely reassuring.

Keep copy when it:

- changes the user's decision;
- explains a limitation or state;
- distinguishes two similar workflows;
- supports accessibility or error recovery;
- teaches a concept the user cannot infer from labels.

Remove or shorten copy when it:

- restates the title;
- repeats what a search placeholder, filter label, or CTA already says;
- pushes primary controls lower on mobile;
- reads like marketing copy on a tool page;
- describes the UI instead of helping the user complete the task.

Prefer concrete labels:

- `Practice`, not `Practice words`, when the workflow covers dictionary and
  grammar.
- `Speech Mode`, not `TTS mode`, when the label is user-facing.
- `Prompt type`, not a vague internal template label.

## 08. Accessibility And QA

Every new or changed UI pattern should preserve:

- keyboard navigation;
- visible focus states;
- active states that do not rely on color alone;
- button targets around 44px high where practical;
- readable Coptic text;
- labels that remain meaningful in English and Dutch;
- no horizontal overflow on mobile;
- no incoherent overlap between controls, menus, search fields, and content.

Useful responsive checks:

- mobile around 390px wide;
- desktop around 1280px wide;
- a page with no active filters;
- a page with at least one active filter;
- long English and Dutch labels where applicable;
- signed-out locked actions if the surface uses auth-gated controls.

Useful local commands:

```bash
npm run format:check
npm run knip
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

If Playwright needs to start its own local server, it uses
`127.0.0.1:3100` through `playwright.config.ts`.

## 09. Contributor Checklist

Before merging a UI change, ask:

- Does the page intro match the current title/action rhythm?
- Is the subtitle necessary, or is it slowing the page down?
- Are mobile CTAs full-width for single actions and equal-width for paired
  actions?
- Is the filter toggle correctly placed within the search bar's `trailingControls`?
- Are filter options rendered cleanly as `SegmentedControl` grids inside the expanded panel?
- Can the filter or setup block collapse to reduce scroll fatigue?
- Are labels clear to non-technical users?
- Does the page avoid card-on-card decoration?
- Do controls fit at mobile widths without overflow?
- If the surface gained several panels, modes, or state transitions, is the
  page client still a shell with feature-owned components/hooks?
- Is the same workflow coherent in English and Dutch?
- Did the change pass formatting, linting, typechecking, tests, and smoke
  coverage when relevant?

## Code References

Current shared UI primitives that contributors should know:

- `src/components/AppPageIntro.tsx`
- `src/components/PageHeader.tsx`
- `src/components/Button.tsx`
- `src/components/SegmentedControl.tsx`
- `src/components/SurfacePanel.tsx`
- `src/components/Badge.tsx`
- `src/components/EmptyState.tsx`
- `src/components/StatusNotice.tsx`
- `src/features/admin/components/AdminErrorDisclosure.tsx`
- `src/components/DownloadPdfButton.tsx`
- `src/components/CopticText.tsx`

Keep this guide updated whenever shared UI primitives, page intro rhythm, or
responsive control patterns change.
