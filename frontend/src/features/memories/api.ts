import { request } from '../../shared/api/client'
import type { Memory, MemoryInput, MemoryImage, MemoryPage } from './types'

export const imageUrl = (memoryId: string, imageId: string) =>
  `/api/memories/${memoryId}/images/${imageId}/content`

export const memoriesApi = {
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
