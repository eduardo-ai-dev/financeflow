-- =============================================================================
-- FinanceFlow — Migração 0003: Projetos Independentes e Gestão Imobiliária (Fase 4)
--
-- Regra de Negócio 1 e 2 (README):
--   1. Separação de Caixa, Patrimônio e Objetivos
--   2. Rastreabilidade e vínculo inteligente de transações sem duplicidade
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. projects — Grandes objetivos e projetos isolados
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 100),
  description    text check (description is null or char_length(description) <= 2000),
  target_budget  numeric(14,2) not null check (target_budget >= 0),
  start_date     date,
  end_date       date,
  status         text not null default 'in_progress' check (status in ('planning', 'in_progress', 'completed', 'canceled')),
  color          text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  icon           text check (icon is null or char_length(icon) <= 40),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint projects_id_user_key unique (id, user_id)
);

create index if not exists projects_user_status_idx on public.projects (user_id, status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. real_estate_properties — Gestão imobiliária completa
-- -----------------------------------------------------------------------------
create table if not exists public.real_estate_properties (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                  text not null check (char_length(btrim(name)) between 1 and 120),
  builder               text check (builder is null or char_length(builder) <= 100),
  unit                  text check (unit is null or char_length(unit) <= 60),
  contract_value        numeric(14,2) not null check (contract_value > 0),
  current_market_value  numeric(14,2) check (current_market_value is null or current_market_value > 0),
  purchase_date         date not null,
  keys_delivery_date    date,
  status                text not null default 'under_construction' check (
                          status in ('planning', 'under_construction', 'ready', 'delivered')
                        ),
  -- Entrada (sinal + parcelas construtora)
  down_payment_total    numeric(14,2) not null default 0 check (down_payment_total >= 0),
  down_payment_paid     numeric(14,2) not null default 0 check (down_payment_paid >= 0),
  -- Financiamento
  financed_amount       numeric(14,2) not null default 0 check (financed_amount >= 0),
  bank                  text check (bank is null or char_length(bank) <= 80),
  amortization_system   text not null default 'sac' check (amortization_system in ('sac', 'price')),
  annual_interest_rate  numeric(6,4) not null default 0.0950 check (annual_interest_rate >= 0),
  total_term_months     int not null default 360 check (total_term_months between 1 and 420),
  paid_months           int not null default 0 check (paid_months >= 0),
  -- Encargos de obra e adicionais
  construction_index    text not null default 'INCC' check (construction_index in ('INCC', 'IPCA', 'CUB', 'IGP-M', 'OUTRO')),
  construction_fees_paid numeric(14,2) not null default 0 check (construction_fees_paid >= 0),
  additional_costs_paid  numeric(14,2) not null default 0 check (additional_costs_paid >= 0),
  notes                 text check (notes is null or char_length(notes) <= 4000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint real_estate_properties_id_user_key unique (id, user_id)
);

create index if not exists real_estate_properties_user_idx on public.real_estate_properties (user_id);

create trigger real_estate_properties_set_updated_at
  before update on public.real_estate_properties
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. real_estate_amortizations — Registro de amortizações extraordinárias
-- -----------------------------------------------------------------------------
create table if not exists public.real_estate_amortizations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  property_id     uuid not null references public.real_estate_properties (id) on delete cascade,
  amount          numeric(14,2) not null check (amount > 0),
  date            date not null,
  reduction_type  text not null check (reduction_type in ('term', 'installment')),
  interest_saved  numeric(14,2) default 0,
  term_reduced    int default 0,
  notes           text check (notes is null or char_length(notes) <= 1000),
  created_at      timestamptz not null default now(),
  constraint real_estate_amortizations_id_user_key unique (id, user_id)
);

create index if not exists real_estate_amortizations_prop_idx
  on public.real_estate_amortizations (user_id, property_id);

-- -----------------------------------------------------------------------------
-- 4. Vínculo inteligente na tabela transactions
-- -----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists project_id uuid references public.projects (id) on delete set null,
  add column if not exists property_id uuid references public.real_estate_properties (id) on delete set null;

create index if not exists transactions_project_idx on public.transactions (project_id) where project_id is not null;
create index if not exists transactions_property_idx on public.transactions (property_id) where property_id is not null;

-- -----------------------------------------------------------------------------
-- 5. Triggers de Auditoria para as novas tabelas
-- -----------------------------------------------------------------------------
drop trigger if exists projects_audit on public.projects;
create trigger projects_audit
  after insert or update or delete on public.projects
  for each row execute function public.log_audit();

drop trigger if exists real_estate_properties_audit on public.real_estate_properties;
create trigger real_estate_properties_audit
  after insert or update or delete on public.real_estate_properties
  for each row execute function public.log_audit();

drop trigger if exists real_estate_amortizations_audit on public.real_estate_amortizations;
create trigger real_estate_amortizations_audit
  after insert or update or delete on public.real_estate_amortizations
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.real_estate_properties enable row level security;
alter table public.real_estate_amortizations enable row level security;

-- projects
create policy projects_select_own on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy projects_insert_own on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy projects_update_own on public.projects
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy projects_delete_own on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- real_estate_properties
create policy real_estate_properties_select_own on public.real_estate_properties
  for select to authenticated using (user_id = (select auth.uid()));
create policy real_estate_properties_insert_own on public.real_estate_properties
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy real_estate_properties_update_own on public.real_estate_properties
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy real_estate_properties_delete_own on public.real_estate_properties
  for delete to authenticated using (user_id = (select auth.uid()));

-- real_estate_amortizations
create policy real_estate_amortizations_select_own on public.real_estate_amortizations
  for select to authenticated using (user_id = (select auth.uid()));
create policy real_estate_amortizations_insert_own on public.real_estate_amortizations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy real_estate_amortizations_update_own on public.real_estate_amortizations
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy real_estate_amortizations_delete_own on public.real_estate_amortizations
  for delete to authenticated using (user_id = (select auth.uid()));
