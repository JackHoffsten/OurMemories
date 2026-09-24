import { useEffect, useRef, useState } from 'react'
import { api, ApiError, errorMessage, imageUrl } from '../api'
import type { MemoryImage } from '../api'
import './MemoryGallery.css'
import { ChevronIcon } from '../icons'

export function MemoryGallery({
  memoryId,
  title,
  editable = false,
  revision = 0,
  disabled = false,
  onExpired,
}: {
  memoryId: string
  title: string
  editable?: boolean
  revision?: number
  disabled?: boolean
  onExpired: () => void
}) {
  const [images, setImages] = useState<MemoryImage[]>([])
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [current, setCurrent] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
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
      setCurrent((prev) => (prev === index ? prev : index))
    }
    list.addEventListener('scroll', onScroll, { passive: true })
    return () => list.removeEventListener('scroll', onScroll)
  }, [images.length])

  useEffect(() => {
    if (images.length === 0) {
      setCurrent(0)
      return
    }
    setCurrent((c) => Math.min(c, images.length - 1))
  }, [images.length])

  useEffect(() => {
    const list = listRef.current
    if (!list || images.length === 0) return
    list.scrollTo({ left: current * list.clientWidth, behavior: 'auto' })
  }, [images.length, current])

  function goTo(index: number) {
    const list = listRef.current
    if (!list) return
    const clamped = Math.max(0, Math.min(index, images.length - 1))
    list.scrollTo({ left: clamped * list.clientWidth, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!window.confirm('Vill du ta bort bilden för alltid?')) return
    setRemoving(id)
    try {
      await api.deleteImage(memoryId, id)
      setImages((previous) => previous.filter((image) => image.id !== id))
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
          Bilderna kunde inte visas. {error}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Försök igen
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
              aria-label="Föregående bild"
            >
              <ChevronIcon direction="left" />
            </button>
          )}
          <ul
            className="memory-gallery"
            ref={listRef}
            aria-label="Bilder till minnet"
          >
            {images.map((image, index) => (
              <li key={image.id}>
                <a
                  href={imageUrl(memoryId, image.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Öppna bild ${index + 1} till ${title}`}
                >
                  <img
                    src={imageUrl(memoryId, image.id)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={image.width}
                    height={image.height}
                  />
                </a>
                {editable && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={disabled || removing !== null}
                    onClick={() => void remove(image.id)}
                    aria-label={`Ta bort bild ${index + 1}`}
                  >
                    {removing === image.id ? 'Tar bort…' : 'Ta bort bild'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {images.length > 1 && (
            <button
              type="button"
              className="gallery-arrow gallery-arrow--next"
              onClick={() => goTo(current + 1)}
              disabled={current === images.length - 1}
              aria-label="Nästa bild"
            >
              <ChevronIcon direction="right" />
            </button>
          )}
        </div>
      )}
    </>
  )
}