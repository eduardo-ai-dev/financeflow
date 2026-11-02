-- =============================================================================
-- FinanceFlow — Migração 0001: núcleo financeiro (Fase 1 / T5)
--
-- Cria: profiles, accounts, categories, transactions, audit_logs,
--       view account_balances, triggers (updated_at, auditoria, novo usuário),
--       RLS em todas as tabelas e privilégios mínimos.
--
-- Como aplicar (sem Docker): Supabase → SQL Editor → colar este arquivo → Run.
-- O script é transacional: se algo falhar, nada é aplicado.
--
-- Decisões que sustentam as regras de negócio do README:
--  * Saldos NUNCA são armazenados: são calculados pela view account_balances
--    a partir de opening_balance + transações (Regras 2, 6 e 7).
--  * Transferências e aportes são linhas com origem (account_id) e destino
--    (to_account_id): movem saldo entre contas, mas não são receita/despesa,
--    pois só kind IN ('income','expense') entra em fluxo de caixa (Regras 2 e 4).
--  * Dinheiro em numeric(14,2). Valores são sempre positivos; o sinal vem do kind.
--  * Isolamento entre usuários em duas camadas: RLS + FKs compostas (id, user_id),
--    que impedem apontar para conta/categoria de outro usuário.
--  * kinds card_purchase / invoice_payment entram na Fase 3, junto com
--    cartões e faturas (precisam de FK para elas).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Funções utilitárias
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  locale      text not null default 'pt-BR',
  currency    text not null default 'BRL',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente no cadastro.
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

