-- =============================================================================
-- FinanceFlow — Migração 0007 Consolidada e Idempotente:
-- 1. Criação de todas as entidades ausentes (0001 a 0006: profiles, accounts,
--    categories, transactions, audit_logs, credit_cards, card_invoices,
--    installments, projects, real_estate_properties, real_estate_amortizations,
--    goals, assets, investments, investment_transactions, liabilities + views)
-- 2. Blindagem de Segurança Avançada (RLS completo, FKs Compostas Multi-Tenant,
--    Trigger de Forçamento de JWT user_id, Menor Privilégio e Storage RLS)
-- 3. Classificação de Gastos (expense_classification)
--
-- Pode ser executado com segurança mesmo se apenas parte das migrações
-- anteriores tiver sido rodada no Supabase SQL Editor.
-- =============================================================================

begin;

-- =============================================================================
-- PARTE 1: FUNÇÕES UTILITÁRIAS E AUDITORIA BASE (0001)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  locale      text not null default 'pt-BR',
  currency    text not null default 'BRL',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  institution      text check (institution is null or char_length(institution) <= 80),
  type             text not null check (type in (
                     'checking', 'savings', 'digital', 'cash', 'wallet', 'brokerage', 'vault'
                   )),
  opening_balance  numeric(14,2) not null default 0,
  opened_on        date,
  color            text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  icon             text check (icon is null or char_length(icon) <= 40),
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint accounts_id_user_key unique (id, user_id)
);

create unique index if not exists accounts_user_name_key
  on public.accounts (user_id, lower(name));

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id    uuid,
  kind         text not null check (kind in ('income', 'expense')),
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  color        text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  icon         text check (icon is null or char_length(icon) <= 40),
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint categories_id_user_kind_key unique (id, user_id, kind),
  constraint categories_id_user_key unique (id, user_id),
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id),
  constraint categories_parent_fk foreign key (parent_id, user_id, kind)
    references public.categories (id, user_id, kind) on delete cascade
);

