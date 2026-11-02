import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'
import type {
  Account,
  Investment,
  Asset,
  RealEstateProperty,
  Liability,
} from '@/types/database'

export interface PatrimonyAssetsBreakdown {
  cashCents: number
  investmentsCents: number
  assetsCents: number
  realEstateCents: number
  totalAssetsCents: number
}

export interface PatrimonyLiabilitiesBreakdown {
  mortgagesCents: number
  otherLiabilitiesCents: number
  creditCardCents: number
  totalLiabilitiesCents: number
}

export interface PatrimonySummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  debtRatio: number // Passivos / Ativos * 100
  liquidityRatio: number // Liquidez imediata / Ativos * 100
  assetsBreakdown: {
    cash: number
    investments: number
    physicalAssets: number
    realEstate: number
  }
  liabilitiesBreakdown: {
    mortgages: number
    loansAndDebts: number
    creditCard: number
  }
}

export function calculatePatrimonySummary(params: {
  accounts: Account[]
  accountBalances?: Record<string, number> // map accountId -> balance
  investments: Investment[]
  assets: Asset[]
  properties: RealEstateProperty[]
  liabilities: Liability[]
  creditCardDebt?: number
}): PatrimonySummary {
  // 1. Caixa Livre
  let cashCents = 0
  params.accounts.forEach((acc) => {
    const bal = params.accountBalances?.[acc.id] ?? acc.opening_balance
    // Apenas saldos positivos contam como ativo de caixa
    if (bal > 0) {
      cashCents = sumCents(cashCents, toCents(bal))
    }
  })

  // 2. Investimentos
  let investmentsCents = 0
  let immediateLiquidityCents = cashCents // Caixa já é liquidez imediata
  params.investments.forEach((inv) => {
    const valCents = toCents(inv.current_amount)
    investmentsCents = sumCents(investmentsCents, valCents)
    if (inv.liquidity === 'daily') {
      immediateLiquidityCents = sumCents(immediateLiquidityCents, valCents)
    }
  })

  // 3. Bens e Ativos Físicos / Eletrônicos / Veículos
  let physicalAssetsCents = 0
  params.assets.forEach((asset) => {
    physicalAssetsCents = sumCents(physicalAssetsCents, toCents(asset.current_value))
  })

  // 4. Imóveis (Valor de mercado ou valor de contrato)
  let realEstateCents = 0
  let mortgagesCents = 0
  params.properties.forEach((prop) => {
    const marketValue = prop.current_market_value || prop.contract_value
    realEstateCents = sumCents(realEstateCents, toCents(marketValue))

    // Saldo devedor do financiamento imobiliário
    if (prop.financed_amount > 0 && prop.total_term_months > 0) {
      const remainingTerm = Math.max(0, prop.total_term_months - prop.paid_months)
      const fractionRemaining = remainingTerm / prop.total_term_months
      const remainingDebt = prop.financed_amount * fractionRemaining
      mortgagesCents = sumCents(mortgagesCents, toCents(remainingDebt))
    }
  })

  // Total Ativos
  const totalAssetsCents = sumCents(
    sumCents(cashCents, investmentsCents),
    sumCents(physicalAssetsCents, realEstateCents)
  )

  // 5. Passivos (Empréstimos, dívidas e outras obrigações)
  let loansCents = 0
  params.liabilities.forEach((liab) => {
    loansCents = sumCents(loansCents, toCents(liab.current_balance))
  })

  const cardDebtCents = params.creditCardDebt ? toCents(params.creditCardDebt) : 0

  // Total Passivos
  const totalLiabilitiesCents = sumCents(
    sumCents(mortgagesCents, loansCents),
    cardDebtCents
  )

  // Patrimônio Líquido
  const netWorthCents = subtractCents(totalAssetsCents, totalLiabilitiesCents)

  const totalAssets = fromCents(totalAssetsCents)
  const totalLiabilities = fromCents(totalLiabilitiesCents)
  const netWorth = fromCents(netWorthCents)

  const debtRatio =
    totalAssets > 0
      ? Math.min(100, Math.round((totalLiabilities / totalAssets) * 100))
      : 0

  const liquidityRatio =
    totalAssets > 0
      ? Math.min(
          100,
          Math.round((fromCents(immediateLiquidityCents) / totalAssets) * 100)
        )
      : 0

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    debtRatio,
    liquidityRatio,
    assetsBreakdown: {
      cash: fromCents(cashCents),
      investments: fromCents(investmentsCents),
      physicalAssets: fromCents(physicalAssetsCents),
      realEstate: fromCents(realEstateCents),
    },
    liabilitiesBreakdown: {
      mortgages: fromCents(mortgagesCents),
      loansAndDebts: fromCents(loansCents),
      creditCard: fromCents(cardDebtCents),
    },
  }
}

