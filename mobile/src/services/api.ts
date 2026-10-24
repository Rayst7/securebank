import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { ApiErrorBody } from '../types/api'
import { getItem, removeItem, setItem } from './storage'

const TOKEN_KEY = 'securebank.token'
const REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_API_PORT = 3000

/**
 * Resuelve la URL de la API según el entorno:
 * 1. EXPO_PUBLIC_API_URL si está definida.
 * 2. La IP de la computadora que sirve Expo (funciona en Expo Go y en un
 *    dispositivo físico conectado a la misma red).
 * 3. 10.0.2.2 en el emulador de Android (alias del host).
 * 4. localhost en iOS Simulator y web.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  const host = hostUri?.split(':')[0]

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEFAULT_API_PORT}/api`
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}/api`
  }

  return `http://localhost:${DEFAULT_API_PORT}/api`
}

export const API_BASE_URL = resolveApiBaseUrl()

export class ApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

let unauthorizedHandler: (() => void) | null = null

/** AuthProvider registra aquí el cierre de sesión automático ante un 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function getStoredToken(): Promise<string | null> {
  return getItem(TOKEN_KEY)
}

export function storeToken(token: string): Promise<void> {
  return setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): Promise<void> {
  return removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function readErrorBody(payload: unknown): ApiErrorBody | null {
  if (payload !== null && typeof payload === 'object') {
    return payload as ApiErrorBody
  }
  return null
}

function extractMessage(body: ApiErrorBody | null): string | null {
  if (!body?.message) return null
  if (typeof body.message === 'string') return body.message
  const messages = body.message.filter((item): item is string => typeof item === 'string')
  return messages.length > 0 ? messages.join('. ') : null
}

function extractDetails(body: ApiErrorBody | null): string[] {
  if (!body?.message) return []
  return Array.isArray(body.message) ? body.message : [body.message]
}

/**
 * Cliente HTTP central. Agrega el token, normaliza errores y avisa cuando
 * la sesión expiró (401) para que AuthProvider cierre la sesión.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = await getStoredToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    const text = await response.text()
    const payload = text ? safeJsonParse(text) : null

    if (!response.ok) {
      const errorBody = readErrorBody(payload)
      const message = extractMessage(errorBody) ?? `Error ${response.status}`

      if (response.status === 401 && auth) {
        await clearStoredToken()
        unauthorizedHandler?.()
      }

      throw new ApiError(response.status, message, extractDetails(errorBody))
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    const aborted =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')

    if (aborted) {
      throw new ApiError(
        0,
        'La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.',
      )
    }

    throw new ApiError(
      0,
      `No se pudo conectar con el servidor (${API_BASE_URL}). Verifica que la API esté en ejecución y que el teléfono esté en la misma red.`,
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
