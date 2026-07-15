# Publications Catalog Guide

The publications catalog is defined in
`src/features/publications/lib/publications.ts`. Each record describes a
bibliographic work and may contain one or more editions, with one or more
binding-specific formats per edition.

## Data Levels

### Work

Work-level fields describe the intellectual publication:

- `title`, `subtitle`, and `lang`
- `type`: `book`, `scholarly-article`, or `creative-work`
- `status`: `published` or `forthcoming`
- localized `summary`
- contributors and their bibliographic roles
- publisher, series, catalog records, and rights information

Store volume identifiers in `series.volumeNumber`. Catalog badges localize this
field as `Vol.` or `Deel`; do not infer volume metadata from subtitle wording.

Do not use `status` to represent a manuscript or proof state. A retail edition
that is publicly available is `published`; draft or concept labels belong to an
internal editorial workflow and should not be exposed as the work status.

### Edition

Edition fields describe a publication event:

- stable edition id
- localized edition statement
- edition number
- ISO publication date (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`)
- publication place
- binding-specific formats

A catalog registration date is not a publication date. Store registrations in
`catalogRecords[].recordedAt`.

### Format

Formats describe physical or digital manifestations of an edition:

- binding such as `paperback` or `hardcover`
- ISBN-13
- physical dimensions
- retailer-specific purchase links

Store dimensions in millimetres in this exact order:

1. width
2. thickness
3. height

The UI renders this as `width × thickness × height mm` and localizes decimal
punctuation without changing the stored values.

## Publication Images

Store web-ready publication images under a directory named after the stable
publication id:

```text
public/publications/<publication-id>/front-cover.webp
public/publications/<publication-id>/back-cover.webp
public/publications/<publication-id>/mockup-paperback.webp
```

Declare the assets in the work-level `images` array. Each image requires a
stable id, semantic role, localized alternative text, intrinsic width and
height, and may reference a specific edition or format. Supported roles are
`front-cover`, `mockup-3d`, `back-cover`, and `interior`.

The catalog uses the front cover. The detail page exposes all available images
through an accessible, user-controlled gallery. Do not auto-rotate gallery
images. Published works require at least a front cover; the editorial target is
a front cover, back cover, and 3D mockup for every physical publication.

Use a consistent mockup template and preserve the actual cover artwork. Trim
unnecessary empty space before export, keep cover proportions intact, and
prefer high-quality JPEG or WebP assets sized for responsive display rather
than print-resolution source files. Web assets should normally remain below
1 MB each unless preserving essential fine detail requires a larger source.

## Contributors

Supported roles are:

- author
- editor
- editor/compiler
- illustrator
- foreword
- cover design
- interior typesetting
- translator

Use `entityType: "Organization"` for publishing or design organizations.
Contributor descriptions may be localized and should contain qualifications,
not repeat the contributor's name or role.

## External Links

- Put binding-specific retail links on the relevant format.
- Use work-level links only when the destination is not tied to a known format.
- Put library and registration records in `catalogRecords`.
- Do not treat retailer pages as bibliographic catalog records.
- Use HTTPS for public publisher, retailer, and catalog URLs.
- Permission contacts may use an HTTPS URL or a safe site-relative path such as
  `/contact`; relative paths are localized by the UI.

The structured-data builder emits retailer links as offers and external catalog
records as bibliographic identity references.

## Rights

`rights` contains a concise copyright year and holder plus an optional official
rights statement and permissions contact. Rights statements may remain in the
publication's source language; the localization helper falls back to that
language when no translated legal text exists.

Do not silently translate legal notices. Add a translated notice only when it
has been deliberately approved.

## Adding or Updating a Publication

1. Confirm the work type, language, and public status.
2. Record contributors with precise roles.
3. Add the publisher and series/volume metadata when known.
4. Create an edition for each distinct edition statement.
5. Add each binding with its own ISBN, dimensions, and purchase links.
6. Add library records separately from publication dates.
7. Add the official rights statement and permissions route.
8. Add localized front-cover, back-cover, and 3D-mockup assets when artwork is
   available.
9. Run `npm test -- src/features/publications`.
10. Run `npm run typecheck` and `npm run lint`.
11. Check the English and Dutch catalog and detail pages at desktop and mobile
    widths.

`validatePublications()` checks duplicate ids and ISBNs, ISBN-13 checksums,
calendar-valid publication dates, positive dimensions, safe asset paths, and
HTTPS public URLs. The catalog tests also verify that every declared image
exists and that its intrinsic dimensions match the metadata. Keep these checks
passing before merging publication data changes.
