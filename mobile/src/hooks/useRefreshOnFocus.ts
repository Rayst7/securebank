import { useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'

/**
 * Refresca datos al volver a una pantalla, sin repetir la carga del primer foco.
 */
export function useRefreshOnFocus(refresh: () => void | Promise<void>): void {
  const firstFocus = useRef(true)

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }

      void refresh()
    }, [refresh]),
  )
}
