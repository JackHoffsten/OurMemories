import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../api'
import { ApiError, errorMessage } from '../../../shared/api/client'
import { content } from '../../../config/content'
import './Login.css'

export function Login({ notice, onLogin }: { notice: string; onLogin: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unwrapped, setUnwrapped] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    try {
      await authApi.login(String(data.get('username')), String(data.get('password')))
      setUnwrapped(true)
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
      }
      form.reset()
      await onLogin()
    } catch (cause) {
      setUnwrapped(false)
      setError(
        cause instanceof ApiError && cause.status === 401
          ? content.login.invalidCredentials
          : errorMessage(cause),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="gift-login" aria-labelledby="login-title">
      <div className="gift-introduction">
        <h1 id="login-title">{content.login.heading}</h1>
      </div>
      <div className={`gift-package${unwrapped ? ' is-unwrapped' : ''}`}>
        <div className="gift-ribbon" aria-hidden="true" />
        <svg className="gift-bow" viewBox="0 0 220 140" aria-hidden="true">
          <defs>
            <linearGradient id="bow-satin" x1="0" y1="0" x2="0.25" y2="1">
              <stop className="bow-highlight" offset="0" />
              <stop className="bow-base" offset="0.55" />
              <stop className="bow-shade" offset="1" />
            </linearGradient>
          </defs>
          <g fill="url(#bow-satin)">
            <path d="M101 73C93 89 78 111 65 127L84 123L94 137C102 119 111 98 113 80Z" />
            <path d="M114 75C124 91 145 110 157 122L138 123L131 138C119 118 110 98 106 81Z" />
            <path d="M104 75C81 48 34 21 24 43C11 74 32 100 104 85Z" />
            <path d="M116 75C141 47 185 19 197 43C210 74 184 99 116 85Z" />
          </g>
          <path className="bow-fold" d="M35 59Q58 62 99 80M185 59Q158 64 121 80" />
          <path className="bow-knot" d="M101 67Q110 64 120 68L122 88Q110 94 99 87Z" />
        </svg>
        <div className="gift-note">
          {(error || notice) && (
            <p className="notice" role="alert">
              {error || notice}
            </p>
          )}
          <form onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy}>
              <label htmlFor="username">{content.login.username}</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={32}
              />
              <label htmlFor="password">{content.login.password}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
              <button className="primary" disabled={busy}>
                {busy ? content.login.opening : content.login.open}
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </section>
  )
}
