import { useState } from 'react'
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
  const [titleExpanded, setTitleExpanded] = useState(false)
  const [locationExpanded, setLocationExpanded] = useState(false)
  const [storyExpanded, setStoryExpanded] = useState(false)
  const longTitle = memory.title.length > 48
  const longLocation = (memory.locationName?.length ?? 0) > 36
  const longStory = memory.story.length > 180 || memory.story.split('\n').length > 4

  return (
    <>
      <time dateTime={memory.memoryDate}>
        {dateFormatter.format(new Date(`${memory.memoryDate}T00:00:00Z`))}
      </time>
      <article className="memory-card" aria-labelledby={`memory-${memory.id}`}>
        {memory.locationName && (
          <p className="location">
            <button
              className={`memory-text-toggle location-text${locationExpanded ? ' expanded' : ''}`}
              aria-expanded={longLocation ? locationExpanded : undefined}
              onClick={() => longLocation && setLocationExpanded((expanded) => !expanded)}
            >
              {memory.locationName}
            </button>
          </p>
        )}
        <h2 id={`memory-${memory.id}`}>
          <button
            className={`memory-text-toggle title-text${titleExpanded ? ' expanded' : ''}`}
            aria-expanded={longTitle ? titleExpanded : undefined}
            onClick={() => longTitle && setTitleExpanded((expanded) => !expanded)}
          >
            {memory.title}
          </button>
        </h2>
        <p className={`story${storyExpanded ? ' expanded' : ''}`}>{memory.story}</p>
        {longStory && (
          <button
            className="text-button story-toggle"
            aria-expanded={storyExpanded}
            onClick={() => setStoryExpanded((expanded) => !expanded)}
          >
            {storyExpanded ? 'Visa mindre' : 'Läs mer'}
          </button>
        )}
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
