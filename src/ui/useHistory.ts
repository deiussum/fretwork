import { useEffect, useState } from 'react'
import type { HistoryRepository, Result } from '../domain/history'

/** All saved results, reloaded whenever `reloadKey` changes. */
export function useResults(history: HistoryRepository, reloadKey: unknown): Result[] {
  const [results, setResults] = useState<Result[]>([])
  useEffect(() => {
    let cancelled = false
    void history.loadResults().then((loaded) => {
      if (!cancelled) setResults(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [history, reloadKey])
  return results
}