-- Usuários que já existam antes desta migração.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- accounts — contas financeiras (saldo é calculado, não armazenado)
-- -----------------------------------------------------------------------------
create table public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  institution      text check (institution is null or char_length(institution) <= 80),
  type             text not null check (type in (
                     'checking',   -- conta corrente
                     'savings',    -- poupança
                     'digital',    -- conta digital
                     'cash',       -- dinheiro em espécie
                     'wallet',     -- carteira digital
                     'brokerage',  -- corretora / investimento
                     'vault'       -- cofre / reserva
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

create unique index accounts_user_name_key on public.accounts (user_id, lower(name));

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories — categorias e subcategorias (hierarquia por parent_id)
-- -----------------------------------------------------------------------------
create table public.categories (
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
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id),
  -- A subcategoria pertence ao mesmo usuário e ao mesmo tipo (receita/despesa) do pai.
  constraint categories_parent_fk foreign key (parent_id, user_id, kind)
    references public.categories (id, user_id, kind) on delete cascade
);

create unique index categories_user_kind_parent_name_key
  on public.categories (user_id, kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index categories_user_parent_idx on public.categories (user_id, parent_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- transactions — tabela única de lançamentos
--
--   kind                      account_id (origem)   to_account_id (destino)   category
--   income                    conta que recebe      —                         receita
--   expense                   conta que paga        —                         despesa
--   transfer                  conta de saída        conta de entrada          —
--   investment_contribution   conta de saída        conta de investimento     —
--   investment_redemption     conta de investimento conta de entrada          —
--
--   status: pending (a receber/pagar; "atrasado" é derivado: pending e due_date < hoje),
--           completed (efetivado; só estes alteram o saldo atual), canceled.
-- -----------------------------------------------------------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind           text not null check (kind in (
                   'income', 'expense', 'transfer',
                   'investment_contribution', 'investment_redemption'
                 )),
  status         text not null default 'pending' check (status in ('pending', 'completed', 'canceled')),
  description    text not null check (char_length(btrim(description)) between 1 and 200),
  amount         numeric(14,2) not null check (amount > 0),
  account_id     uuid not null,
  to_account_id  uuid,
  category_id    uuid,
  -- Tipo esperado da categoria (usado pela FK composta abaixo).
  category_kind  text generated always as (case when kind in ('income', 'expense') then kind end) stored,
  due_date       date not null,   -- vencimento / competência
  paid_date      date,            -- data efetiva do recebimento / pagamento
  notes          text check (notes is null or char_length(notes) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Referências sempre dentro do mesmo usuário (e, para categoria, do mesmo tipo).
  constraint transactions_account_fk foreign key (account_id, user_id)
    references public.accounts (id, user_id),
  constraint transactions_to_account_fk foreign key (to_account_id, user_id)
    references public.accounts (id, user_id),
  constraint transactions_category_fk foreign key (category_id, user_id, category_kind)
    references public.categories (id, user_id, kind),

  -- Forma por tipo: receita/despesa têm só uma conta; movimentos entre contas têm origem ≠ destino.
  constraint transactions_accounts_shape check (
    (kind in ('income', 'expense') and to_account_id is null)
    or (kind in ('transfer', 'investment_contribution', 'investment_redemption')
        and to_account_id is not null and to_account_id <> account_id)
  ),
  -- Categoria só existe em fluxo de caixa (transferências/aportes não são consumo).
  constraint transactions_category_only_cash_flow check (
    category_id is null or kind in ('income', 'expense')
  ),
  -- Efetivado <=> tem data de pagamento/recebimento.
  constraint transactions_paid_date_matches_status check (
    (status = 'completed') = (paid_date is not null)
  )
);

create index transactions_user_due_date_idx on public.transactions (user_id, due_date desc);
create index transactions_user_paid_date_idx on public.transactions (user_id, paid_date desc) where paid_date is not null;
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create index transactions_category_idx on public.transactions (category_id) where category_id is not null;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- audit_logs — histórico imutável (escrito apenas por trigger)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);

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
  -- Atualização sem mudança real (só updated_at): não registra.
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;

  -- Exclusão em cascata da conta do usuário: o usuário já não existe, não há o que auditar.
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

create trigger accounts_audit
  after insert or update or delete on public.accounts
  for each row execute function public.log_audit();
create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.log_audit();
create trigger transactions_audit
  after insert or update or delete on public.transactions
  for each row execute function public.log_audit();

-- Funções de trigger não devem ser chamáveis como RPC pela API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_audit() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- account_balances — saldo calculado (nunca armazenado)
--
--   current_balance   = saldo inicial + movimentos EFETIVADOS (completed)
--   projected_balance = current_balance + movimentos pendentes (pending)
--
-- Receita soma; despesa e saída (origem) subtraem; entrada (destino) soma.
-- security_invoker: a view respeita a RLS de quem consulta.
-- -----------------------------------------------------------------------------
create view public.account_balances
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
           case when t.kind = 'income' then t.amount else -t.amount end as delta
    from public.transactions t
    where t.account_id = a.id and t.status in ('completed', 'pending')
    union all
    select t.status, t.amount
    from public.transactions t
    where t.to_account_id = a.id and t.status in ('completed', 'pending')
  ) x
) m on true;

-- -----------------------------------------------------------------------------
-- Row Level Security — cada usuário enxerga/altera apenas o que é seu
-- -----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs   enable row level security;

-- profiles: leitura e edição do próprio perfil (criação/remoção ficam com trigger/cascata)
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- accounts / categories / transactions: CRUD do próprio dado
create policy accounts_select_own on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy accounts_insert_own on public.accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy accounts_update_own on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy accounts_delete_own on public.accounts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy categories_select_own on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert_own on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy categories_update_own on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy categories_delete_own on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

create policy transactions_select_own on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy transactions_delete_own on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- audit_logs: somente leitura do próprio histórico
create policy audit_logs_select_own on public.audit_logs
  for select to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Privilégios mínimos (o Supabase concede ALL por padrão; aqui restringimos).
-- anon não acessa nada; authenticated só recebe o necessário (sem TRUNCATE, que ignora RLS).
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.accounts, public.categories,
              public.transactions, public.audit_logs, public.account_balances
  from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts, public.categories, public.transactions to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.account_balances to authenticated;

commit;

