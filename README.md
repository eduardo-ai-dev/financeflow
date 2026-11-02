# FinanceFlow — Plataforma de Gestão Financeira Pessoal e Patrimonial

> **Sua vida financeira em um só lugar.**  
> Uma plataforma web completa de gestão financeira pessoal, controle patrimonial e planejamento estratégico de longo prazo, unificando fluxo de caixa, contas, cartões, parcelamentos, investimentos, aquisição imobiliária, múltiplos projetos e simulações de cenários futuros.

---

## 1. Visão Geral e Proposta de Valor

O **FinanceFlow** não é apenas um aplicativo de registro de despesas, mas uma **central financeira integrada e altamente personalizável**. O sistema foi desenhado para responder de forma precisa e em tempo real às perguntas mais críticas da vida financeira do usuário:

- *Quanto realmente vale o meu patrimônio líquido hoje?*
- *Quanto da minha renda futura já está comprometida com parcelas e dívidas?*
- *Qual é a minha real capacidade de poupança e aporte nos próximos meses?*
- *Quando conseguirei comprar determinado bem sem comprometer minha liquidez?*
- *Quanto custará meu imóvel até a entrega das chaves e ao final do financiamento?*
- *Qual será minha situação financeira e patrimonial daqui a $1$, $3$ ou $5$ anos?*

### Os 3 Pilares do Sistema
1. **Separação clara entre Caixa, Patrimônio e Objetivos:** Dinheiro investido não é saldo livre para consumo; um imóvel de $\text{R\$ } 300.000$ com dívida de $\text{R\$ } 250.000$ representa $\text{R\$ } 50.000$ de patrimônio líquido, e não $\text{R\$ } 300.000$.
2. **Interconectividade Total (Single Source of Truth):** Os módulos conversam entre si. Registrar a parcela de um imóvel atualiza automaticamente o fluxo de caixa futuro, o painel do projeto imobiliário, o passivo patrimonial e os compromissos do mês — sem recadastro manual.
3. **Personalização Modular:** O usuário não fica preso a categorias engessadas; ele pode criar múltiplos projetos, campos personalizados, cofres, categorias, subcategorias e adaptar o dashboard à própria realidade.

---

## 2. Stack Tecnológica e Padrões de UI/UX

### Stack Recomendada
- **Front-end:** React + TypeScript + Vite
- **Estilização e Componentes:** Tailwind CSS + shadcn/ui + Lucide Icons
- **Visualização de Dados:** Recharts (gráficos interativos e responsivos)
- **Back-end & BaaS:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Storage para anexos/comprovantes)
- **Versionamento:** Git / GitHub

### Diretrizes de Interface (UI/UX)
- **Estética:** Identidade visual de fintech premium — moderna, sofisticada, minimalista e limpa.
- **Temas:** *Dark Mode* nativo como tema principal, com suporte completo a *Light Mode*.
- **Navegação:** *Sidebar* lateral expansível/recolhível organizada por módulos lógicos.
- **Interatividade:** Cards personalizáveis no dashboard, tabelas avançadas (filtros múltiplos, ordenação, busca textual e paginação), modais ágeis para lançamentos rápidos e animações suaves de transição.
- **Localização:** Formatação monetária padrão brasileiro ($\text{BRL - R\$}$) e datas no formato `DD/MM/AAAA`.
- **Responsividade:** Layout $100\%$ adaptado para Desktop, Tablet e Mobile.

---

## 3. Regras de Negócio Inegociáveis (Core Financial Engine)

Para garantir consistência contábil e financeira, o banco de dados e a camada de serviços devem respeitar estritamente as seguintes regras:

