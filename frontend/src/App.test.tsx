import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { api, ApiError } from './api'
import type { Memory } from './api'

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return {
    ...original,
    api: {
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      memories: vi.fn(),
      memory: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      images: vi.fn(),
      uploadImage: vi.fn(),
      deleteImage: vi.fn(),
    },
  }
})

const memory: Memory = {
  id: 'one',
  title: 'Our first walk',
  story: 'Coffee by the water.\nA lovely afternoon.',
  memoryDate: '2026-01-10',
  locationName: 'Stockholm',
  createdAt: '',
  updatedAt: '',
  version: 2,
}
const page = { items: [memory], page: 0, size: 20, totalElements: 1, totalPages: 1 }
const mocked = vi.mocked(api)

beforeEach(() => {
  vi.resetAllMocks()
  mocked.me.mockResolvedValue({ username: 'first.user' })
  mocked.memories.mockResolvedValue(page)
  mocked.images.mockResolvedValue([])
})
afterEach(cleanup)

describe('our story', () => {
  it('shows a login error, then opens the timeline with Swedish dates', async () => {
    mocked.me.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))
    mocked.login.mockRejectedValueOnce(new ApiError(401, 'Unauthorized')).mockResolvedValueOnce()
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Användarnamn'), {
      target: { value: 'first.user' },
    })
    fireEvent.change(screen.getByLabelText('Lösenord'), { target: { value: 'a test passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Öppna' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Användarnamnet eller lösenordet är fel',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Öppna' }))
    expect(await screen.findByRole('heading', { name: memory.title })).toBeTruthy()
    expect(screen.getByText('10 januari 2026')).toBeTruthy()
  })

  it('creates a memory from the empty state', async () => {
    mocked.memories.mockResolvedValue({ ...page, items: [], totalElements: 0, totalPages: 0 })
    mocked.save.mockResolvedValue(memory)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Lägg till vårt första minne' }))
    fireEvent.change(screen.getByLabelText('Ge minnet en rubrik'), {
      target: { value: 'Our first walk' },
    })
    fireEvent.change(screen.getByLabelText('När var det?'), { target: { value: '2026-01-10' } })
    fireEvent.change(screen.getByLabelText('Berätta om minnet'), {
      target: { value: 'Coffee by the water.' },
    })
    mocked.memories.mockResolvedValue(page)
    fireEvent.click(screen.getByRole('button', { name: 'Spara minnet' }))
    expect(await screen.findByRole('heading', { name: memory.title })).toBeTruthy()
    expect(mocked.save).toHaveBeenCalledWith(
      {
        title: memory.title,
        story: 'Coffee by the water.',
        memoryDate: '2026-01-10',
        locationName: '',
      },
      undefined,
    )
  })

  it('keeps a conflicting draft and reloads only after confirmation', async () => {
    mocked.save.mockRejectedValue(new ApiError(409, 'This memory was changed elsewhere.'))
    mocked.memory.mockResolvedValue({ ...memory, title: 'Latest title', version: 3 })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: `Redigera ${memory.title}` }))
    fireEvent.change(screen.getByLabelText('Ge minnet en rubrik'), {
      target: { value: 'My draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Spara minnet' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect((screen.getByLabelText('Ge minnet en rubrik') as HTMLInputElement).value).toBe(
      'My draft',
    )
    expect(
      (screen.getByRole('button', { name: 'Spara minnet' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Hämta sparad version' }))
    await waitFor(() =>
      expect((screen.getByLabelText('Ge minnet en rubrik') as HTMLInputElement).value).toBe(
        'Latest title',
      ),
    )
    expect(mocked.save.mock.calls[0][1]?.version).toBe(2)
  })

  it('keeps failed attachments and retries using the saved memory', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:preview'),
        revokeObjectURL: vi.fn(),
      }),
    )
    mocked.memories.mockResolvedValue({ ...page, items: [], totalElements: 0, totalPages: 0 })
    mocked.save.mockResolvedValue(memory)
    mocked.uploadImage.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({
      id: 'photo',
      contentType: 'image/png',
      width: 4,
      height: 3,
      size: 100,
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Lägg till vårt första minne' }))
    fireEvent.change(screen.getByLabelText('Ge minnet en rubrik'), {
      target: { value: memory.title },
    })
    fireEvent.change(screen.getByLabelText('När var det?'), {
      target: { value: memory.memoryDate },
    })
    fireEvent.change(screen.getByLabelText('Berätta om minnet'), {
      target: { value: memory.story },
    })
    const file = new File(['png'], 'walk.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Bilder \(valfritt\)/), { target: { files: [file] } })
    expect(screen.getByAltText('Förhandsvisning av walk.png')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Spara minnet' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Minnet har sparats')
    expect(screen.getByAltText('Förhandsvisning av walk.png')).toBeTruthy()
    mocked.memories.mockResolvedValue(page)
    fireEvent.click(screen.getByRole('button', { name: 'Spara minnet' }))
    expect(await screen.findByRole('heading', { name: memory.title })).toBeTruthy()
    expect(mocked.save.mock.calls[1][1]).toEqual(memory)
    expect(mocked.uploadImage).toHaveBeenLastCalledWith(memory.id, file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    vi.unstubAllGlobals()
  })

  it('requires confirmation to delete and refreshes the list', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: `Ta bort ${memory.title}` }))
    expect(mocked.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Behåll minnet' }))
    expect(mocked.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: `Ta bort ${memory.title}` }))
    mocked.memories.mockResolvedValue({ ...page, items: [], totalElements: 0, totalPages: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Ja, ta bort minnet' }))
    expect(await screen.findByRole('heading', { name: 'Lägg till ett minne' })).toBeTruthy()
    expect(mocked.delete).toHaveBeenCalledWith(memory.id)
  })

  it('returns to login when the session expires', async () => {
    mocked.memories.mockRejectedValue(new ApiError(401, 'Expired'))
    render(<App />)
    expect(await screen.findByLabelText('Användarnamn')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('session har gått ut')
  })

  it('loads the next page and renders story markup as text', async () => {
    mocked.memories.mockResolvedValue({
      ...page,
      totalPages: 2,
      totalElements: 21,
      items: [{ ...memory, story: '<img src=x onerror=alert(1)>' }],
    })
    render(<App />)
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Äldre minnen' }))
    await waitFor(() =>
      expect(mocked.memories).toHaveBeenLastCalledWith(1, expect.any(AbortSignal)),
    )
  })

  it('shortens long memory text while retaining its accessible name', async () => {
    const longMemory = {
      ...memory,
      title: 'T'.repeat(70),
      locationName: 'L'.repeat(80),
      story: 'S'.repeat(250),
    }
    mocked.memories.mockResolvedValue({ ...page, items: [longMemory] })

    render(<App />)

    expect((await screen.findByRole('heading', { name: longMemory.title })).textContent).toBe(
      `${'T'.repeat(48)}…`,
    )
    expect(screen.getByLabelText(longMemory.locationName).textContent).toBe(`${'L'.repeat(60)}…`)
    expect(screen.getByLabelText(longMemory.story).textContent).toBe(`${'S'.repeat(220)}…`)
  })
})
