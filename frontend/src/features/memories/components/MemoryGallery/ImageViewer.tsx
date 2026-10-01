import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { imageUrl } from '../../api'
import type { MemoryImage } from '../../types'
import { content } from '../../../../config/content'
import './ImageViewer.css'

export function ImageViewer({
  memoryId,
  image,
  onClose,
}: {
  memoryId: string
  image: MemoryImage
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
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
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <img
        src={imageUrl(memoryId, image.id)}
        alt={image.description || ''}
        width={image.width}
        height={image.height}
      />
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
