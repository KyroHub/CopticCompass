create table if not exists public.chat_feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  signal text not null check (signal in ('admin_feedback', 'like', 'dislike')),
  prompt_text text not null check (char_length(prompt_text) between 1 and 12000),
  assistant_response_text text not null check (
    char_length(assistant_response_text) between 1 and 24000
  ),
  feedback_text text,
  inference_provider text not null check (
    inference_provider in ('gemini', 'hf', 'openrouter')
  ),
  page_path text,
  page_title text,
  page_url text,
  page_excerpt text,
  chat_id text,
  user_message_id text,
  assistant_message_id text,
  is_admin_feedback boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (
      signal = 'admin_feedback'
      and is_admin_feedback = true
      and feedback_text is not null
      and char_length(feedback_text) between 1 and 5000
    )
    or (
      signal in ('like', 'dislike')
      and is_admin_feedback = false
      and feedback_text is null
    )
  )
);

create index if not exists chat_feedback_events_user_created_idx
  on public.chat_feedback_events (user_id, created_at desc);

create index if not exists chat_feedback_events_signal_created_idx
  on public.chat_feedback_events (signal, created_at desc);

create index if not exists chat_feedback_events_assistant_message_idx
  on public.chat_feedback_events (assistant_message_id)
  where assistant_message_id is not null;

alter table public.chat_feedback_events enable row level security;

drop policy if exists "Users can insert their own chat feedback events"
  on public.chat_feedback_events;
drop policy if exists "Users can read their own chat feedback events"
  on public.chat_feedback_events;
drop policy if exists "Admins can read all chat feedback events"
  on public.chat_feedback_events;

create policy "Users can insert their own chat feedback events"
on public.chat_feedback_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read their own chat feedback events"
on public.chat_feedback_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all chat feedback events"
on public.chat_feedback_events
for select
to authenticated
using (public.is_admin());