create unique index if not exists categories_user_kind_parent_name_key
  on public.categories (user_id, kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index if not exists categories_user_parent_idx
  on public.categories (user_id, parent_id);

create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind           text not null,
  status         text not null default 'pending' check (status in ('pending', 'completed', 'canceled')),
  description    text not null check (char_length(btrim(description)) between 1 and 200),
  amount         numeric(14,2) not null check (amount > 0),
  account_id     uuid,
  to_account_id  uuid,
  category_id    uuid,
  due_date       date not null,
  paid_date      date,
  notes          text check (notes is null or char_length(notes) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint transactions_account_fk foreign key (account_id, user_id)
    references public.accounts (id, user_id),
  constraint transactions_to_account_fk foreign key (to_account_id, user_id)
    references public.accounts (id, user_id),
  constraint transactions_paid_date_matches_status check (
    (status = 'completed') = (paid_date is not null)
  )
);

create index if not exists transactions_user_due_date_idx on public.transactions (user_id, due_date desc);
create index if not exists transactions_user_paid_date_idx on public.transactions (user_id, paid_date desc) where paid_date is not null;
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create index if not exists transactions_category_idx on public.transactions (category_id) where category_id is not null;

create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_record_idx on public.audit_logs (table_name, record_id);

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row  jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_user uuid  := (v_row ->> 'user_id')::uuid;
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;

  if tg_op = 'DELETE' and not exists (select 1 from auth.users u where u.id = v_user) then
    return null;
  end if;

  insert into public.audit_logs (user_id, table_name, record_id, action, old_data, new_data)
  values (
    v_user,
    tg_table_name,
    (v_row ->> 'id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

-- =============================================================================
-- PARTE 2: CRIAÇÃO DAS ENTIDADES DE CARTÕES, PROJETOS, IMÓVEIS, METAS, ATIVOS
--          E INVESTIMENTOS (0002, 0003, 0004, 0005 e 0006)
-- =============================================================================

-- 2.1 credit_cards (0002 + 0006 initial_used_amount)
create table if not exists public.credit_cards (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 80),
  institution         text check (institution is null or char_length(institution) <= 80),
  brand               text not null default 'mastercard' check (brand in ('mastercard', 'visa', 'elo', 'amex', 'hipercard', 'other')),
  limit_amount        numeric(14,2) not null check (limit_amount > 0),
  initial_used_amount numeric(14,2) not null default 0 check (initial_used_amount >= 0),
  closing_day         int not null check (closing_day between 1 and 31),
  due_day             int not null check (due_day between 1 and 31),
  color               text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  default_account_id  uuid references public.accounts (id) on delete set null,
  is_archived         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint credit_cards_id_user_key unique (id, user_id)
);

alter table public.credit_cards
  add column if not exists initial_used_amount numeric(14,2) not null default 0
  check (initial_used_amount >= 0);

create unique index if not exists credit_cards_user_name_key
  on public.credit_cards (user_id, lower(name));

-- 2.2 card_invoices (0002)
create table if not exists public.card_invoices (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id                 uuid not null references public.credit_cards (id) on delete cascade,
  month                   int not null check (month between 1 and 12),
  year                    int not null check (year between 2020 and 2100),
  closing_date            date not null,
  due_date                date not null,
  status                  text not null default 'open' check (status in ('open', 'closed', 'paid', 'overdue')),
  payment_transaction_id  uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint card_invoices_card_year_month_key unique (card_id, year, month),
  constraint card_invoices_id_user_key unique (id, user_id)
);

create index if not exists card_invoices_user_card_idx on public.card_invoices (user_id, card_id);
create index if not exists card_invoices_due_date_idx on public.card_invoices (due_date);

-- 2.3 installments (0002)
create table if not exists public.installments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id             uuid references public.credit_cards (id) on delete set null,
  account_id          uuid references public.accounts (id) on delete set null,
  category_id         uuid references public.categories (id) on delete set null,
  description         text not null check (char_length(btrim(description)) between 1 and 200),
  total_amount        numeric(14,2) not null check (total_amount > 0),
  installment_amount  numeric(14,2) not null check (installment_amount > 0),
  total_installments  int not null check (total_installments between 1 and 360),
  start_date          date not null,
  status              text not null default 'active' check (status in ('active', 'completed', 'canceled')),
  notes               text check (notes is null or char_length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint installments_id_user_key unique (id, user_id)
);

create index if not exists installments_user_card_idx on public.installments (user_id, card_id);
create index if not exists installments_user_status_idx on public.installments (user_id, status);

-- 2.4 projects (0003)
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

-- 2.5 real_estate_properties (0003)
create table if not exists public.real_estate_properties (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                   text not null check (char_length(btrim(name)) between 1 and 120),
  builder                text check (builder is null or char_length(builder) <= 100),
  unit                   text check (unit is null or char_length(unit) <= 60),
  contract_value         numeric(14,2) not null check (contract_value > 0),
  current_market_value   numeric(14,2) check (current_market_value is null or current_market_value > 0),
  purchase_date          date not null,
  keys_delivery_date     date,
  status                 text not null default 'under_construction' check (
                           status in ('planning', 'under_construction', 'ready', 'delivered')
                         ),
  down_payment_total     numeric(14,2) not null default 0 check (down_payment_total >= 0),
  down_payment_paid      numeric(14,2) not null default 0 check (down_payment_paid >= 0),
  financed_amount        numeric(14,2) not null default 0 check (financed_amount >= 0),
  bank                   text check (bank is null or char_length(bank) <= 80),
  amortization_system    text not null default 'sac' check (amortization_system in ('sac', 'price')),
  annual_interest_rate   numeric(6,4) not null default 0.0950 check (annual_interest_rate >= 0),
  total_term_months      int not null default 360 check (total_term_months between 1 and 420),
  paid_months            int not null default 0 check (paid_months >= 0),
  construction_index     text not null default 'INCC' check (construction_index in ('INCC', 'IPCA', 'CUB', 'IGP-M', 'OUTRO')),
  construction_fees_paid numeric(14,2) not null default 0 check (construction_fees_paid >= 0),
  additional_costs_paid  numeric(14,2) not null default 0 check (additional_costs_paid >= 0),
  notes                  text check (notes is null or char_length(notes) <= 4000),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint real_estate_properties_id_user_key unique (id, user_id)
);

create index if not exists real_estate_properties_user_idx on public.real_estate_properties (user_id);

-- 2.6 real_estate_amortizations (0003)
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

-- 2.7 goals (0004)
create table if not exists public.goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  brand               text check (brand is null or char_length(brand) <= 80),
  priority            text not null default 'medium' check (priority in ('low', 'medium', 'high', 'essential')),
  target_amount       numeric(14,2) not null check (target_amount > 0),
  current_amount      numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date         date,
  account_id          uuid references public.accounts (id) on delete set null,
  category_id         uuid references public.categories (id) on delete set null,
  status              text not null default 'in_progress' check (status in ('planned', 'in_progress', 'completed', 'canceled')),
  purchased_amount    numeric(14,2) check (purchased_amount is null or purchased_amount >= 0),
  purchased_date      date,
  converted_to_asset  boolean not null default false,
  asset_id            uuid,
  image_url           text check (image_url is null or char_length(image_url) <= 1000),
  notes               text check (notes is null or char_length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint goals_id_user_key unique (id, user_id)
);

create index if not exists goals_user_status_idx on public.goals (user_id, status);

-- 2.8 assets (0004)
create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  type                text not null default 'electronics' check (
                        type in ('real_estate', 'vehicle', 'electronics', 'furniture', 'jewelry', 'other')
                      ),
  acquisition_value   numeric(14,2) not null check (acquisition_value >= 0),
  current_value       numeric(14,2) not null check (current_value >= 0),
  acquisition_date    date not null,
  goal_id             uuid references public.goals (id) on delete set null,
  property_id         uuid references public.real_estate_properties (id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint assets_id_user_key unique (id, user_id)
);

create index if not exists assets_user_type_idx on public.assets (user_id, type);

-- 2.9 investments (0005)
create table if not exists public.investments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  ticker              text check (ticker is null or char_length(ticker) <= 20),
  type                text not null default 'fixed_income' check (
                        type in ('fixed_income', 'stocks', 'reits', 'etf', 'crypto', 'funds', 'pension', 'other')
                      ),
  institution         text not null check (char_length(btrim(institution)) between 1 and 80),
  initial_amount      numeric(14,2) not null default 0 check (initial_amount >= 0),
  total_invested      numeric(14,2) not null default 0 check (total_invested >= 0),
  current_amount      numeric(14,2) not null default 0 check (current_amount >= 0),
  start_date          date not null,
  due_date            date,
  liquidity           text not null default 'daily' check (
                        liquidity in ('daily', 'd_plus_1', 'd_plus_30', 'at_maturity', 'locked')
                      ),
  benchmark           text check (benchmark is null or char_length(benchmark) <= 40),
  rate                text check (rate is null or char_length(rate) <= 60),
  notes               text check (notes is null or char_length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint investments_id_user_key unique (id, user_id)
);

create index if not exists investments_user_type_idx on public.investments (user_id, type);
create index if not exists investments_user_inst_idx on public.investments (user_id, institution);

-- 2.10 investment_transactions (0005)
create table if not exists public.investment_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investment_id       uuid not null references public.investments (id) on delete cascade,
  type                text not null check (
                        type in ('contribution', 'redemption', 'dividend', 'interest_on_equity', 'yield')
                      ),
  amount              numeric(14,2) not null check (amount > 0),
  shares_quantity     numeric(14,4) check (shares_quantity is null or shares_quantity >= 0),
  unit_price          numeric(14,4) check (unit_price is null or unit_price >= 0),
  date                date not null,
  account_id          uuid references public.accounts (id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 1000),
  created_at          timestamptz not null default now(),
  constraint investment_transactions_id_user_key unique (id, user_id)
);

create index if not exists inv_tx_user_inv_idx on public.investment_transactions (user_id, investment_id);
create index if not exists inv_tx_user_date_idx on public.investment_transactions (user_id, date desc);

-- 2.11 liabilities (0005)
create table if not exists public.liabilities (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                    text not null check (char_length(btrim(name)) between 1 and 120),
  type                    text not null default 'loan' check (
                            type in ('loan', 'financing', 'debt', 'tax', 'other')
                          ),
  total_amount            numeric(14,2) not null check (total_amount >= 0),
  current_balance         numeric(14,2) not null check (current_balance >= 0),
  monthly_payment         numeric(14,2) check (monthly_payment is null or monthly_payment >= 0),
  remaining_installments  int check (remaining_installments is null or remaining_installments >= 0),
  interest_rate_monthly   numeric(6,4) check (interest_rate_monthly is null or interest_rate_monthly >= 0),
  due_date                date,
  notes                   text check (notes is null or char_length(notes) <= 2000),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint liabilities_id_user_key unique (id, user_id)
);

create index if not exists liabilities_user_type_idx on public.liabilities (user_id, type);

-- =============================================================================
-- PARTE 3: EVOLUÇÃO DE TRANSACTIONS, VIEWS E TRIGGERS (0002, 0003, 0006, 0007)
-- =============================================================================

alter table public.transactions alter column account_id drop not null;

alter table public.transactions
  add column if not exists card_id uuid,
  add column if not exists invoice_id uuid,
  add column if not exists installment_id uuid,
  add column if not exists installment_number int,
  add column if not exists project_id uuid,
  add column if not exists property_id uuid,
  add column if not exists expense_classification text;

alter table public.transactions drop constraint if exists transactions_kind_check;
alter table public.transactions add constraint transactions_kind_check check (
  kind in (
    'income',
    'expense',
    'transfer',
    'investment_contribution',
    'investment_redemption',
    'card_purchase',
    'invoice_payment'
  )
);

alter table public.transactions drop constraint if exists transactions_accounts_shape;
alter table public.transactions add constraint transactions_accounts_shape check (
  (kind in ('income', 'expense') and account_id is not null and to_account_id is null and card_id is null)
  or (kind in ('transfer', 'investment_contribution', 'investment_redemption')
      and account_id is not null and to_account_id is not null and to_account_id <> account_id and card_id is null)
  or (kind = 'card_purchase' and card_id is not null and account_id is null and to_account_id is null)
  or (kind = 'invoice_payment' and account_id is not null and card_id is not null and to_account_id is null)
);

alter table public.transactions drop constraint if exists transactions_category_only_cash_flow;
alter table public.transactions add constraint transactions_category_only_cash_flow check (
  category_id is null or kind in ('income', 'expense', 'card_purchase')
);

alter table public.transactions
  drop constraint if exists transactions_expense_classification_check,
  drop constraint if exists transactions_expense_classification_values_check,
  drop constraint if exists transactions_expense_classification_kind_check;

alter table public.transactions
  add constraint transactions_expense_classification_values_check check (
    expense_classification is null
    or expense_classification in ('fixed', 'variable', 'occasional', 'extraordinary')
  ),
  add constraint transactions_expense_classification_kind_check check (
    expense_classification is null
    or kind in ('expense', 'card_purchase')
  );

create index if not exists transactions_card_idx on public.transactions (card_id) where card_id is not null;
create index if not exists transactions_invoice_idx on public.transactions (invoice_id) where invoice_id is not null;
create index if not exists transactions_installment_idx on public.transactions (installment_id) where installment_id is not null;
create index if not exists transactions_project_idx on public.transactions (project_id) where project_id is not null;
create index if not exists transactions_property_idx on public.transactions (property_id) where property_id is not null;

-- Validação de protocolo seguro em goals.image_url (apenas http/https)
alter table public.goals
  drop constraint if exists goals_image_url_protocol_check;

alter table public.goals
  add constraint goals_image_url_protocol_check check (
    image_url is null
    or image_url = ''
    or image_url ~* '^https?://'
  ) not valid;

-- Views com security_invoker = true (respeitam RLS do usuário autenticado)
create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id       as account_id,
  a.user_id,
  a.opening_balance,
  a.opening_balance + coalesce(m.completed, 0)                          as current_balance,
  a.opening_balance + coalesce(m.completed, 0) + coalesce(m.pending, 0) as projected_balance
from public.accounts a
left join lateral (
  select
    sum(x.delta) filter (where x.status = 'completed') as completed,
    sum(x.delta) filter (where x.status = 'pending')   as pending
  from (
    select t.status,
           case
             when t.kind = 'income' then t.amount
             when t.kind in ('expense', 'transfer', 'investment_contribution', 'invoice_payment') then -t.amount
             else 0
           end as delta
    from public.transactions t
    where t.account_id = a.id and t.status in ('completed', 'pending')
    union all
    select t.status, t.amount
    from public.transactions t
    where t.to_account_id = a.id and t.status in ('completed', 'pending')
  ) x
) m on true;

create or replace view public.card_limits
with (security_invoker = true)
as
select
  c.id as card_id,
  c.user_id,
  c.name,
  c.limit_amount,
  c.initial_used_amount + coalesce(used.total_used, 0) as used_amount,
  c.limit_amount - (c.initial_used_amount + coalesce(used.total_used, 0)) as available_limit
from public.credit_cards c
left join lateral (
  select sum(t.amount) as total_used
  from public.transactions t
  left join public.card_invoices inv on t.invoice_id = inv.id
  where t.card_id = c.id
    and t.kind = 'card_purchase'
    and (inv.status is null or inv.status in ('open', 'closed', 'overdue'))
) used on true;

-- Triggers de updated_at e auditoria (idempotentes via format(%I))
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'accounts',
    'categories',
    'transactions',
    'credit_cards',
    'card_invoices',
    'installments',
    'projects',
    'real_estate_properties',
    'goals',
    'assets',
    'investments',
    'liabilities'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_set_updated_at', tbl);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      tbl || '_set_updated_at',
      tbl
    );
  end loop;

  foreach tbl in array array[
    'accounts',
    'categories',
    'transactions',
    'credit_cards',
    'card_invoices',
    'installments',
    'projects',
    'real_estate_properties',
    'real_estate_amortizations',
    'goals',
    'assets',
    'investments',
    'investment_transactions',
    'liabilities'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_audit', tbl);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_audit()',
      tbl || '_audit',
      tbl
    );
  end loop;
