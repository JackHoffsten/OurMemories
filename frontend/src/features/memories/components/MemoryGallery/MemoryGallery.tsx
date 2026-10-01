import { useEffect, useRef, useState } from 'react'
import { memoriesApi, imageUrl } from '../../api'
import { ApiError, errorMessage } from '../../../../shared/api/client'
import type { MemoryImage } from '../../types'
import './MemoryGallery.css'
import { ChevronIcon } from '../../../../shared/components/ChevronIcon'
import { content } from '../../../../config/content'
import { ImageDescription } from './ImageDescription'

export function MemoryGallery({
  memoryId,
  title,
  editable = false,
  revision = 0,
  disabled = false,
  onExpired,
  descriptions = {},
  onDescriptionChange,
}: {
  memoryId: string
  title: string
  editable?: boolean
  revision?: number
  disabled?: boolean
  onExpired: () => void
  descriptions?: Record<string, string>
  onDescriptionChange?: (id: string, description: string | undefined) => void
}) {
  const [images, setImages] = useState<MemoryImage[]>([])
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [position, setCurrent] = useState(0)
  const current = Math.max(0, Math.min(position, images.length - 1))
  const listRef = useRef<HTMLUListElement>(null)
  const positionRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    memoriesApi
      .images(memoryId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setImages(result)
          setError('')
        }
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 401) onExpired()
        else setError(errorMessage(cause))
      })
    return () => controller.abort()
  }, [memoryId, revision, retry, onExpired])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    function onScroll() {
      if (list === null) return
      const width = list.clientWidth
      if (width === 0) return
      const index = Math.round(list.scrollLeft / width)
      positionRef.current = index
      setCurrent((prev) => (prev === index ? prev : index))
    }
    list.addEventListener('scroll', onScroll, { passive: true })
    return () => list.removeEventListener('scroll', onScroll)
  }, [images.length])

  useEffect(() => {
    const list = listRef.current
    if (!list || images.length === 0) return
    const align = () => {
      const index = Math.min(positionRef.current, images.length - 1)
      list.scrollTo({ left: index * list.clientWidth, behavior: 'instant' })
    }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(list)
    return () => observer.disconnect()
  }, [images.length])

  function goTo(index: number) {
    const list = listRef.current
    if (!list) return
    const clamped = Math.max(0, Math.min(index, images.length - 1))
    list.scrollTo({
      left: clamped * list.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }

  async function remove(id: string) {
    if (!window.confirm(content.gallery.confirmRemove)) return
    setRemoving(id)
    try {
      await memoriesApi.deleteImage(memoryId, id)
      setImages((previous) => previous.filter((image) => image.id !== id))
      onDescriptionChange?.(id, undefined)
      setError('')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else setError(errorMessage(cause))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      {error && (
        <p className="notice" role="alert">
          {content.gallery.loadFailed} {error}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            {content.gallery.retry}
          </button>
        </p>
      )}

      {images.length > 0 && (
        <div className="memory-gallery-wrap">
          {images.length > 1 && (
            <button
              type="button"
              className="gallery-arrow gallery-arrow--prev"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              aria-label={content.gallery.previous}
            >
              <ChevronIcon direction="left" />
            </button>
          )}
          <ul className="memory-gallery" ref={listRef} aria-label={content.gallery.imagesLabel}>
            {images.map((image, index) => (
              <li key={image.id}>
                <a
                  href={imageUrl(memoryId, image.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={content.gallery.openLabel(index + 1, title)}
                >
                  <img
                    src={imageUrl(memoryId, image.id)}
                    alt={image.description || ''}
                    loading="lazy"
                    decoding="async"
                    width={image.width}
                    height={image.height}
                  />
                </a>
                {editable ? (
                  <div className="image-description-editor">
                    <label htmlFor={`image-description-${image.id}`}>
                      {content.gallery.description}
                    </label>
                    <textarea
                      id={`image-description-${image.id}`}
                      aria-label={content.gallery.descriptionLabel(index + 1)}
                      maxLength={1000}
                      rows={2}
                      value={descriptions[image.id] ?? image.description ?? ''}
                      disabled={disabled || removing !== null}
                      onChange={(event) => onDescriptionChange?.(image.id, event.target.value)}
                    />
                  </div>
                ) : (
                  image.description && <ImageDescription value={image.description} />
                )}
                {editable && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={disabled || removing !== null}
                    onClick={() => void remove(image.id)}
                    aria-label={content.gallery.removeLabel(index + 1)}
                  >
                    {removing === image.id ? content.gallery.removing : content.gallery.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {images.length > 1 && (
            <p className="gallery-position" aria-live="polite" aria-atomic="true">
              {content.gallery.position(current + 1, images.length)}
            </p>
          )}
          {images.length > 1 && (
            <button
              type="button"
              className="gallery-arrow gallery-arrow--next"
              onClick={() => goTo(current + 1)}
              disabled={current === images.length - 1}
              aria-label={content.gallery.next}
            >
              <ChevronIcon direction="right" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
