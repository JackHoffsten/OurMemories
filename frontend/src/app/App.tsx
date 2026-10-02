import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../features/auth/api'
import { ApiError, errorMessage } from '../shared/api/client'
import { Login } from '../features/auth/components/Login'
import { Timeline } from '../features/memories/components/Timeline/Timeline'
import { content } from '../config/content'
import './App.css'

function App() {
  const [user, setUser] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((result) => {
        if (active) setUser(result.username)
      })
      .catch((cause) => {
        if (active && !(cause instanceof ApiError && cause.status === 401))
          setError(errorMessage(cause))
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [])

  const expired = useCallback(() => {
    setUser(null)
    setError(content.app.sessionExpired)
  }, [])

  return (
    <>
      <main id="main">
        {checking ? (
          <p className="status" role="status">
            {content.app.opening}
          </p>
        ) : user ? (
          <>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <Timeline onExpired={expired} />
          </>
        ) : (
          <Login
            notice={error}
            onLogin={async () => {
              setUser((await authApi.me()).username)
              setError('')
            }}
          />
        )}
      </main>
      <footer>
        {content.app.footer}
      </footer>
    </>
  )
}

export default App
