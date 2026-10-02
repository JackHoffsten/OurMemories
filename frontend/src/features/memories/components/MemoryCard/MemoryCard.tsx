import { useState } from 'react'
import type { Memory } from '../../types'
import { ExpandableText } from '../ExpandableText'
import './MemoryCard.css'
import { MemoryGallery } from '../MemoryGallery/MemoryGallery'
import { content } from '../../../../config/content'

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
  const [storyExpanded, setStoryExpanded] = useState(false)
  const storyPreview = Array.from(memory.story.replace(/\s+/g, ' ').trim())
  const longStory = storyPreview.length > 220 || memory.story.split('\n').length > 4

  return (
    <>
      <time dateTime={memory.memoryDate}>
        {dateFormatter.format(new Date(`${memory.memoryDate}T00:00:00Z`))}
      </time>
      <article className="memory-card" aria-labelledby={`memory-${memory.id}`}>
        {memory.locationName && (
          <p className="location">
            <ExpandableText
              value={memory.locationName}
              className="location-text"
              likelyOverflowing={Array.from(memory.locationName).length > 36}
            />
          </p>
        )}
        <h2 id={`memory-${memory.id}`}>
          <ExpandableText
            value={memory.title}
            className="title-text"
            likelyOverflowing={Array.from(memory.title).length > 48}
          />
        </h2>
        <p
          className={`story${storyExpanded ? ' expanded' : ''}`}
          onClick={storyExpanded ? () => setStoryExpanded(false) : undefined}
        >
          {longStory && !storyExpanded
            ? `${storyPreview.slice(0, 220).join('').trimEnd()}…`
            : memory.story}
          {longStory && (
            <>
              {' '}
              <button
                type="button"
                className="text-button story-toggle"
                aria-expanded={storyExpanded}
                onClick={(event) => {
                  event.stopPropagation()
                  setStoryExpanded((expanded) => !expanded)
                }}
              >
                {storyExpanded ? content.memory.readLess : content.memory.readMore}
              </button>
            </>
          )}
        </p>
        <MemoryGallery memoryId={memory.id} title={memory.title} onExpired={onExpired} />
        <p className="memory-creator">{content.memory.createdBy(memory.createdBy)}</p>
        {deleting ? (
          <div className="delete-confirmation">
            <p>{content.memory.deleteQuestion(memory.title)}</p>
            <button className="danger" disabled={busy} onClick={onConfirmDelete}>
              {busy ? content.memory.deleting : content.memory.confirmDelete}
            </button>
            <button className="text-button" disabled={busy} onClick={onCancelDelete}>
              {content.memory.keep}
            </button>
          </div>
        ) : (
          <div className="card-actions">
            <button
              className="text-button"
              aria-label={content.memory.editLabel(memory.title)}
              onClick={onEdit}
            >
              {content.memory.edit}
            </button>
            <button
              className="text-button"
              aria-label={content.memory.deleteLabel(memory.title)}
              onClick={onDelete}
            >
              {content.memory.delete}
            </button>
          </div>
        )}
      </article>
    </>
  )
}