end;
$$;

-- =============================================================================
-- PARTE 4: CHAVES ESTRANGEIRAS COMPOSTAS (id, user_id) MULTI-TENANT
-- =============================================================================

-- Garante UNIQUE (id, user_id) em todas as tabelas antes de criar FKs compostas
do $$
declare
  tbl text;
  con_name text;
begin
  foreach tbl in array array[
    'accounts',
    'categories',
    'credit_cards',
    'card_invoices',
    'installments',
    'projects',
    'real_estate_properties',
    'real_estate_amortizations',
    'goals',
    'assets',
    'investments',
    'investment_transactions',
    'liabilities'
  ]
  loop
    con_name := tbl || '_id_user_key';
    if not exists (
      select 1
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = tbl
        and c.conname = con_name
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (id, user_id)',
        tbl,
        con_name
      );
    end if;
  end loop;
end;
$$;

-- credit_cards -> default_account_id
alter table public.credit_cards
  drop constraint if exists credit_cards_default_account_id_fkey,
  drop constraint if exists credit_cards_default_account_user_fk;
alter table public.credit_cards
  add constraint credit_cards_default_account_user_fk
  foreign key (default_account_id, user_id)
  references public.accounts (id, user_id)
  on delete set null (default_account_id);

-- card_invoices -> card_id
alter table public.card_invoices
  drop constraint if exists card_invoices_card_id_fkey,
  drop constraint if exists card_invoices_card_user_fk;
