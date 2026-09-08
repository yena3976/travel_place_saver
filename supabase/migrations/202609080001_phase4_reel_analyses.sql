create table if not exists public.reel_analyses (
  id uuid primary key default gen_random_uuid(),
  normalized_reel_url text not null unique,
  status text not null default 'processing' check (status in ('processing','completed','not_found','failed')),
  source_caption text,
  analysis_result jsonb,
  ai_model text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric(12,8) check (estimated_cost is null or estimated_cost >= 0),
  ai_duration_ms integer check (ai_duration_ms is null or ai_duration_ms >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reel_analyses_status_idx on public.reel_analyses (status);

drop trigger if exists reel_analyses_set_updated_at on public.reel_analyses;
create trigger reel_analyses_set_updated_at before update on public.reel_analyses
for each row execute function public.set_updated_at();

alter table public.reel_analyses enable row level security;
revoke all on table public.reel_analyses from anon, authenticated;
grant select, insert, update, delete on table public.reel_analyses to service_role;
