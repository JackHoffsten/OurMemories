import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const fetchMock = vi.fn<typeof fetch>()
const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status })

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

it('uses CSRF and form encoding for login, then fetches a fresh token for writes', async () => {
  const { api } = await import('./api')
  fetchMock
    .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'before-login' }))
    .mockResolvedValueOnce(response(null, 204))
    .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'after-login' }))
    .mockResolvedValueOnce(response({ id: 'one' }))
  await api.login('first.user', 'test & password')
  const login = fetchMock.mock.calls[1][1]!
  expect(login.credentials).toBe('same-origin')
  expect((login.headers as Headers).get('X-CSRF-TOKEN')).toBe('before-login')
  expect((login.body as URLSearchParams).get('password')).toBe('test & password')
  await api.save({ title: 'Walk', story: 'Story', memoryDate: '2026-01-10', locationName: null })
  expect((fetchMock.mock.calls[3][1]!.headers as Headers).get('X-CSRF-TOKEN')).toBe('after-login')
})

it('refreshes a rejected CSRF token once without an endless retry', async () => {
  const { api } = await import('./api')
  fetchMock
    .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'old' }))
    .mockResolvedValueOnce(response({}, 403))
    .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'new' }))
    .mockResolvedValueOnce(response({}, 403))
  await expect(api.delete('one')).rejects.toMatchObject({ status: 403 })
  expect(fetchMock).toHaveBeenCalledTimes(4)
})

it('does not retry an ambiguous network failure on a write', async () => {
  const { api } = await import('./api')
  fetchMock
    .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'token' }))
    .mockRejectedValueOnce(new TypeError('network'))
  await expect(api.delete('one')).rejects.toMatchObject({ status: 0 })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