alter table public.card_invoices
  add constraint card_invoices_card_user_fk
  foreign key (card_id, user_id)
  references public.credit_cards (id, user_id)
  on delete cascade;

-- installments -> card_id, account_id, category_id
alter table public.installments
  drop constraint if exists installments_card_id_fkey,
  drop constraint if exists installments_account_id_fkey,
  drop constraint if exists installments_category_id_fkey,
  drop constraint if exists installments_card_user_fk,
  drop constraint if exists installments_account_user_fk,
  drop constraint if exists installments_category_user_fk;

alter table public.installments
  add constraint installments_card_user_fk
  foreign key (card_id, user_id)
  references public.credit_cards (id, user_id)
  on delete set null (card_id),
  add constraint installments_account_user_fk
  foreign key (account_id, user_id)
  references public.accounts (id, user_id)
  on delete set null (account_id),
  add constraint installments_category_user_fk
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id);

-- transactions -> category_id, card_id, invoice_id, installment_id, project_id, property_id
alter table public.transactions
  drop constraint if exists transactions_category_fk,
  drop constraint if exists transactions_category_user_fk,
  drop constraint if exists transactions_card_id_fkey,
  drop constraint if exists transactions_invoice_id_fkey,
  drop constraint if exists transactions_installment_id_fkey,
  drop constraint if exists transactions_project_id_fkey,
  drop constraint if exists transactions_property_id_fkey,
  drop constraint if exists transactions_card_user_fk,
  drop constraint if exists transactions_invoice_user_fk,
  drop constraint if exists transactions_installment_user_fk,
  drop constraint if exists transactions_project_user_fk,
  drop constraint if exists transactions_property_user_fk;

