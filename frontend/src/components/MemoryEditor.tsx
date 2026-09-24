import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, errorMessage } from '../api'
import type { Memory, MemoryInput } from '../api'
import { MemoryGallery } from './MemoryGallery'
import './MemoryEditor.css';

type Attachment = { file: File; preview: string }

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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const pending = useRef<Attachment[]>([])
  const [imageRevision, setImageRevision] = useState(0)
  useEffect(() => () => pending.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])

  function replaceAttachments(next: Attachment[]) {
    pending.current
      .filter((item) => !next.includes(item))
      .forEach((item) => URL.revokeObjectURL(item.preview))
    pending.current = next
    setAttachments(next)
  }

  function attach(files: FileList | null) {
    if (!files?.length) return
    const selected = Array.from(files)
    if (selected.some((file) => !['image/jpeg', 'image/png'].includes(file.type))) {
      setError('Välj bilder i JPEG- eller PNG-format.')
      return
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      setError('Varje bild får vara högst 10 MB.')
      return
    }
    if (pending.current.length + selected.length > 10) {
      setError('Välj högst 10 bilder åt gången.')
      return
    }
    replaceAttachments([
      ...pending.current,
      ...selected.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ])
    setDirty(true)
    setError('')
  }

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
    let saved = false
    try {
      const result = await api.save(draft, current)
      setCurrent(result)
      saved = true

      const toUpload = [...pending.current]
      for (const attachment of toUpload) {
        await api.uploadImage(result.id, attachment.file)
        replaceAttachments(pending.current.filter((item) => item !== attachment))
      }

      if (toUpload.length > 0) {
        setImageRevision((value) => value + 1)
      }

      setDirty(false)
      onSaved()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else {
        setError(
          (saved ? 'Minnet har sparats, men en bild kunde inte laddas upp. ' : '') +
            errorMessage(cause),
        )
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
      setDirty(pending.current.length > 0)
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
          <label htmlFor="images">
            Bilder <span className="optional">(valfritt)</span>
          </label>
          <input
            id="images"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            aria-describedby="image-help"
            onChange={(event) => {
              attach(event.target.files)
              event.target.value = ''
            }}
          />
          <p id="image-help" className="image-help">
            JPEG eller PNG. Högst 10 MB per bild och 10 bilder per minne.
          </p>
          {current && (
            <MemoryGallery
              memoryId={current.id}
              title={draft.title}
              editable
              disabled={busy}
              revision={imageRevision}
              onExpired={onExpired}
            />
          )}
          {attachments.length > 0 && (
            <ul className="pending-gallery" aria-label="Bilder att spara">
              {attachments.map((item) => (
                <li key={item.preview}>
                  <img src={item.preview} alt={`Förhandsvisning av ${item.file.name}`} />
                  <span className="pending-image-name">{item.file.name}</span>
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Ta bort ${item.file.name}`}
                    onClick={() =>
                      replaceAttachments(
                        pending.current.filter((attachment) => attachment !== item),
                      )
                    }
                  >
                    Ta bort
                  </button>
                </li>
              ))}
            </ul>
          )}
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