1. **Rastreabilidade Total:** Toda transação deve ter origem, destino, data, status e vínculo claro.
2. **Neutralidade de Transferências:** Transferências entre contas próprias alteram apenas o saldo das contas envolvidas; **nunca** devem ser somadas como receita ou despesa do mês.
3. **Regime de Competência vs. Caixa nos Cartões:** Uma compra no cartão de crédito gera uma obrigação na fatura e impacta o limite imediatamente. O pagamento da fatura quita a obrigação com o saldo da conta bancária, **sem duplicar** as despesas já lançadas nas categorias de consumo.
4. **Aportes não são Despesas de Consumo:** Aportes em investimentos representam conversão de caixa em ativo financeiro (transferência patrimonial), sendo contabilizados na taxa de poupança/investimento, e não como gasto de vida.
5. **Isolamento de Simulações:** O módulo de Planejamento Futuro (cenários) deve operar em camadas de simulação (*sandbox*) sem alterar os registros financeiros reais do usuário.
6. **Cálculo Patrimonial Exato:** O Patrimônio Líquido deve ser sempre calculado dinamicamente pela fórmula:
   $$\text{Patrimônio Líquido} = \sum \text{Ativos} - \sum \text{Passivos}$$
7. **Persistência Real:** Nenhum dado fictício (*mock*) deve ser misturado às contas reais do usuário. Todas as operações devem persistir no PostgreSQL via Supabase.

---

## 4. Arquitetura de Módulos e Escopo Funcional

### 4.1. Navegação Principal (Sidebar)
| Módulo | Funcionalidade Central |
| :--- | :--- |
| **Dashboard** | Visão executiva consolidada da vida financeira e patrimonial |
| **Resumo Financeiro** | Análise detalhada do fluxo de caixa (receitas vs. despesas) |
| **Contas** | Gestão de bancos, carteiras, espécie e liquidez imediata |
| **Entradas** | Controle de salários, rendimentos, bônus e contas a receber |
| **Saídas** | Controle de despesas fixas, variáveis, eventuais e contas a pagar |
| **Cartões** | Gestão de limites, faturas atuais/futuras e compras no crédito |
| **Parcelamentos** | Central unificada de compromissos parcelados (com ou sem cartão) |
| **Projetos** | Gestão de grandes objetivos isolados (carro, reforma, viagens, etc.) |
| **Imóveis** | Módulo especializado para aquisição, obra e financiamento imobiliário |
| **Metas & Compras** | Lista de desejos, reservas carimbadas e objetivos financeiros |
| **Investimentos** | Carteira de ativos, rentabilidade, dividendos e metas de aporte |
| **Patrimônio** | Balanço patrimonial completo (Bens/Ativos vs. Dívidas/Passivos) |
| **Planejamento Futuro** | Simulador estratégico de cenários e fluxo de caixa projetado |
| **Relatórios** | Indicadores avançados, comparativos temporais e exportação |
| **Configurações** | Categorias, campos customizados, alertas, importação e perfil |

---

### 4.2. Dashboard — Painel Principal
Visão executiva que responde ao estado atual do usuário sem exigir cliques extras.

- **KPIs Principais (Cards Customizáveis):**
  - Patrimônio líquido total
  - Saldo total em contas e Dinheiro disponível (liquidez imediata)
  - Total investido e Valor reservado para metas/objetivos
  - Total de entradas no mês, Total de saídas no mês e Saldo mensal
  - Total de dívidas ativas e Percentual de comprometimento da renda
- **Gráficos Interativos:**
  - Evolução patrimonial mensal (linha/área)
  - Entradas vs. Saídas (barras comparativas)
  - Distribuição de despesas por categoria (rosca/pizza)
  - Evolução da carteira de investimentos e Distribuição do patrimônio
  - Projeção financeira dos próximos $12$ meses
- **Customização:** O usuário pode exibir/ocultar cards, reordenar o layout, filtrar por período (mês, trimestre, ano, personalizado) e comparar períodos.

---

### 4.3. Gestão de Contas e Movimentações

#### Contas Financeiras
- **Tipos suportados:** Conta corrente, poupança, conta digital, dinheiro em espécie, carteiras digitais, contas de corretora/investimento e cofres/reservas financeiras.
- **Atributos:** Nome da instituição, apelido da conta, saldo inicial, saldo atual (calculado), tipo, data de abertura, cor e ícone.
- **Operações:** Transferência direta entre contas e conciliação de saldo.