alter table public.transactions
  add constraint transactions_category_user_fk
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id),
  add constraint transactions_card_user_fk
  foreign key (card_id, user_id)
  references public.credit_cards (id, user_id)
  on delete cascade,
  add constraint transactions_invoice_user_fk
  foreign key (invoice_id, user_id)
  references public.card_invoices (id, user_id)
  on delete set null (invoice_id),
  add constraint transactions_installment_user_fk
  foreign key (installment_id, user_id)
  references public.installments (id, user_id)
  on delete set null (installment_id),
  add constraint transactions_project_user_fk
  foreign key (project_id, user_id)
  references public.projects (id, user_id)
  on delete set null (project_id),
  add constraint transactions_property_user_fk
  foreign key (property_id, user_id)
  references public.real_estate_properties (id, user_id)
  on delete set null (property_id);

-- real_estate_amortizations -> property_id
alter table public.real_estate_amortizations
  drop constraint if exists real_estate_amortizations_property_id_fkey,
  drop constraint if exists real_estate_amortizations_property_user_fk;
alter table public.real_estate_amortizations
  add constraint real_estate_amortizations_property_user_fk
  foreign key (property_id, user_id)
  references public.real_estate_properties (id, user_id)
  on delete cascade;

-- goals -> account_id, category_id, asset_id
alter table public.goals
  drop constraint if exists goals_account_id_fkey,
  drop constraint if exists goals_category_id_fkey,
  drop constraint if exists goals_asset_fk,
  drop constraint if exists goals_account_user_fk,
  drop constraint if exists goals_category_user_fk,
  drop constraint if exists goals_asset_user_fk;

