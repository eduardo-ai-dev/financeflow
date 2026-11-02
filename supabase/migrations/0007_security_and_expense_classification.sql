-- =============================================================================
-- FinanceFlow — Migração 0007: Blindagem de Segurança (RLS/Grants/FKs Compostas)
-- e Classificação de Gastos (Fixa, Variável, Eventual, Extraordinária)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna expense_classification em transactions (conforme README.md)
-- -----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists expense_classification text
  check (
    expense_classification is null
    or expense_classification in ('fixed', 'variable', 'occasional', 'extraordinary')
  );

-- Restringe expense_classification apenas para despesas e compras no cartão
alter table public.transactions
  drop constraint if exists transactions_expense_classification_check;

alter table public.transactions
  add constraint transactions_expense_classification_check check (
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
  );

-- -----------------------------------------------------------------------------
-- 3. Chaves Estrangeiras Compostas (id, user_id) para isolamento multi-tenant
--    Garante no nível do SGBD que nenhuma tabela referencie registros de outro
--    usuário, mesmo em caso de tentativa de manipulação direta via API.
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
-- 4. Princípio do Menor Privilégio (REVOKE ALL + GRANT mínimo para authenticated)
--    Remove TRUNCATE, REFERENCES, TRIGGER e bloqueia completamente o role anon
--    em todas as tabelas e views criadas nas Fases 3 a 6.
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
