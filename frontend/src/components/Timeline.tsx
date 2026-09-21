import { useEffect, useRef, useState } from 'react'
import { api, ApiError, errorMessage } from '../api'
import type { Memory, MemoryPage } from '../api'
import { MemoryEditor } from './MemoryEditor'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function Timeline({ onExpired }: { onExpired: () => void }) {
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<MemoryPage | null>(null)
  const [loaded, setLoaded] = useState('')
  const loading = loaded !== `${page}:${revision}`
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<Memory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .memories(page, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setError('')
        if (page > 0 && result.items.length === 0) setPage(page - 1)
        else setData(result)
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 401) onExpired()
        else setError(errorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(`${page}:${revision}`)
      })
    return () => controller.abort()
  }, [page, revision, onExpired])

  function closeEditor() {
    setEditor(null)
    requestAnimationFrame(() => addButton.current?.focus())
  }
  async function remove(memory: Memory) {
    setBusy(true)
    setError('')
    try {
      await api.delete(memory.id)
      setDeleting(null)
      setAnnouncement('Minnet har tagits bort.')
      setRevision((value) => value + 1)
      addButton.current?.focus()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  if (editor)
    return (
      <MemoryEditor
        memory={editor === 'new' ? undefined : editor}
        onExpired={onExpired}
        onCancel={closeEditor}
        onSaved={() => {
          closeEditor()
          setPage(0)
          setRevision((value) => value + 1)
          setAnnouncement('Minnet har sparats.')
        }}
      />
    )

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <p className="eyebrow">du, jag och alla små stunder</p>
          <h1 id="timeline-title">
            Våra minnen{' '}
            <span className="hand-heart" aria-hidden="true">
              ♡
            </span>
          </h1>
          <p className="lede">Sånt jag aldrig vill att vi ska glömma.</p>
        </div>
        <button className="primary" ref={addButton} onClick={() => setEditor('new')}>
          + Lägg till ett minne
        </button>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {!loading && error && (
        <div className="notice" role="alert">
          {error}{' '}
          <button className="text-button" onClick={() => setRevision((value) => value + 1)}>
            Försök igen
          </button>
        </div>
      )}
      {loading ? (
        <p className="status" role="status">
          Hämtar våra minnen…
        </p>
      ) : (
        !error &&
        data && (
          <>
            <div className="timeline-meta">
              <span>
                {data.totalElements} {data.totalElements === 1 ? 'sparat minne' : 'sparade minnen'}
              </span>
              <span>Nyaste först</span>
            </div>
            {data.items.length === 0 ? (
              <div className="empty-state">
                <span aria-hidden="true">♡</span>
                <h2>Vi börjar med ett minne.</h2>
                <p>Spara en stund som du vill kunna återvända till.</p>
                <button className="secondary" onClick={() => setEditor('new')}>
                  Spara vårt första minne
                </button>
              </div>
            ) : (
              <ol className="memory-list">
                {data.items.map((memory) => (
                  <li key={memory.id}>
                    <time dateTime={memory.memoryDate}>{formatDate(memory.memoryDate)}</time>
                    <article className="memory-card" aria-labelledby={`memory-${memory.id}`}>
                      {memory.locationName && <p className="location">{memory.locationName}</p>}
                      <h2 id={`memory-${memory.id}`}>{memory.title}</h2>
                      <p className="story">{memory.story}</p>
                      {deleting === memory.id ? (
                        <div className="delete-confirmation">
                          <p>Vill du ta bort ”{memory.title}” för alltid?</p>
                          <button
                            className="danger"
                            disabled={busy}
                            onClick={() => void remove(memory)}
                          >
                            {busy ? 'Tar bort…' : 'Ja, ta bort minnet'}
                          </button>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => setDeleting(null)}
                          >
                            Behåll minnet
                          </button>
                        </div>
                      ) : (
                        <div className="card-actions">
                          <button
                            className="text-button"
                            aria-label={`Redigera ${memory.title}`}
                            onClick={() => setEditor(memory)}
                          >
                            Redigera minnet
                          </button>
                          <button
                            className="text-button"
                            aria-label={`Ta bort ${memory.title}`}
                            onClick={() => setDeleting(memory.id)}
                          >
                            Ta bort
                          </button>
                        </div>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
            )}
            {data.totalPages > 1 && (
              <nav className="pagination" aria-label="Minnessidor">
                <button
                  className="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Nyare minnen
                </button>
                <span>
                  Sida {page + 1} av {data.totalPages}
                </span>
                <button
                  className="secondary"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Äldre minnen
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  )
}
