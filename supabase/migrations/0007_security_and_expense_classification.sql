-- =============================================================================
-- FinanceFlow — Migração 0007: Blindagem de Segurança (RLS/Grants/FKs Compostas,
-- Forçamento de JWT user_id, Políticas de Storage) e Classificação de Gastos
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Coluna expense_classification em transactions (conforme README.md)
-- -----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists expense_classification text;

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

-- -----------------------------------------------------------------------------
-- 2. Validação de protocolo seguro em goals.image_url (apenas http/https)
-- -----------------------------------------------------------------------------
alter table public.goals
  drop constraint if exists goals_image_url_protocol_check;

alter table public.goals
  add constraint goals_image_url_protocol_check check (
    image_url is null
    or image_url = ''
    or image_url ~* '^https?://'
  ) not valid;

-- -----------------------------------------------------------------------------
-- 3. Garantir UNIQUE (id, user_id) em todas as tabelas-alvo antes das FKs compostas
--    (Corrige o erro 42830 em public.categories, que em 0001 tinha apenas
--     unique (id, user_id, kind) e não unique (id, user_id))
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Chaves Estrangeiras Compostas (id, user_id) para isolamento multi-tenant
-- -----------------------------------------------------------------------------

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

-- transactions -> card_id, invoice_id, installment_id, project_id, property_id
alter table public.transactions
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

-- -----------------------------------------------------------------------------
-- 5. Regra 5: Nunca aceitar user_id vindo do cliente — sempre obter pelo JWT
--    Trigger que sobrescreve NEW.user_id com auth.uid() no INSERT e bloqueia
--    qualquer tentativa de troca de titularidade (user_id) no UPDATE.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. Princípio do Menor Privilégio (REVOKE ALL + GRANT mínimo para authenticated)
-- -----------------------------------------------------------------------------
revoke all on table
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
from anon, authenticated;

grant select, insert, update, delete on table
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

revoke all on table public.card_limits from anon, authenticated;
grant select on table public.card_limits to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Regra 6: Supabase Storage com RLS e Policies Explícitas por Usuário
--    Cada usuário só pode ler/gravar/atualizar/excluir arquivos dentro da
--    sua própria pasta: user-attachments/<auth.uid()>/<arquivo>
-- -----------------------------------------------------------------------------
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
