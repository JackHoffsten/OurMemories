import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage, imageUrl } from '../api'
import type { MemoryImage } from '../api'
import './MemoryGallery.css'

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
        <ul className="memory-gallery" aria-label="Bilder till minnet">
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
                  alt={`Bild ${index + 1} till ${title}`}
                  loading="lazy"
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
      )}
    </>
  )
}
