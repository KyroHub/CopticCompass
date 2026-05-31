# Documentation

Use this page as the entry point for Coptic Compass project documentation. The
root [README](../README.md) is the quick project overview; these docs cover the
working details.

## Start Here

| Need                          | Read                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| Project structure and routing | [Architecture Guide](./architecture.md)                               |
| Local setup and deployment    | [Environment & Deployment Setup](./environment-setup.md)              |
| Dictionary data editing       | [Dictionary JSON Guide](./dictionary-json.md)                         |
| Practice feature              | [Practice Feature Guide](./practice.md)                               |
| API, AI, OCR, and RAG flows   | [API, AI, and Data Workflows](./api-and-workflows.md)                 |
| Brand, copy, and assets       | [Coptic Compass Brand Book](./coptic-compass-brand-guide.md)          |
| UI implementation patterns    | [Coptic Compass UI Guide](./ui-guide.md)                              |
| Dutch UI and content copy     | [Dutch Localization Style Guide](./dutch-localization-style-guide.md) |
| Shenute distillation datasets | [Shenute Distillation Pipeline](./distillation.md)                    |

## Editing Guidance

- Keep `README.md` short and public-facing.
- Put implementation placement rules in `architecture.md`.
- Put runtime setup, secrets, deploy, and webhook details in
  `environment-setup.md`.
- Put dictionary field conventions in `dictionary-json.md`; other docs should
  link there instead of repeating the full contract.
- Put Practice card generation, FSRS scheduling, decks, and persistence details
  in `practice.md`.
- Put public API, AI provider, OCR, RAG, and communications workflow details in
  `api-and-workflows.md`.
- Put product voice, visual identity, and public copy posture in the brand book.
- Put page rhythm, buttons, filters, control surfaces, mobile scroll-fatigue
  rules, and contributor UI checklists in `ui-guide.md`.
- Put Dutch terminology and localization rules in the localization guide.

When a change spans multiple docs, prefer one detailed source of truth and short
cross-links from the rest.