#### Entradas (Receitas) e Saídas (Despesas)
- **Atributos de Entrada:** Descrição, valor, categoria/subcategoria, conta de destino, data de recebimento, recorrência (única, mensal, anual, etc.), status (*Recebido, Pendente, Atrasado*), observações e upload de anexos (ex.: holerite, recibo).
- **Atributos de Saída:** Descrição, valor, classificação (*Fixa, Variável, Extraordinária, Eventual*), categoria/subcategoria, conta de origem ou cartão, data de vencimento, data de pagamento, recorrência, nível de prioridade, status (*Pago, Pendente, Atrasado*), vínculo opcional com Projeto/Imóvel e anexo de comprovante/boleto.

---

### 4.4. Cartões de Crédito e Central de Parcelamentos

#### Cartões de Crédito
- **Atributos:** Instituição/bandeira, limite total, limite utilizado, limite disponível, dia de fechamento, dia de vencimento, fatura aberta, faturas futuras, compras parceladas vinculadas e histórico de pagamentos de faturas.

#### Central de Parcelamentos (Módulo Independente)
Visão consolidada de todos os parcelamentos ativos (no cartão de crédito, carnês, financiamentos ou acordos diretos).
- **Cálculos Automáticos por Compra:**
  - Valor total da compra e Valor de cada parcela
  - Progresso visual (ex.: `5/12` — $42\%$)
  - Parcelas pagas vs. Parcelas restantes
  - Total financeiro ainda comprometido
  - Data exata prevista para o encerramento do compromisso

---

### 4.5. Projetos Financeiros Independentes
Permite isolar o planejamento e a execução financeira de grandes objetivos sem misturá-los à rotina doméstica, mas mantendo o vínculo com o caixa central.
- **Exemplos de Uso:** *Compra de veículo, Reforma residencial, Viagem internacional, Casamento, Construção de Home Office.*
- **Estrutura do Projeto:**
  - Nome, descrição, imagem de capa e status
  - Valor total estimado (Orçamento) vs. Orçamento disponível
  - Valor já investido/reservado, Despesas realizadas e Despesas futuras previstas
  - Receitas carimbadas/destinadas exclusivamente ao projeto
  - Cronograma de pagamentos, metas internas, documentos anexos e indicador de progresso ($\%$)
  - **Vínculo inteligente:** Associar transações reais já existentes ao projeto sem duplicar lançamentos no banco de dados.

---

### 4.6. Módulo Especial: Aquisição e Gestão Imobiliária
Módulo dedicado à complexidade financeira da compra de imóveis (na planta, em construção ou prontos).

1. **Dados da Aquisição:** Empreendimento, construtora, unidade/bloco, valor total de contrato, data da compra, previsão de entrega das chaves, status da obra e valor de avaliação de mercado atualizada.
2. **Controle de Entrada (Sinal + Parcelas Construtora):** Valor total da entrada, valor já pago, saldo a pagar, número de parcelas, cronograma de vencimentos (mensais, semestrais/balões, chaves).
3. **Evolução de Obra (Fase de Construção):** Controle isolado dos encargos de obra (juros de obra/INCC), registrando valor pago no mês, acumulado histórico, previsão de cobranças futuras, índice de reajuste (INCC/IPCA) e comparativo Previsto vs. Realizado.
4. **Financiamento Imobiliário:** Valor financiado, banco, taxa de juros (nominal e efetiva), sistema de amortização (*SAC, Price*), prazo total, parcelas pagas/restantes, valor da prestação atual, saldo devedor atualizado, seguros/tarifas (MIP, DFI) e registro de **amortizações extraordinárias** (com opção de redução de prazo ou de parcela).
5. **Custos Adicionais de Transação e Instalação:** ITBI, escritura, registro em cartório, taxas de vistoria/bancárias, condomínio, IPTU, reformas, marcenaria/móveis planejados e eletrodomésticos.
6. **Painel Consolidado do Imóvel (Cálculos Automáticos):**
   - Total já desembolsado até o momento vs. Total que ainda falta pagar
   - Percentual que a entrada representa sobre o valor do imóvel e saldo restante da entrada
   - Custo total acumulado com evolução de obra e juros
   - Custo Efetivo Total do imóvel (Aquisição + Obra + Juros + Impostos + Reforma)
   - Percentual do patrimônio do usuário comprometido com o ativo
   - *Regra Contábil:* Separar estritamente o que é **amortização de principal** (reduz dívida/aumenta patrimônio líquido) do que é **juros, taxas e evolução de obra** (custo financeiro irrecuperável).

