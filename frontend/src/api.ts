import { content } from './config/content'

export interface Memory {
  id: string
  title: string
  story: string
  memoryDate: string
  locationName: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export type MemoryInput = Pick<Memory, 'title' | 'story' | 'memoryDate' | 'locationName'>
export interface MemoryImage {
  id: string
  contentType: string
  width: number
  height: number
  size: number
}

export const imageUrl = (memoryId: string, imageId: string) =>
  `/api/memories/${memoryId}/images/${imageId}/content`
export interface MemoryPage {
  items: Memory[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let csrf: { headerName: string; token: string } | undefined

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
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

export const api = {
  me: () => request<{ username: string }>('/auth/me'),
  async login(username: string, password: string) {
    csrf = undefined
    await request<void>('/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    })
    csrf = undefined
  },
  async logout() {
    await request<void>('/auth/logout', { method: 'POST' })
    csrf = undefined
  },
  memories: (page: number, signal?: AbortSignal) =>
    request<MemoryPage>(`/memories?page=${page}&size=20`, { signal }),
  memory: (id: string) => request<Memory>(`/memories/${id}`),
  save: (input: MemoryInput, memory?: Memory) =>
    request<Memory>(memory ? `/memories/${memory.id}` : '/memories', {
      method: memory ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory ? { ...input, version: memory.version } : input),
    }),
  delete: (id: string) => request<void>(`/memories/${id}`, { method: 'DELETE' }),
  images: (id: string, signal?: AbortSignal) =>
    request<MemoryImage[]>(`/memories/${id}/images`, { signal }),
  uploadImage: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<MemoryImage>(`/memories/${id}/images`, { method: 'POST', body })
  },
  deleteImage: (memoryId: string, imageId: string) =>
    request<void>(`/memories/${memoryId}/images/${imageId}`, { method: 'DELETE' }),
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : content.errors.generic
}
