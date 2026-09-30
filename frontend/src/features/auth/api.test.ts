import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

it('shows a Swedish throttling message without retrying login', async () => {
  vi.resetModules()
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'test' })),
    )
    .mockResolvedValueOnce(new Response('', { status: 429 }))
  vi.stubGlobal('fetch', fetch)
  const { authApi } = await import('./api')
  await expect(authApi.login('someone', 'a test password')).rejects.toMatchObject({
    status: 429,
    message: 'För många inloggningsförsök. Vänta en stund och försök igen.',
  })
  expect(fetch).toHaveBeenCalledTimes(2)
})
