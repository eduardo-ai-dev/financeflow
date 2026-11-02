-- =============================================================================
-- FinanceFlow — Migração 0005: Investimentos, Proventos e Balanço Patrimonial (Fase 6)
--
-- Regra de Negócio 4 (README):
--   Aporte em Investimento NÃO é despesa de consumo.
--   Transferência de liquidez imediata para liquidez investida (patrimônio neutro).
--
-- Regra de Negócio 1 (README):
--   Balanço Patrimonial Real:
--   Patrimônio Líquido = (Caixa Livre + Investimentos + Ativos/Bens + Imóveis)
--                       - (Financiamentos + Passivos/Dívidas + Faturas)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. investments — Posições e Carteira de Investimentos
-- -----------------------------------------------------------------------------
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

create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. investment_transactions — Movimentações (Aportes, Resgates, Proventos)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. liabilities — Passivos e Obrigações (Empréstimos, Dívidas, etc.)
-- -----------------------------------------------------------------------------
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

create trigger liabilities_set_updated_at
  before update on public.liabilities
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Triggers de Auditoria
-- -----------------------------------------------------------------------------
drop trigger if exists investments_audit on public.investments;
create trigger investments_audit
  after insert or update or delete on public.investments
  for each row execute function public.log_audit();

drop trigger if exists investment_transactions_audit on public.investment_transactions;
create trigger investment_transactions_audit
  after insert or update or delete on public.investment_transactions
  for each row execute function public.log_audit();

drop trigger if exists liabilities_audit on public.liabilities;
create trigger liabilities_audit
  after insert or update or delete on public.liabilities
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.investments enable row level security;
alter table public.investment_transactions enable row level security;
alter table public.liabilities enable row level security;

-- investments
create policy investments_select_own on public.investments
  for select to authenticated using (user_id = (select auth.uid()));
create policy investments_insert_own on public.investments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy investments_update_own on public.investments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy investments_delete_own on public.investments
  for delete to authenticated using (user_id = (select auth.uid()));

-- investment_transactions
create policy investment_transactions_select_own on public.investment_transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy investment_transactions_insert_own on public.investment_transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy investment_transactions_update_own on public.investment_transactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy investment_transactions_delete_own on public.investment_transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- liabilities
create policy liabilities_select_own on public.liabilities
  for select to authenticated using (user_id = (select auth.uid()));
create policy liabilities_insert_own on public.liabilities
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy liabilities_update_own on public.liabilities
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy liabilities_delete_own on public.liabilities
  for delete to authenticated using (user_id = (select auth.uid()));
