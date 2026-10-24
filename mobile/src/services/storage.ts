import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * SecureStore no existe en web. Para poder probar la app con `expo start --web`
 * se usa localStorage como respaldo; en Android/iOS siempre se usa SecureStore.
 */
const isWeb = Platform.OS === 'web'

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value)
    return
  }

  await SecureStore.setItemAsync(key, value)
}

export async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      // ignorar
    }
    return
  }

  await SecureStore.deleteItemAsync(key)
}
