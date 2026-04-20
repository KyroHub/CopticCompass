create table if not exists public.distill_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  teacher_name text not null default 'Shenute AI Expert',
  learner_name text not null default 'Shenute AI Learner',
  source_filter jsonb not null default '{}'::jsonb,
  input_chunk_count integer not null default 0 check (input_chunk_count >= 0),
  generated_example_count integer not null default 0 check (generated_example_count >= 0),
  approved_example_count integer not null default 0 check (approved_example_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distill_examples (
  id bigserial primary key,
  run_id uuid not null references public.distill_runs (id) on delete cascade,
  source_document_id bigint references public.coptic_documents (id) on delete set null,
  source_chunk_hash text not null,
  split text not null default 'train' check (split in ('train', 'val', 'test')),
  task_type text not null check (
    task_type in ('qa', 'rewrite', 'retrieval', 'contrastive')
  ),
  prompt text not null,
  teacher_answer text not null,
  student_target jsonb not null default '{}'::jsonb,
  quality_score numeric(4, 3) check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  approved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distill_preferences (
  id bigserial primary key,
  run_id uuid not null references public.distill_runs (id) on delete cascade,
  prompt text not null,
  chosen text not null,
  rejected text not null,
  source text not null default 'teacher',
  weight numeric(6, 3) not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distill_eval_cases (
  id bigserial primary key,
  slug text not null unique,
  task_type text not null,
  prompt text not null,
  expected jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distill_eval_results (
  id bigserial primary key,
  run_id uuid not null references public.distill_runs (id) on delete cascade,
  case_id bigint not null references public.distill_eval_cases (id) on delete cascade,
  provider text not null,
  output text not null,
  score numeric(4, 3) check (score is null or (score >= 0 and score <= 1)),
  passed boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists distill_runs_status_created_idx
  on public.distill_runs (status, created_at desc);

create index if not exists distill_examples_run_split_idx
  on public.distill_examples (run_id, split, task_type);

create index if not exists distill_examples_source_document_idx
  on public.distill_examples (source_document_id)
  where source_document_id is not null;

create index if not exists distill_preferences_run_idx
  on public.distill_preferences (run_id, created_at desc);

create index if not exists distill_eval_results_run_case_idx
  on public.distill_eval_results (run_id, case_id);

alter table public.distill_runs enable row level security;
alter table public.distill_examples enable row level security;
alter table public.distill_preferences enable row level security;
alter table public.distill_eval_cases enable row level security;
alter table public.distill_eval_results enable row level security;

drop policy if exists "Admins can read distill runs" on public.distill_runs;
drop policy if exists "Admins can read distill examples" on public.distill_examples;
drop policy if exists "Admins can read distill preferences" on public.distill_preferences;
drop policy if exists "Admins can read distill eval cases" on public.distill_eval_cases;
drop policy if exists "Admins can read distill eval results" on public.distill_eval_results;
drop policy if exists "Service role manages distill runs" on public.distill_runs;
drop policy if exists "Service role manages distill examples" on public.distill_examples;
drop policy if exists "Service role manages distill preferences" on public.distill_preferences;
drop policy if exists "Service role manages distill eval cases" on public.distill_eval_cases;
drop policy if exists "Service role manages distill eval results" on public.distill_eval_results;

create policy "Admins can read distill runs"
on public.distill_runs
for select
to authenticated
using (public.is_admin());

create policy "Admins can read distill examples"
on public.distill_examples
for select
to authenticated
using (public.is_admin());

create policy "Admins can read distill preferences"
on public.distill_preferences
for select
to authenticated
using (public.is_admin());

create policy "Admins can read distill eval cases"
on public.distill_eval_cases
for select
to authenticated
using (public.is_admin());

create policy "Admins can read distill eval results"
on public.distill_eval_results
for select
to authenticated
using (public.is_admin());

create policy "Service role manages distill runs"
on public.distill_runs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages distill examples"
on public.distill_examples
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages distill preferences"
on public.distill_preferences
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages distill eval cases"
on public.distill_eval_cases
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages distill eval results"
on public.distill_eval_results
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');