---

### 4.7. Metas Financeiras e Lista de Compras (Wishlist)
Central de objetivos de curto, médio e longo prazo.
- **Atributos da Meta:** Nome do item/objetivo, marca, imagem, categoria, prioridade, valor estimado inicial, valor atualizado de mercado, data-alvo para aquisição, valor já reservado, conta/investimento onde o recurso está alocado e status (*Planejado, Em andamento, Comprado, Cancelado*).
- **Fluxo de Conclusão e Conversão Patrimonial:**
  - Barra de progresso automática baseada no saldo reservado vs. valor-alvo.
  - Ao marcar uma meta como **Comprada**, o sistema registra o valor efetivamente pago e a data real, atualiza o progresso para $100\%$, gera a saída financeira correspondente e oferece um botão de **Converter em Ativo Patrimonial** (adicionando automaticamente o bem — ex.: carro, notebook, imóvel — ao módulo de Patrimônio).

---

### 4.8. Investimentos e Objetivos de Longo Prazo
- **Classes de Ativos Suportadas:** Renda Fixa (Tesouro Direto, CDB, LCI, LCA, Debêntures), Renda Variável (Ações, FIIs, ETFs, BDRs), Fundos de Investimento, Previdência Privada, Criptomoedas e Ativos Personalizados.
- **Controle por Ativo:** Instituição/corretora, ticker/nome, quantidade, preço médio, valor total aplicado, cotação/valor atual, rentabilidade bruta/líquida ($\text{R\$}$ e $\%$), data da aplicação, histórico de aportes/resgates e registro de proventos (dividendos, JCP, aluguéis de FIIs).
- **Metas de Investimento:** Ex.: *Reserva de Emergência, Carteira de $\text{R\$ } 100\text{k}$, Independência Financeira*. Inclui simulador de juros compostos com projeção de tempo para atingir a meta com base no aporte mensal e taxa de juros estimada.

---

### 4.9. Planejamento Financeiro Futuro (Simulador de Cenários)
Motor de projeção financeira para tomada de decisão antecipada.
- **Horizontes de Projeção:** $3$ meses, $6$ meses, $12$ meses, $5$ anos ou período customizado.
- **Injeção de Eventos Futuros:** O usuário pode simular aumentos salariais, recebimento de PLR/bônus, quitação antecipada de dívidas, fim de parcelamentos atuais, novas aquisições, início de financiamentos, despesas extraordinárias ou mudança de custo de vida.
- **Matriz de Cenários:**
  - **Conservador:** Menor crescimento de renda e despesas estressadas.
  - **Realista:** Projeção linear baseada no histórico e compromissos atuais.
  - **Otimista:** Aumento de renda e expansão da capacidade de aporte.
- **Saídas do Simulador:** Fluxo de caixa projetado mês a mês, alerta antecipado de meses com risco de saldo negativo, evolução estimada do patrimônio líquido e data estimada de conclusão das metas financeiras.

---

### 4.10. Patrimônio Pessoal (Balanço Patrimonial)
Visão contábil de tudo que o usuário possui (Ativos) e deve (Passivos).
- **Ativos:** Imóveis, veículos, carteira de investimentos, saldos bancários/liquidez, participações e bens de valor personalizados.
- **Passivos:** Saldo devedor de financiamentos imobiliários/veiculares, empréstimos, faturas de cartão de crédito, saldo de parcelamentos futuros e dívidas pessoais.
- **Indicadores:** Cálculo em tempo real do Patrimônio Líquido, índice de liquidez, índice de endividamento e gráfico histórico de evolução patrimonial.

---

### 4.11. Recursos Adicionais de Alta Performance
- **Calendário Financeiro:** Visão mensal/semanal de todos os vencimentos de contas, faturas e recebimentos previstos.
- **Cofres Virtuais (Caixinhas):** Separação lógica de saldo dentro de uma mesma conta por finalidade específica.
- **Simulador de Impacto de Compra:** Avalia como uma nova compra à vista ou parcelada afetará o fluxo de caixa dos próximos meses antes de o usuário realizá-la.
- **Simulador de Amortização:** Compara matematicamente a economia de juros entre amortizar no **Prazo** vs. na **Parcela**.
- **Central de Alertas e Notificações:** Avisos de contas próximas do vencimento, estouro de orçamento por categoria e metas atingidas.
- **Gestão de Documentos (Vault):** Repositório seguro para anexar contratos, escrituras, comprovantes e notas fiscais vinculados a transações ou projetos.
- **Importação e Exportação:** Importação de extratos via CSV/Planilhas e exportação de relatórios gerenciais em CSV, Excel e PDF.
- **Log de Auditoria:** Histórico de alterações relevantes de saldo e transações.

