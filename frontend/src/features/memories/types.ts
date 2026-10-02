export interface Memory {
  createdBy: string | null
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
  description: string
  id: string
  contentType: string
  width: number
  height: number
  size: number
}

export interface MemoryPage {
  items: Memory[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
