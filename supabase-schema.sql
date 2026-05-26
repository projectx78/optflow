-- ================================================================
-- OPTIONS SIGNAL BETA — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ================================================================

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text,
  full_name    text,
  plan         text default 'free' check (plan in ('free','pro','admin')),
  whatsapp     text,
  phone        text,
  alert_min_confidence int default 75,
  alerts_enabled boolean default false,
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SIGNALS (AI analysis results)
create table public.signals (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles on delete cascade,
  symbol       text not null,
  expiry       text,
  direction    text check (direction in ('CALL','PUT','WAIT')),
  confidence   int,
  strategy_type text,
  signal_json  jsonb,
  strategy_json jsonb,
  pcr          numeric,
  spot         numeric,
  created_at   timestamptz default now()
);
alter table public.signals enable row level security;
create policy "Users see own signals" on public.signals for all using (auth.uid() = user_id);
create index on public.signals(user_id, created_at desc);

-- 3. TRADES / P&L JOURNAL
create table public.trades (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles on delete cascade,
  signal_id      uuid references public.signals on delete set null,
  symbol         text not null,
  strategy_type  text,
  direction      text,
  entry_price    numeric,
  exit_price     numeric,
  quantity       int default 1,
  premium_paid   numeric,
  premium_received numeric,
  pnl            numeric generated always as (
                   case when exit_price is not null and entry_price is not null
                   then (exit_price - entry_price) * quantity
                   else null end
                 ) stored,
  result         text check (result in ('WIN','LOSS','SCRATCH','OPEN')),
  notes          text,
  entry_at       timestamptz default now(),
  exit_at        timestamptz,
  created_at     timestamptz default now()
);
alter table public.trades enable row level security;
create policy "Users see own trades" on public.trades for all using (auth.uid() = user_id);
create index on public.trades(user_id, created_at desc);

-- 4. BACKTEST RESULTS
create table public.backtests (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles on delete cascade,
  symbol         text,
  strategy_type  text,
  date_from      date,
  date_to        date,
  total_signals  int,
  wins           int,
  losses         int,
  win_rate       numeric,
  total_pnl      numeric,
  avg_confidence numeric,
  results_json   jsonb,
  created_at     timestamptz default now()
);
alter table public.backtests enable row level security;
create policy "Users see own backtests" on public.backtests for all using (auth.uid() = user_id);

-- 5. ALERT LOG
create table public.alert_log (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles on delete cascade,
  signal_id  uuid references public.signals on delete cascade,
  channel    text check (channel in ('whatsapp','sms','email')),
  message    text,
  sent_at    timestamptz default now(),
  status     text default 'sent'
);
alter table public.alert_log enable row level security;
create policy "Users see own alerts" on public.alert_log for select using (auth.uid() = user_id);

-- 6. ADMIN VIEW (all users, signals count, plan)
create or replace view public.admin_overview as
  select
    p.id, p.email, p.full_name, p.plan, p.created_at,
    count(distinct s.id) as signal_count,
    count(distinct t.id) as trade_count
  from public.profiles p
  left join public.signals s on s.user_id = p.id
  left join public.trades  t on t.user_id = p.id
  group by p.id;
-- admin only: add RLS manually in dashboard for this view
