import React, { createContext, useContext } from 'react'
import { useBillingState } from '../hooks/useBillingState'

type BillingAPI = ReturnType<typeof useBillingState>

const BillingContext = createContext<BillingAPI | null>(null)

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const billing = useBillingState()
  return (
    <BillingContext.Provider value={billing}>
      {children}
    </BillingContext.Provider>
  )
}

export function useBilling(): BillingAPI {
  const ctx = useContext(BillingContext)
  if (!ctx) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return ctx
}
