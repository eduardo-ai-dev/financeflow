-- =============================================================================
-- FinanceFlow — Migração 0004: Metas, Wishlist e Ativos Patrimoniais (Fase 5)
--
-- Regra de Negócio 1 (README):
--   Separação clara entre Caixa, Patrimônio e Objetivos.
--   Fluxo de conversão de meta comprada diretamente em ativo patrimonial.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. goals — Metas financeiras e lista de compras (Wishlist)
-- -----------------------------------------------------------------------------
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

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. assets — Ativos e bens patrimoniais
-- -----------------------------------------------------------------------------
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

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- Vincula a FK de asset_id em goals
alter table public.goals drop constraint if exists goals_asset_fk;
alter table public.goals
  add constraint goals_asset_fk foreign key (asset_id) references public.assets (id) on delete set null;

-- -----------------------------------------------------------------------------
-- 3. Triggers de Auditoria
-- -----------------------------------------------------------------------------
drop trigger if exists goals_audit on public.goals;
create trigger goals_audit
  after insert or update or delete on public.goals
  for each row execute function public.log_audit();

drop trigger if exists assets_audit on public.assets;
create trigger assets_audit
  after insert or update or delete on public.assets
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.goals enable row level security;
alter table public.assets enable row level security;

-- goals
create policy goals_select_own on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy goals_insert_own on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy goals_update_own on public.goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy goals_delete_own on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- assets
create policy assets_select_own on public.assets
  for select to authenticated using (user_id = (select auth.uid()));
create policy assets_insert_own on public.assets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy assets_update_own on public.assets
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy assets_delete_own on public.assets
  for delete to authenticated using (user_id = (select auth.uid()));
