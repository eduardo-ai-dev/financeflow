-- =============================================================================
-- FinanceFlow — Migração 0006: Gasto inicial informado no cartão de crédito
--
-- Permite ao usuário cadastrar um cartão informando o limite total e quanto
-- já foi gasto (valor anterior ao uso do app). O disponível é calculado:
--
--   usado      = initial_used_amount + compras (card_purchase) em faturas não pagas
--   disponível = limit_amount - usado
--
-- Regra de Negócio 3 (README): o valor inicial apenas consome limite; NÃO cria
-- transação de despesa, portanto não distorce o fluxo de caixa nem duplica
-- consumo quando a fatura for paga.
-- =============================================================================

alter table public.credit_cards
  add column if not exists initial_used_amount numeric(14,2) not null default 0
  check (initial_used_amount >= 0);

-- Recria a view incluindo o gasto inicial no limite utilizado.
-- Colunas e tipos permanecem idênticos aos da migração 0002.
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

