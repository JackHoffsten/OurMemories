import type { Memory } from '../api'
import { MemoryGallery } from './MemoryGallery'

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function MemoryCard({
  memory,
  deleting,
  busy,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onExpired,
}: {
  memory: Memory
  deleting: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onExpired: () => void
}) {
  return (
    <>
      <time dateTime={memory.memoryDate}>
        {dateFormatter.format(new Date(`${memory.memoryDate}T00:00:00Z`))}
      </time>
      <article className="memory-card" aria-labelledby={`memory-${memory.id}`}>
        {memory.locationName && (
          <p className="location" title={memory.locationName}>
            {memory.locationName}
          </p>
        )}
        <h2 id={`memory-${memory.id}`} title={memory.title}>
          {memory.title}
        </h2>
        <p className="story" title={memory.story}>
          {memory.story}
        </p>
        <MemoryGallery memoryId={memory.id} title={memory.title} onExpired={onExpired} />
        {deleting ? (
          <div className="delete-confirmation">
            <p>Vill du ta bort ”{memory.title}” och alla dess bilder för alltid?</p>
            <button className="danger" disabled={busy} onClick={onConfirmDelete}>
              {busy ? 'Tar bort…' : 'Ja, ta bort minnet'}
            </button>
            <button className="text-button" disabled={busy} onClick={onCancelDelete}>
              Behåll minnet
            </button>
          </div>
        ) : (
          <div className="card-actions">
            <button
              className="text-button"
              aria-label={`Redigera ${memory.title}`}
              onClick={onEdit}
            >
              Redigera minnet
            </button>
            <button
              className="text-button"
              aria-label={`Ta bort ${memory.title}`}
              onClick={onDelete}
            >
              Ta bort
            </button>
          </div>
        )}
      </article>
    </>
  )
}
