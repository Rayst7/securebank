import { useCallback, useEffect, useRef, useState } from 'react'

export interface ApiQueryResult<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Ejecuta una consulta a la API y expone estados de carga, error y refresco.
 * `deps` funciona como en useEffect: al cambiar, la consulta se repite.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const mounted = useRef(true)
  const requestId = useRef(0)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const currentRequest = ++requestId.current

      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError(null)

      try {
        const result = await fetcherRef.current()
        if (mounted.current && currentRequest === requestId.current) {
          setData(result)
        }
      } catch (cause) {
        if (mounted.current && currentRequest === requestId.current) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar la información.',
          )
        }
      } finally {
        if (mounted.current && currentRequest === requestId.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    mounted.current = true
    void load('initial')

    return () => {
      mounted.current = false
    }
  }, [load])

  const reload = useCallback(() => load('refresh'), [load])

  return { data, loading, refreshing, error, reload }
}
