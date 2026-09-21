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
    throw new ApiError(
      0,
      'Det gick inte att nå servern. Kontrollera din anslutning och försök igen.',
    )
  }
  if (response.status === 403 && mutation && retry) {
    csrf = undefined
    return request(path, options, false)
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Kontrollera uppgifterna och försök igen.',
      401: 'Din session har gått ut. Logga in igen.',
      403: 'Det gick inte att verifiera din begäran. Försök igen.',
      404: 'Det här minnet finns inte längre.',
      409: 'Minnet har ändrats på annat håll. Ditt utkast finns kvar här. Hämta den sparade versionen innan du fortsätter redigera.',
    }
    throw new ApiError(response.status, messages[response.status] ?? 'Något gick fel. Försök igen.')
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
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Något gick fel. Försök igen.'
}
