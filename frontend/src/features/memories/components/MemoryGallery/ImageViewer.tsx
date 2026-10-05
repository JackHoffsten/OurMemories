import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { imageUrl } from '../../api'
import type { MemoryImage } from '../../types'
import { content } from '../../../../config/content'
import { ChevronIcon } from '../../../../shared/components/ChevronIcon'
import './ImageViewer.css'

export function ImageViewer({
  memoryId,
  images,
  initialIndex,
  onClose,
}: {
  memoryId: string
  images: MemoryImage[]
  initialIndex: number
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(initialIndex)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const image = images[Math.min(index, images.length - 1)]
  function move(direction: number) {
    setIndex((previous) => Math.max(0, Math.min(images.length - 1, previous + direction)))
  }
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      dialog.close()
    }
  }, [])
  return createPortal(
    <dialog
      ref={dialogRef}
      className="image-viewer"
      aria-label={content.gallery.imagesLabel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          move(-1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          move(1)
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <img
        onTouchStart={(event) => {
          touchStart.current =
            event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start || event.touches.length > 0 || event.changedTouches.length !== 1) return
          const dx = event.changedTouches[0].clientX - start.x
          const dy = event.changedTouches[0].clientY - start.y
          if (
            Math.abs(dx) > 60 &&
            Math.abs(dx) > Math.abs(dy) * 1.5 &&
            (window.visualViewport?.scale ?? 1) <= 1
          )
            move(dx < 0 ? 1 : -1)
        }}
        onTouchCancel={() => {
          touchStart.current = null
        }}
        src={imageUrl(memoryId, image.id)}
        alt={image.description || ''}
        width={image.width}
        height={image.height}
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="viewer-arrow viewer-arrow-prev"
            disabled={index === 0}
            aria-label={content.gallery.previous}
            onClick={() => move(-1)}
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            className="viewer-arrow viewer-arrow-next"
            disabled={index >= images.length - 1}
            aria-label={content.gallery.next}
            onClick={() => move(1)}
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}
      <button
        type="button"
        className="viewer-close"
        onClick={onClose}
        aria-label={content.gallery.closeViewer}
        autoFocus
      >
        <span aria-hidden="true">×</span>
      </button>
    </dialog>,
    document.body,
  )
}
