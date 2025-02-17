import { createContext, useState, useEffect } from 'react'
import type { Dispatch, ReactNode, SetStateAction, ReactElement } from 'react'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { createTx } from '@/services/tx/tx-sender'
import { useRecommendedNonce, useSafeTxGas } from '../tx/SignOrExecuteForm/hooks'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '@/hooks/useSafeInfo'

export const SafeTxContext = createContext<{
  safeTx?: SafeTransaction
  setSafeTx: Dispatch<SetStateAction<SafeTransaction | undefined>>

  safeTxError?: Error
  setSafeTxError: Dispatch<SetStateAction<Error | undefined>>

  nonce?: number
  setNonce: Dispatch<SetStateAction<number | undefined>>
  nonceNeeded?: boolean
  setNonceNeeded: Dispatch<SetStateAction<boolean>>

  safeTxGas?: number
  setSafeTxGas: Dispatch<SetStateAction<number | undefined>>

  recommendedNonce?: number
}>({
  setSafeTx: () => {},
  setSafeTxError: () => {},
  setNonce: () => {},
  setNonceNeeded: () => {},
  setSafeTxGas: () => {},
})

const SafeTxProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [safeTx, setSafeTx] = useState<SafeTransaction>()
  const [safeTxError, setSafeTxError] = useState<Error>()
  const [nonce, setNonce] = useState<number>()
  const [nonceNeeded, setNonceNeeded] = useState<boolean>(true)
  const [safeTxGas, setSafeTxGas] = useState<number>()
  const { safe } = useSafeInfo()

  // Signed txs cannot be updated
  const isSigned = safeTx && safeTx.signatures.size > 0

  // Recommended nonce and safeTxGas
  const recommendedNonce = Math.max(safe.nonce, useRecommendedNonce() ?? 0)
  const recommendedSafeTxGas = useSafeTxGas(safeTx)

  // Priority to external nonce, then to the recommended one
  const finalNonce = isSigned ? safeTx?.data.nonce : nonce ?? recommendedNonce ?? safeTx?.data.nonce
  const finalSafeTxGas = isSigned ? safeTx?.data.safeTxGas : safeTxGas ?? recommendedSafeTxGas ?? safeTx?.data.safeTxGas

  // Update the tx when the nonce or safeTxGas change
  useEffect(() => {
    if (isSigned || !safeTx?.data) return
    if (safeTx.data.nonce === finalNonce && safeTx.data.safeTxGas === finalSafeTxGas) return

    createTx({ ...safeTx.data, safeTxGas: finalSafeTxGas }, finalNonce)
      .then(setSafeTx)
      .catch(setSafeTxError)
  }, [isSigned, finalNonce, finalSafeTxGas, safeTx?.data])

  // Log errors
  useEffect(() => {
    safeTxError && logError(Errors._103, safeTxError)
  }, [safeTxError])

  return (
    <SafeTxContext.Provider
      value={{
        safeTx,
        safeTxError,
        setSafeTx,
        setSafeTxError,
        nonce: finalNonce,
        setNonce,
        nonceNeeded,
        setNonceNeeded,
        safeTxGas: finalSafeTxGas,
        setSafeTxGas,
        recommendedNonce,
      }}
    >
      {children}
    </SafeTxContext.Provider>
  )
}

export default SafeTxProvider
