# FinanceFlow — Plano de Implementação

## Objetivo
Construir o FinanceFlow (README.md) de forma incremental: SPA React + TS + Vite, Supabase como backend, com um motor financeiro que respeita as 7 regras de negócio do README.

> Seguindo a skill `plan-writing` (máx. ~10 tarefas por plano): este arquivo traz o **roadmap macro** e o **plano detalhado só da Fase 1**. Cada fase seguinte ganha seu próprio plano, aprovado antes de começar.

---

## 1. Decisões técnicas (skills `app-builder`, `tailwind-patterns`, `react-best-practices`, `api-patterns`)

| Área | Escolha | Por quê |
|---|---|---|
| Scaffold | `npm.cmd create vite@latest ./ -- --template react-ts` | Stack do README (o `npm.ps1` está bloqueado pela ExecutionPolicy → usar `npm.cmd`/`npx.cmd`) |
| Estilo | Tailwind CSS **v4** (CSS-first `@theme`) + shadcn/ui + Lucide | Skill `tailwind-patterns`; shadcn já suporta v4 |
| Rotas | React Router + `lazy()` por módulo | Bundle pequeno (cada módulo da sidebar carrega sob demanda) |
| Dados | `@supabase/supabase-js` + TanStack Query | Cache/deduplicação, sem waterfalls |
| API | Sem REST próprio: queries diretas + **RPC Postgres** p/ operações atômicas | Transferência, pagamento de fatura e parcelamento precisam ser transacionais |
| Forms | React Hook Form + Zod | Validação tipada |
| Datas/moeda | `date-fns` (ptBR) + `Intl.NumberFormat('pt-BR', BRL)` | `DD/MM/AAAA` e `R$` |
| Gráficos | Recharts | README |
| Testes | Vitest (motor financeiro) + Playwright (fluxos críticos) | Skill `testing-patterns` |
| Qualidade | ESLint + `tsc --noEmit` após cada mudança | Skill `lint-and-validate` |

## 2. Princípios do banco (skill `database-design`)
- PK `uuid`, `created_at/updated_at TIMESTAMPTZ`, `user_id` + **RLS em todas as tabelas**.
- Dinheiro em `numeric(14,2)` no banco; no front, cálculos em **centavos inteiros** (nada de float).
- **Saldos nunca armazenados** → calculados por *view* (`account_balances`) a partir das transações.
- Tabela única `transactions` com `kind` (`income`, `expense`, `transfer`, `card_purchase`, `invoice_payment`, `investment_contribution`…) → transferências e aportes ficam fora de receita/despesa por construção (Regras 2 e 4).
- Compra no cartão vincula a `card_invoices`; pagamento da fatura é `invoice_payment` (não é despesa) → sem duplicidade (Regra 3).
- Simulações em tabelas próprias (`scenarios`, `scenario_events`) sem FK de escrita nas tabelas reais (Regra 5).
- `audit_logs` via trigger. Índices em `(user_id, date)`, `(account_id)`, `(invoice_id)`.

## 3. Roadmap (igual ao README)
1. **Fundação** ← *plano detalhado abaixo*
2. Contas, categorias, entradas, saídas, transferências
3. Cartões, faturas, recorrências, parcelamentos
4. Projetos + módulo imobiliário (SAC/Price, INCC, amortizações)
5. Metas & Wishlist (conversão em ativo)
6. Investimentos + balanço patrimonial
7. Planejamento futuro (sandbox de cenários)
8. Relatórios, calendário, alertas, import/export

---

## 4. Fase 1 — Fundação (tarefas)
- [x] **T1** Scaffold Vite React-TS na raiz, `git init`, `.gitignore`, ESLint → Verify: `npm.cmd run dev` abre a página padrão
- [x] **T2** Instalar Tailwind v4 + shadcn/ui; criar `src/index.css` com tokens `@theme` (paleta, tipografia, raio, sombras) dark/light → Verify: botão shadcn renderiza com os tokens
- [x] **T3** Toggle Dark/Light (classe `.dark`, persistido em `localStorage`, Dark padrão) → Verify: alternar e recarregar mantém o tema
- [x] **T4** Cliente Supabase (`src/lib/supabase.ts`) + `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) → Verify: sessão consultada sem erro no console
- [x] **T5** Migração SQL inicial (`supabase/migrations/0001_core.sql`): `profiles`, `accounts`, `categories`, `transactions`, `audit_logs`, view `account_balances`, RLS → Verify: aplicar no SQL Editor do Supabase sem erros
- [x] **T6** Autenticação (login, cadastro, recuperar senha) + rota protegida → Verify: criar conta, logar, deslogar
- [x] **T7** Layout base: Sidebar recolhível com os 15 módulos (agrupados), header, roteamento lazy, páginas vazias com *empty state* → Verify: navegar por todos os módulos em desktop e mobile (drawer)
- [x] **T8** Utilitários `formatBRL`, `formatDate`, `toCents/fromCents` + testes Vitest → Verify: `npm.cmd test` verde
- [x] **T9** Estrutura do Dashboard: grid de KPI cards (skeleton + valores zerados vindos do banco, sem mock) → Verify: dashboard carrega com skeleton e depois R$ 0,00
- [x] **T10** Verificação final: `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, teste visual no navegador → Verify: tudo sem erros

## Pronto quando
- [x] Usuário consegue se cadastrar, logar, navegar por todos os módulos, trocar tema, e o Dashboard lê dados reais (vazios) do Supabase com RLS ativa.

## Observações do ambiente
- Node v24 e Git OK. **Docker não instalado** → Supabase local (CLI) inviável; usar **projeto Supabase na nuvem**.
- PowerShell bloqueia `npm.ps1` → usar sempre `npm.cmd` / `npx.cmd`.