alter table public.goals
  add constraint goals_account_user_fk
  foreign key (account_id, user_id)
  references public.accounts (id, user_id)
  on delete set null (account_id),
  add constraint goals_category_user_fk
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id),
  add constraint goals_asset_user_fk
  foreign key (asset_id, user_id)
  references public.assets (id, user_id)
  on delete set null (asset_id);

-- assets -> goal_id, property_id
alter table public.assets
  drop constraint if exists assets_goal_id_fkey,
  drop constraint if exists assets_property_id_fkey,
  drop constraint if exists assets_goal_user_fk,
  drop constraint if exists assets_property_user_fk;

alter table public.assets
  add constraint assets_goal_user_fk
  foreign key (goal_id, user_id)
  references public.goals (id, user_id)
  on delete set null (goal_id),
  add constraint assets_property_user_fk
  foreign key (property_id, user_id)
  references public.real_estate_properties (id, user_id)
  on delete set null (property_id);

-- investment_transactions -> investment_id, account_id
alter table public.investment_transactions
  drop constraint if exists investment_transactions_investment_id_fkey,
  drop constraint if exists investment_transactions_account_id_fkey,
  drop constraint if exists investment_transactions_investment_user_fk,
  drop constraint if exists investment_transactions_account_user_fk;

alter table public.investment_transactions
  add constraint investment_transactions_investment_user_fk
  foreign key (investment_id, user_id)
  references public.investments (id, user_id)
  on delete cascade,
  add constraint investment_transactions_account_user_fk
  foreign key (account_id, user_id)
  references public.accounts (id, user_id)
  on delete set null (account_id);

