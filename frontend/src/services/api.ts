import type { ApiErrorBody } from '../types/api'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'securebank.token'
const REQUEST_TIMEOUT_MS = 15_000

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

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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
 * la sesión expiró (401) para que AuthContext cierre la sesión.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getStoredToken()
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
        clearStoredToken()
        window.dispatchEvent(new Event('securebank:unauthorized'))
      }

      throw new ApiError(response.status, message, extractDetails(errorBody))
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        0,
        'La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.',
      )
    }

    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.',
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}
