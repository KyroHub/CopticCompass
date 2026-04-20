# Shenute Distillation Pipeline

This document describes the Expert-to-Learner distillation process used in this repository.

- Teacher model: Shenute AI Expert (THOTH AI)
- Learner model target: Shenute AI Learner
- Primary data source: `public.coptic_documents` (Supabase)
- Output location: `tmp/distill`

## Overview

The pipeline has three stages:

1. Extract chunk records from the RAG corpus.
2. Generate teacher supervision with Shenute AI Expert.
3. Build train/validation datasets for SFT, preference learning, and retrieval.

The end result is file-based datasets (JSONL) that can be consumed by training/evaluation workflows.

## Stage 1: Extract Chunks

Script: `scripts/distillExtractChunks.mts`

Purpose:

- Reads rows from `coptic_documents`.
- Writes normalized chunk records as JSONL.
- Writes a run manifest.

Input requirements:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Command:

```bash
npm run distill:extract
```

Optional limit argument:

```bash
npm run distill:extract -- 500
```

Output files:

- `tmp/distill/chunks-<timestamp>.jsonl`
- `tmp/distill/manifest-<timestamp>.json`

Chunk JSONL record shape:

```json
{
  "chunkId": 27518,
  "content": "...",
  "metadata": { "type": "vocabulary", "sourceName": "..." }
}
```

Notes:

- Chunk extraction is paged.
- Paging size is configurable with `DISTILL_EXTRACT_PAGE_SIZE`.

## Stage 2: Generate Teacher Data

Script: `scripts/distillGenerateTeacherData.mts`

Purpose:

- Sends each extracted chunk to Shenute AI Expert (THOTH AI).
- Requests structured supervision (qaPairs, hardNegatives, summary, retrieval signals).
- Validates/parses teacher JSON and writes successful records.
- Skips records that fail after retry or fail JSON parse.

Input requirements:

- `THOTH_API_KEY`
- Optional `THOTH_BASE_URL` (defaults to `https://api.dify.ai/v1`)

Command (auto-discovers latest chunks file):

```bash
npm run distill:teacher
```

Command (explicit input):

```bash
npm run distill:teacher -- tmp/distill/chunks-<timestamp>.jsonl
```

Output file:

- `tmp/distill/teacher-<timestamp>.jsonl`

Teacher JSONL record shape:

```json
{
  "chunkId": 27518,
  "content": "...",
  "metadata": {},
  "teacher": {
    "summary": "...",
    "qaPairs": [{ "instruction": "...", "response": "..." }],
    "hardNegatives": [
      { "instruction": "...", "badAnswer": "...", "whyBad": "..." }
    ],
    "retrievalKeywords": ["..."],
    "retrievalSummary": "...",
    "qualityScore": 0.91,
    "tags": ["..."]
  },
  "teacherName": "Shenute AI Expert"
}
```

### Retry and Timeout Behavior

The teacher stage includes retry/backoff for transient request failures.

Retryable conditions:

- HTTP statuses: `408`, `409`, `425`, `429`, `500`, `502`, `503`, `504`
- Timeout aborts
- Network-level `TypeError`

Config:

- `DISTILL_TEACHER_MAX_RETRIES`
- `DISTILL_TEACHER_RETRY_BASE_MS`
- `DISTILL_TEACHER_RETRY_MAX_MS`
- `DISTILL_TEACHER_TIMEOUT_MS`

Important behavior:

- If retries are exhausted, that chunk is skipped and the run continues.
- If model output is not valid JSON, that chunk is skipped.
- Final console summary prints `success/total`.

## Stage 3: Build Distillation Datasets

Script: `scripts/distillBuildDatasets.mts`

Purpose:

- Reads teacher records.
- Generates three task datasets:
  - SFT (`messages` with system/user/assistant)
  - Preference (prompt/chosen/rejected)
  - Retrieval (query + positive chunk)
- Splits each dataset into train/val (90/10).
- Writes a dataset manifest.

Command (auto-discovers latest teacher file):

```bash
npm run distill:build
```

Command (explicit input):

```bash
npm run distill:build -- tmp/distill/teacher-<timestamp>.jsonl
```

Output directory:

- `tmp/distill/datasets-<timestamp>/`

Output files:

- `sft-train.jsonl`
- `sft-val.jsonl`
- `preference-train.jsonl`
- `preference-val.jsonl`
- `retrieval-train.jsonl`
- `retrieval-val.jsonl`
- `manifest.json`

## End-to-End Command

```bash
npm run distill:pipeline
```

This runs:

1. `distill:extract`
2. `distill:teacher`
3. `distill:build`

## Database Tracking Schema

The migration `supabase/migrations/20260417000000_shenute_distillation_pipeline.sql`
creates tracking/evaluation tables:

- `distill_runs`
- `distill_examples`
- `distill_preferences`
- `distill_eval_cases`
- `distill_eval_results`

Current scripts are file-first and do not automatically upsert records into these
tracking tables yet.

## Troubleshooting

### Missing env variables

Symptom:

- Errors like `Missing required env var: NEXT_PUBLIC_SUPABASE_URL` or `THOTH_API_KEY`.

Fix:

- Ensure `.env.local` contains required values.
- Scripts load env with `@next/env` from repository root.

### THOTH request timeouts or 504s

Symptom:

- Retry logs and occasional skipped chunks.

Fix:

- Increase `DISTILL_TEACHER_TIMEOUT_MS`.
- Increase `DISTILL_TEACHER_MAX_RETRIES`.
- Increase `DISTILL_TEACHER_RETRY_MAX_MS` for longer backoff ceiling.

### Could not parse teacher JSON output

Symptom:

- Chunk skipped with parse error.

Fix:

- Re-run `distill:teacher`; outputs are non-deterministic and may parse on retry.
- Consider adding a JSON repair pass if this becomes frequent.

### Large runs are slow

Suggestions:

- Start with a small sample: `npm run distill:extract -- 100`.
- Tune `DISTILL_EXTRACT_PAGE_SIZE` based on DB and network behavior.
- Run extraction once, then iterate teacher/build stages on fixed input files.

## Operational Tips

- Keep Node pinned with `.nvmrc` / `.node-version` for reproducibility.
- Archive `tmp/distill` outputs per experiment run if you compare prompts/settings.
- Use the dataset manifest files to trace provenance of generated training splits.