-- =============================================================================
-- PARTE 5: REGRA 5 — NUNCA ACEITAR user_id DO CLIENTE (OBTIDO PELO JWT)
-- =============================================================================

create or replace function public.enforce_jwt_user_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  jwt_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if jwt_uid is not null then
      new.user_id := jwt_uid;
    elsif new.user_id is null then
      raise exception 'Usuário não autenticado (JWT ausente)';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Alteração de titularidade (user_id) não permitida';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts',
    'categories',
    'transactions',
    'credit_cards',
    'card_invoices',
    'installments',
    'projects',
    'real_estate_properties',
    'real_estate_amortizations',
    'goals',
    'assets',
    'investments',
    'investment_transactions',
    'liabilities'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_enforce_jwt_user_id', tbl);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.enforce_jwt_user_id()',
      tbl || '_enforce_jwt_user_id',
      tbl
    );
  end loop;
end;
$$;

-- =============================================================================
-- PARTE 6: REGRA 6 — ROW LEVEL SECURITY (RLS) E POLICIES EXPLÍCITAS EM TODAS AS
--          TABELAS E NO SUPABASE STORAGE
-- =============================================================================

alter table public.profiles                  enable row level security;
alter table public.audit_logs                enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- audit_logs
drop policy if exists audit_logs_select_own on public.audit_logs;
create policy audit_logs_select_own on public.audit_logs
  for select to authenticated using (user_id = (select auth.uid()));

-- Policies explícitas (SELECT, INSERT, UPDATE, DELETE) para todas as 14 tabelas com user_id
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts',
    'categories',
    'transactions',
    'credit_cards',
    'card_invoices',
    'installments',
    'projects',
    'real_estate_properties',
    'real_estate_amortizations',
    'goals',
    'assets',
    'investments',
    'investment_transactions',
    'liabilities'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      tbl || '_select_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      tbl || '_insert_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      tbl || '_update_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      tbl || '_delete_own',
      tbl
    );
  end loop;
end;
$$;

-- Princípio do Menor Privilégio (REVOKE ALL + GRANT mínimo)
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_audit() from public, anon, authenticated;

revoke all on
  public.profiles,
  public.accounts,
  public.categories,
  public.transactions,
  public.audit_logs,
  public.credit_cards,
  public.card_invoices,
  public.installments,
  public.projects,
  public.real_estate_properties,
  public.real_estate_amortizations,
  public.goals,
  public.assets,
  public.investments,
  public.investment_transactions,
  public.liabilities,
  public.account_balances,
  public.card_limits
from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete on
  public.accounts,
  public.categories,
  public.transactions,
  public.credit_cards,
  public.card_invoices,
  public.installments,
  public.projects,
  public.real_estate_properties,
  public.real_estate_amortizations,
  public.goals,
  public.assets,
  public.investments,
  public.investment_transactions,
  public.liabilities
to authenticated;

grant select on
  public.audit_logs,
  public.account_balances,
  public.card_limits
to authenticated;

-- Supabase Storage: Bucket privado user-attachments + RLS em storage.objects
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'user-attachments',
    'user-attachments',
    false,
    5242880, -- 5 MB
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  )
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists storage_objects_select_own on storage.objects';
  execute $pol$
    create policy storage_objects_select_own on storage.objects
      for select to authenticated
      using (
        bucket_id = 'user-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $pol$;

  execute 'drop policy if exists storage_objects_insert_own on storage.objects';
  execute $pol$
    create policy storage_objects_insert_own on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'user-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $pol$;

  execute 'drop policy if exists storage_objects_update_own on storage.objects';
  execute $pol$
    create policy storage_objects_update_own on storage.objects
      for update to authenticated
      using (
        bucket_id = 'user-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'user-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $pol$;

  execute 'drop policy if exists storage_objects_delete_own on storage.objects';
  execute $pol$
    create policy storage_objects_delete_own on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'user-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $pol$;
exception
  when insufficient_privilege or undefined_table then
    raise notice 'Storage schema/table não editável pelo role atual; policies de tabelas públicas aplicadas normalmente.';
end;
$$;

commit;
