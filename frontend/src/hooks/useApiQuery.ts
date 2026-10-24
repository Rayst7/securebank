import { useCallback, useEffect, useRef, useState } from 'react'

export interface ApiQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Hook pequeño para consultas GET con estados de carga, error y recarga.
 * El loader se guarda en un ref para no disparar el efecto en cada render.
 */
export function useApiQuery<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true

    setLoading(true)
    setError(null)

    loaderRef.current()
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.',
          )
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  return { data, loading, error, reload }
}
