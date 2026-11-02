-- =============================================================================
-- FinanceFlow — Migração 0002: Cartões de Crédito, Faturas e Parcelamentos (Fase 3)
--
-- Regra de Negócio 3 (README):
--   Regime de Competência vs. Caixa nos Cartões:
--   Uma compra no cartão de crédito (kind = 'card_purchase') gera uma obrigação
--   na fatura (card_invoices) e consome limite imediatamente.
--   O pagamento da fatura (kind = 'invoice_payment') debita a conta bancária de origem
--   sem duplicar despesas nas categorias de consumo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. credit_cards — Cartões de crédito do usuário
-- -----------------------------------------------------------------------------
create table if not exists public.credit_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  institution      text check (institution is null or char_length(institution) <= 80),
  brand            text not null default 'mastercard' check (brand in ('mastercard', 'visa', 'elo', 'amex', 'hipercard', 'other')),
  limit_amount     numeric(14,2) not null check (limit_amount > 0),
  closing_day      int not null check (closing_day between 1 and 31),
  due_day          int not null check (due_day between 1 and 31),
  color            text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  default_account_id uuid references public.accounts (id) on delete set null,
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint credit_cards_id_user_key unique (id, user_id)
);

create unique index if not exists credit_cards_user_name_key
  on public.credit_cards (user_id, lower(name));

create trigger credit_cards_set_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. card_invoices — Faturas mensais de cartão de crédito
-- -----------------------------------------------------------------------------
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

create trigger card_invoices_set_updated_at
  before update on public.card_invoices
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. installments — Central unificada de compras e compromissos parcelados
-- -----------------------------------------------------------------------------
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

create trigger installments_set_updated_at
  before update on public.installments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Alterações na tabela transactions para suportar cartões e parcelamentos
-- -----------------------------------------------------------------------------

-- Permite account_id nulo para compras no cartão (kind = 'card_purchase')
alter table public.transactions alter column account_id drop not null;

-- Adiciona colunas para relacionamento com cartão, fatura e parcelamento
alter table public.transactions
  add column if not exists card_id uuid references public.credit_cards (id) on delete cascade,
  add column if not exists invoice_id uuid references public.card_invoices (id) on delete set null,
  add column if not exists installment_id uuid references public.installments (id) on delete set null,
  add column if not exists installment_number int;

-- Ajusta a constraint de check do kind para aceitar 'card_purchase' e 'invoice_payment'
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

-- Ajusta forma por tipo (contas e cartões)
alter table public.transactions drop constraint if exists transactions_accounts_shape;
alter table public.transactions add constraint transactions_accounts_shape check (
  -- Receita e despesa comum: conta obrigatória, to_account nulo, cartão nulo
  (kind in ('income', 'expense') and account_id is not null and to_account_id is null and card_id is null)
  -- Movimentação entre contas próprias
  or (kind in ('transfer', 'investment_contribution', 'investment_redemption')
      and account_id is not null and to_account_id is not null and to_account_id <> account_id and card_id is null)
  -- Compra no cartão de crédito: cartão obrigatório, conta de banco nula, to_account nulo
  or (kind = 'card_purchase' and card_id is not null and account_id is null and to_account_id is null)
  -- Pagamento de fatura: conta de banco devedora obrigatória, cartão devedor obrigatório, to_account nulo
  or (kind = 'invoice_payment' and account_id is not null and card_id is not null and to_account_id is null)
);

-- Ajusta permissão de categoria:
-- Categoria é permitida para income, expense e card_purchase (consumo).
-- Categoria NUNCA é permitida em transferências nem em pagamentos de fatura (evita duplicidade - Regra 3).
alter table public.transactions drop constraint if exists transactions_category_only_cash_flow;
alter table public.transactions add constraint transactions_category_only_cash_flow check (
  category_id is null or kind in ('income', 'expense', 'card_purchase')
);

-- Índices adicionais para performance em faturas e cartões
create index if not exists transactions_card_idx on public.transactions (card_id) where card_id is not null;
create index if not exists transactions_invoice_idx on public.transactions (invoice_id) where invoice_id is not null;
create index if not exists transactions_installment_idx on public.transactions (installment_id) where installment_id is not null;

-- -----------------------------------------------------------------------------
-- 5. Atualização da View account_balances
--
-- Apenas movimentações em contas bancárias alteram account_balances.
-- Compras a crédito (kind = 'card_purchase') NÃO alteram account_balances (account_id é null).
-- Pagamento de fatura (kind = 'invoice_payment') subtrai da conta bancária devedora.
-- -----------------------------------------------------------------------------
create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id       as account_id,
  a.user_id,
  a.opening_balance,
  a.opening_balance + coalesce(m.completed, 0)                      as current_balance,
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

-- -----------------------------------------------------------------------------
-- 6. View card_limits — Limite total, utilizado e disponível por cartão
--
-- Limite utilizado = soma de card_purchase pendentes ou em faturas não pagas.
-- -----------------------------------------------------------------------------
create or replace view public.card_limits
with (security_invoker = true)
as
select
  c.id as card_id,
  c.user_id,
  c.name,
  c.limit_amount,
  coalesce(used.total_used, 0) as used_amount,
  c.limit_amount - coalesce(used.total_used, 0) as available_limit
from public.credit_cards c
left join lateral (
  select sum(t.amount) as total_used
  from public.transactions t
  left join public.card_invoices inv on t.invoice_id = inv.id
  where t.card_id = c.id
    and t.kind = 'card_purchase'
    and (inv.status is null or inv.status in ('open', 'closed', 'overdue'))
) used on true;

-- -----------------------------------------------------------------------------
-- 7. Triggers de Auditoria para as novas tabelas
-- -----------------------------------------------------------------------------
drop trigger if exists credit_cards_audit on public.credit_cards;
create trigger credit_cards_audit
  after insert or update or delete on public.credit_cards
  for each row execute function public.log_audit();

drop trigger if exists card_invoices_audit on public.card_invoices;
create trigger card_invoices_audit
  after insert or update or delete on public.card_invoices
  for each row execute function public.log_audit();

drop trigger if exists installments_audit on public.installments;
create trigger installments_audit
  after insert or update or delete on public.installments
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- 8. Row Level Security para as novas tabelas
-- -----------------------------------------------------------------------------
alter table public.credit_cards enable row level security;
alter table public.card_invoices enable row level security;
alter table public.installments enable row level security;

-- credit_cards
create policy credit_cards_select_own on public.credit_cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy credit_cards_insert_own on public.credit_cards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy credit_cards_update_own on public.credit_cards
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy credit_cards_delete_own on public.credit_cards
  for delete to authenticated using (user_id = (select auth.uid()));

-- card_invoices
create policy card_invoices_select_own on public.card_invoices
  for select to authenticated using (user_id = (select auth.uid()));
create policy card_invoices_insert_own on public.card_invoices
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy card_invoices_update_own on public.card_invoices
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy card_invoices_delete_own on public.card_invoices
  for delete to authenticated using (user_id = (select auth.uid()));

-- installments
create policy installments_select_own on public.installments
  for select to authenticated using (user_id = (select auth.uid()));
create policy installments_insert_own on public.installments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy installments_update_own on public.installments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy installments_delete_own on public.installments
  for delete to authenticated using (user_id = (select auth.uid()));
