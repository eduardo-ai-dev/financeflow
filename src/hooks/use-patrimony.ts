import { useMemo } from 'react'
import { useAccounts } from '@/hooks/use-accounts'
import { useInvestments } from '@/hooks/use-investments'
import { useAssets } from '@/hooks/use-assets'
import { useProperties } from '@/hooks/use-properties'
import { useLiabilities } from '@/hooks/use-liabilities'
import { useCards } from '@/hooks/use-cards'
import { calculatePatrimonySummary, type PatrimonySummary } from '@/lib/patrimony'

export function usePatrimony() {
  const { accounts, isLoading: loadingAcc } = useAccounts()
  const { investments, isLoading: loadingInv } = useInvestments()
  const { assets, isLoading: loadingAssets } = useAssets()
  const { properties, isLoading: loadingProp } = useProperties()
  const { liabilities, isLoading: loadingLiab } = useLiabilities()
  const { cards, isLoading: loadingCards } = useCards()

  const isLoading =
    loadingAcc || loadingInv || loadingAssets || loadingProp || loadingLiab || loadingCards

  const totalCreditCardDebt = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.used_amount || 0), 0)
  }, [cards])

  const accountBalancesMap = useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach((acc) => {
      map[acc.id] = acc.current_balance
    })
    return map
  }, [accounts])

  const summary: PatrimonySummary = useMemo(() => {
    return calculatePatrimonySummary({
      accounts,
      accountBalances: accountBalancesMap,
      investments,
      assets,
      properties,
      liabilities,
      creditCardDebt: totalCreditCardDebt,
    })
  }, [accounts, accountBalancesMap, investments, assets, properties, liabilities, totalCreditCardDebt])

  return {
    summary,
    accounts,
    investments,
    assets,
    properties,
    liabilities,
    cards,
    isLoading,
  }
}
