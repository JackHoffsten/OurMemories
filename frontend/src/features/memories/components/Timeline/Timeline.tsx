import './Timeline.css'
import { useEffect, useRef, useState } from 'react'
import { memoriesApi } from '../../api'
import { ApiError, errorMessage } from '../../../../shared/api/client'
import type { Memory, MemoryPage } from '../../types'
import { MemoryEditor } from '../MemoryEditor/MemoryEditor'
import { MemoryCard } from '../MemoryCard/MemoryCard'
import { content } from '../../../../config/content'

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
    memoriesApi
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
      await memoriesApi.delete(memory.id)
      setDeleting(null)
      setAnnouncement(content.timeline.deleted)
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
          setAnnouncement(content.timeline.saved)
        }}
      />
    )

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <h1 id="timeline-title">
            {content.timeline.heading}{' '}
            <span className="hand-heart" aria-hidden="true">
              ♡
            </span>
          </h1>
        </div>
        <button className="primary" ref={addButton} onClick={() => setEditor('new')}>
          {content.timeline.add}
        </button>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {!loading && error && (
        <div className="notice" role="alert">
          {error}{' '}
          <button className="text-button" onClick={() => setRevision((value) => value + 1)}>
            {content.timeline.retry}
          </button>
        </div>
      )}
      {loading ? (
        <p className="status" role="status">
          {content.timeline.loading}
        </p>
      ) : (
        !error &&
        data && (
          <>
            <div className="timeline-meta">
              <span>
                {data.totalElements}{' '}
                {data.totalElements === 1 ? content.timeline.savedOne : content.timeline.savedMany}
              </span>
              <span>{content.timeline.newestFirst}</span>
            </div>
            {data.items.length === 0 ? (
              <div className="empty-state">
                <span aria-hidden="true">♡</span>
                <h2>{content.timeline.emptyHeading}</h2>
                <button className="secondary" onClick={() => setEditor('new')}>
                  {content.timeline.addFirst}
                </button>
              </div>
            ) : (
              <ol className="memory-list">
                {data.items.map((memory) => (
                  <li key={memory.id}>
                    <MemoryCard
                      memory={memory}
                      deleting={deleting === memory.id}
                      busy={busy}
                      onEdit={() => setEditor(memory)}
                      onDelete={() => setDeleting(memory.id)}
                      onConfirmDelete={() => void remove(memory)}
                      onCancelDelete={() => setDeleting(null)}
                      onExpired={onExpired}
                    />
                  </li>
                ))}
              </ol>
            )}
            {data.totalPages > 1 && (
              <nav className="pagination" aria-label={content.timeline.pages}>
                <button
                  className="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  {content.timeline.newer}
                </button>
                <span>{content.timeline.page(page + 1, data.totalPages)}</span>
                <button
                  className="secondary"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {content.timeline.older}
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  )
}
