import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, errorMessage } from '../api'
import type { Memory, MemoryInput } from '../api'

function content(memory: Memory): MemoryInput {
  return {
    title: memory.title,
    story: memory.story,
    memoryDate: memory.memoryDate,
    locationName: memory.locationName,
  }
}

export function MemoryEditor({
  memory,
  onSaved,
  onCancel,
  onExpired,
}: {
  memory?: Memory
  onSaved: () => void
  onCancel: () => void
  onExpired: () => void
}) {
  const [current, setCurrent] = useState(memory)
  const [draft, setDraft] = useState<MemoryInput>(
    memory ? content(memory) : { title: '', story: '', memoryDate: '', locationName: '' },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [dirty, setDirty] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function change(field: keyof MemoryInput, value: string) {
    setDirty(true)
    setDraft((previous) => ({ ...previous, [field]: value }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.save(draft, current)
      setDirty(false)
      onSaved()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else {
        setError(errorMessage(cause))
        setConflict(cause instanceof ApiError && cause.status === 409)
      }
    } finally {
      setBusy(false)
    }
  }
  async function reload() {
    if (
      !current ||
      !window.confirm('Vill du ersätta ditt utkast med den senast sparade versionen?')
    )
      return
    setBusy(true)
    try {
      const latest = await api.memory(current.id)
      setCurrent(latest)
      setDraft(content(latest))
      setDirty(false)
      setConflict(false)
      setError('')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="editor" aria-labelledby="editor-title">
      <p className="eyebrow">en liten anteckning till oss</p>
      <h1 id="editor-title" tabIndex={-1} ref={heading}>
        {memory ? 'Några fler detaljer…' : 'Minns du när…'}
      </h1>
      <p className="lede">Skriv ner det precis som du minns det.</p>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {conflict && (
        <button type="button" className="secondary" disabled={busy} onClick={() => void reload()}>
          Hämta sparad version
        </button>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="title">Ge minnet en rubrik</label>
          <input
            id="title"
            required
            maxLength={120}
            value={draft.title}
            onChange={(event) => change('title', event.target.value)}
          />
          <div className="form-row">
            <div>
              <label htmlFor="memory-date">När var det?</label>
              <input
                id="memory-date"
                type="date"
                required
                value={draft.memoryDate}
                onChange={(event) => change('memoryDate', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="location">
                Var? <span className="optional">(valfritt)</span>
              </label>
              <input
                id="location"
                maxLength={200}
                value={draft.locationName ?? ''}
                onChange={(event) => change('locationName', event.target.value)}
              />
            </div>
          </div>
          <label htmlFor="story">Berätta om minnet</label>
          <textarea
            id="story"
            required
            maxLength={10000}
            rows={8}
            value={draft.story}
            onChange={(event) => change('story', event.target.value)}
          />
          <div className="form-actions">
            <button className="primary" disabled={conflict}>
              {busy ? 'Sparar…' : 'Spara minnet'}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (!dirty || window.confirm('Vill du slänga dina osparade ändringar?')) onCancel()
              }}
            >
              Avbryt
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
