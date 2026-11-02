# FinanceFlow — Plano de Implementação

## Objetivo
Construir o FinanceFlow (README.md) de forma incremental: SPA React + TS + Vite, Supabase como backend, com um motor financeiro que respeita as 7 regras de negócio do README.

> Seguindo a skill `plan-writing` (máx. ~10 tarefas por plano): este arquivo traz o **roadmap macro** e os planos detalhados das fases.

---

## 1. Decisões técnicas (skills `app-builder`, `tailwind-patterns`, `react-best-practices`, `api-patterns`)

| Área | Escolha | Por quê |
|---|---|---|
| Scaffold | `npm.cmd create vite@latest ./ -- --template react-ts` | Stack do README (o `npm.ps1` está bloqueado pela ExecutionPolicy → usar `npm.cmd`/`npx.cmd`) |
| Estilo | Tailwind CSS **v4** (CSS-first `@theme`) + shadcn/ui + Lucide | Skill `tailwind-patterns`; shadcn com radix-nova |
| Rotas | React Router + `lazy()` por módulo | Bundle pequeno (cada módulo da sidebar carrega sob demanda) |
| Dados | `@supabase/supabase-js` + TanStack Query | Cache/deduplicação, sem waterfalls |
| API | Sem REST próprio: queries diretas + **RPC Postgres** p/ operações atômicas | Transferência, pagamento de fatura e parcelamento precisam ser transacionais |
| Forms | React Hook Form + Zod | Validação tipada |
| Datas/moeda | `date-fns` (ptBR) + `Intl.NumberFormat('pt-BR', BRL)` | `DD/MM/AAAA` e `R$` |
| Gráficos | Recharts | README |
| Testes | Vitest (motor financeiro) + Playwright (fluxos críticos) | Skill `testing-patterns` |
| Qualidade | oxlint + `tsc --noEmit` após cada mudança | Skill `lint-and-validate` |

## 2. Princípios do banco (skill `database-design`)
- PK `uuid`, `created_at/updated_at TIMESTAMPTZ`, `user_id` + **RLS em todas as tabelas**.
- Dinheiro em `numeric(14,2)` no banco; no front, cálculos em **centavos inteiros** (nada de float).
- **Saldos nunca armazenados** → calculados por *view* (`account_balances`) a partir das transações.
- Tabela única `transactions` com `kind` (`income`, `expense`, `transfer`, `card_purchase`, `invoice_payment`, `investment_contribution`…) → transferências e aportes ficam fora de receita/despesa por construção (Regras 2 e 4).
- Compra no cartão vincula a `card_invoices`; pagamento da fatura é `invoice_payment` (não é despesa) → sem duplicidade (Regra 3).
- Simulações em tabelas próprias (`scenarios`, `scenario_events`) sem FK de escrita nas tabelas reais (Regra 5).
- `audit_logs` via trigger. Índices em `(user_id, date)`, `(account_id)`, `(invoice_id)`.

## 3. Roadmap (igual ao README)
1. **Fundação** (Concluída)
2. **Contas, categorias, entradas, saídas, transferências** (Concluída)
3. **Cartões, faturas, recorrências, parcelamentos** (Em andamento / Código pronto)
4. Projetos + módulo imobiliário (SAC/Price, INCC, amortizações)
5. Metas & Wishlist (conversão em ativo)
6. Investimentos + balanço patrimonial
7. Planejamento futuro (sandbox de cenários)
8. Relatórios, calendário, alertas, import/export

---

## 4. Fase 1 — Fundação (Concluída)
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

## Pronto quando (Fase 1)
- [x] Usuário consegue se cadastrar, logar, navegar por todos os módulos, trocar tema, e o Dashboard lê dados reais (vazios) do Supabase com RLS ativa.

---

