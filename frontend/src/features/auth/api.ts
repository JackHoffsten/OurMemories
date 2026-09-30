import { request, resetCsrf } from '../../shared/api/client'

export const authApi = {
  me: () => request<{ username: string }>('/auth/me'),
  async login(username: string, password: string) {
    resetCsrf()
    await request<void>('/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    })
    resetCsrf()
  },
  async logout() {
    await request<void>('/auth/logout', { method: 'POST' })
    resetCsrf()
  },
}