---

## 5. Arquitetura de Dados e Relacionamentos

O banco de dados PostgreSQL no Supabase deve seguir uma modelagem relacional centrada na integridade dos lançamentos:

```text
                       +-----------------------------------+
                       |      BASE FINANCEIRA CENTRAL      |
                       |  Users • Accounts • Categories    |
                       |     Transactions • AuditLogs      |
                       +-----------------+-----------------+
                                         |
        +----------------+---------------+---------------+----------------+
        |                |                               |                |
        v                v                               v                v
+---------------+ +--------------+               +---------------+ +--------------+
| FLUXO DE CAIXA| |  PATRIMÔNIO  |               |   PROJETOS    | | PLANEJAMENTO |
| • Entradas    | | • Ativos     |               | • Gerais      | | • Cenários   |
| • Saídas      | | • Passivos   |               | • Imobiliário | | • Eventos    |
| • Cartões     | | • Investim.  |               | • Metas/Wish  | | • Projeções  |
| • Parcelas    | | • Evolução   |               | • Orçamentos  | | • Simulações |
+-------+-------+ +------+-------+               +-------+-------+ +------+-------+
        |                |                               |                |
        +----------------+---------------+---------------+----------------+
                                         |
                                         v
                       +-----------------------------------+
                       |        DASHBOARD INTEGRADO        |
                       |   KPIs • Gráficos • Relatórios    |
                       +-----------------------------------+
```

---

## 6. Roadmap de Desenvolvimento (Fases de Implementação)

Para garantir entregas incrementais sólidas e livres de bugs estruturais, o desenvolvimento deve seguir a ordem abaixo:

1. **Fase 1 — Fundação e Core Setup:** Configuração do projeto (React, TypeScript, Tailwind, shadcn/ui), integração com Supabase, autenticação (Supabase Auth), modelagem inicial do banco de dados, layout base com *Sidebar* responsiva, alternância Dark/Light mode e estrutura do Dashboard.
2. **Fase 2 — Motor de Contas e Fluxo de Caixa:** CRUD completo de Contas, Categorias/Subcategorias, Entradas, Saídas e Transferências neutras entre contas, garantindo a atualização automática de saldos.
3. **Fase 3 — Cartões, Parcelamentos e Recorrências:** Gestão de cartões de crédito, fechamento/pagamento de faturas (sem duplicidade de despesa), motor de transações recorrentes e Central de Parcelamentos.
4. **Fase 4 — Projetos Independentes e Gestão Imobiliária:** Criação do módulo de Projetos multi-escopo e do módulo especializado de Aquisição Imobiliária (Entrada, Evolução de Obra, Financiamento SAC/Price, Amortizações e Custos Adicionais).
5. **Fase 5 — Metas Financeiras e Lista de Compras:** Implementação da Wishlist com barras de progresso, reserva de valores e fluxo automatizado de conversão de meta concluída em item do Patrimônio.
6. **Fase 6 — Investimentos e Balanço Patrimonial:** Gestão de carteira de ativos, registro de aportes/proventos, consolidação de Ativos vs. Passivos e cálculo histórico do Patrimônio Líquido.
7. **Fase 7 — Planejamento Futuro e Simuladores:** Construção do ambiente isolado (*sandbox*) de projeções financeiras para $3$, $6$, $12$ meses e $5$ anos, com injeção de eventos futuros e comparação de cenários (Conservador, Realista e Otimista).
8. **Fase 8 — Relatórios, Calendário e Importação/Exportação:** Gráficos analíticos avançados, calendário de vencimentos, alertas inteligentes, upload de comprovantes e exportação/importação de dados (CSV/Excel/PDF).