import { content } from '../../config/content'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let csrf: { headerName: string; token: string } | undefined

export async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers)
  const mutation = options.method && options.method !== 'GET'
  if (mutation) {
    csrf ??= await request<{ headerName: string; token: string }>('/auth/csrf')
    headers.set(csrf.headerName, csrf.token)
  }
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, content.errors.network)
  }
  if (response.status === 403 && mutation && retry) {
    csrf = undefined
    return request(path, options, false)
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      429: content.errors.tooManyAttempts,
      400: content.errors.invalidInput,
      401: content.errors.sessionExpired,
      403: content.errors.verification,
      404: content.errors.missingMemory,
      413: content.errors.imageTooLarge,
      415: content.errors.invalidImage,
      422: content.errors.imageLimit,
      409: content.errors.conflict,
    }
    throw new ApiError(response.status, messages[response.status] ?? content.errors.generic)
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

export function resetCsrf() {
  csrf = undefined
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : content.errors.generic
}