## 5. Fase 2 — Motor de Contas e Fluxo de Caixa (Concluída)
- [x] **T2.1** Instalar componentes shadcn essenciais (dialog, tabs, select, dropdown-menu) e Recharts → Verify: imports e build sem erros
- [x] **T2.2** CRUD completo de Contas Financeiras na tela `/contas` (listar com saldo calculado da view `account_balances`, criar conta com saldo inicial, editar e arquivar) → Verify: criar 2 contas e visualizar saldos
- [x] **T2.3** Gestão de Categorias e Subcategorias com seed opcional de categorias padrão no primeiro uso → Verify: listar e criar categorias com cores e ícones
- [x] **T2.4** Modal de Lançamento Rápido Unificado "+ Novo Lançamento" acessível no header/sidebar (Receita, Despesa e Transferência com máscara BRL) → Verify: submeter lançamentos com validação Zod
- [x] **T2.5** Módulo de Entradas na tela `/entradas` (tabela de receitas com filtros por status, busca por texto e ação rápida de marcar como recebido) → Verify: lançar entrada e efetivar
- [x] **T2.6** Módulo de Saídas na tela `/saidas` (tabela de despesas com filtros, ordenação e ação rápida de marcar como pago) → Verify: lançar despesa e efetivar
- [x] **T2.7** Motor de Transferência Neutra entre contas (Regra 2) → Verify: transferir valor entre contas, saldos atualizam e receita/despesa do mês permanecem inalteradas
- [x] **T2.8** Módulo de Resumo Financeiro na tela `/resumo` com gráfico Recharts de Entradas vs. Saídas do mês e taxa de poupança → Verify: gráfico renderiza comparativo real
- [x] **T2.9** Integração reativa com o Dashboard: os KPI cards atualizam em tempo real após cada lançamento e transferência → Verify: Dashboard reflete novo saldo e receitas/despesas
- [x] **T2.10** Verificação final da Fase 2: testes Vitest, `npm.cmd run lint`, `npx.cmd tsc --noEmit` e build de produção → Verify: tudo aprovado sem erros

## Pronto quando (Fase 2)
- [x] Usuário gerencia suas contas, categoriza receitas e despesas, transfere saldos entre contas sem distorcer o fluxo de caixa (Regra 2) e acompanha o fluxo de caixa no Resumo e Dashboard.

---

## 6. Fase 3 — Cartões de Crédito, Faturas e Parcelamentos (tarefas)
- [x] **T3.1** Migração SQL `0002_cards_and_installments.sql`: tabelas `credit_cards`, `card_invoices`, `installments`, colunas em `transactions`, views `account_balances` e `card_limits`, triggers e RLS → Verify: arquivo SQL gerado e validado
- [x] **T3.2** Esquemas de validação Zod (`src/lib/validations/card.ts`, `installment.ts`) e tipos atualizados em `database.ts` → Verify: tipos e imports sem erros
- [x] **T3.3** Camada de serviços (`src/services/cards.ts`, `invoices.ts`, `installments.ts`) e hooks TanStack Query (`useCards`, `useInvoices`, `useInstallments`) → Verify: mutations com invalidação de cache
- [x] **T3.4** Tela de Cartões de Crédito em `/cartoes`: listagem visual estilo cartão físico, limites disponíveis/utilizados, barra de progresso e modal de criação/edição (`CardDialog`) → Verify: renderiza cartões com cores e bandeiras
- [x] **T3.5** Gestão e Quitação de Faturas: listagem de faturas (abertas, fechadas, pagas) e fluxo de "Pagar Fatura" com escolha da conta bancária de débito sem gerar duplicidade contábil (Regra 3) → Verify: quitação debita conta sem criar despesa de consumo
- [x] **T3.6** Central de Parcelamentos em `/parcelamentos`: visão consolidada de parcelamentos com ou sem cartão, barra de progresso de parcelas (ex.: 5/12 - 42%), saldo devedor restante e cancelamento de parcelas futuras → Verify: cálculo de parcelas pagas e restantes
- [x] **T3.7** Testes unitários do motor de cartões e parcelamentos no Vitest (`cards-and-installments.test.ts`) → Verify: 45/45 testes aprovados
- [x] **T3.8** Verificação final da Fase 3: `npm.cmd run lint` (0 erros), `npx.cmd tsc --noEmit` (0 erros) e `npm.cmd run build` (sucesso) → Verify: build de produção concluído com êxito

## Pronto quando (Fase 3)
- [x] O usuário cadastra cartões de crédito, acompanha a utilização do limite, visualiza e quita faturas mensais (sem duplicar despesas, respeitando a Regra 3) e gerencia todos os parcelamentos ativos com cronograma de encerramento.

## Observações do ambiente
- Node v24 e Git OK. **Docker não instalado** → Supabase local (CLI) inviável; usar **projeto Supabase na nuvem**.
- PowerShell bloqueia `npm.ps1` → usar sempre `npm.cmd` / `npx.cmd`.
