import { useLayoutEffect, useRef, useState } from 'react'
import type { Memory } from '../api'
import { MemoryGallery } from './MemoryGallery'

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function ExpandableText({
  value,
  className,
  likelyOverflowing,
}: {
  value: string
  className: string
  likelyOverflowing: boolean
}) {
  const contentRef = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(likelyOverflowing)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content || expanded) {
      return
    }

    const measureOverflow = () => {
      if (content.clientWidth === 0) {
        return
      }

      setOverflowing(
        content.scrollHeight > content.clientHeight + 1 ||
          content.scrollWidth > content.clientWidth + 1,
      )
    }

    measureOverflow()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(measureOverflow)
    observer.observe(content)
    return () => observer.disconnect()
  }, [expanded, overflowing, value])

  const classes = `memory-text-toggle ${className}${expanded ? ' expanded' : ''}`
  const content = (
    <span ref={contentRef} className="memory-text-content">
      {value}
    </span>
  )

  if (!overflowing) {
    return <span className={classes}>{content}</span>
  }

  return (
    <button
      className={classes}
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    >
      {content}
    </button>
  )
}

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
        <p className={`story${storyExpanded ? ' expanded' : ''}`}>
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
                onClick={() => setStoryExpanded((expanded) => !expanded)}
              >
                {storyExpanded ? 'Visa mindre' : 'Läs mer'}
              </button>
            </>
          )}
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
