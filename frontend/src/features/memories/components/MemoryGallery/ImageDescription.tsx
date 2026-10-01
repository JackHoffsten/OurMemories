import { useLayoutEffect, useRef, useState } from 'react'
import { content } from '../../../../config/content'

export function ImageDescription({ value }: { value: string }) {
  const probeRef = useRef<HTMLParagraphElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const probe = probeRef.current
    if (!probe) return

    function measure() {
      if (!probe || probe.clientWidth === 0) return
      const style = getComputedStyle(probe)
      const maxHeight =
        Number.parseFloat(style.lineHeight) * 2 +
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom) +
        1
      probe.textContent = value
      if (probe.scrollHeight <= maxHeight) {
        setPreview(null)
        return
      }

      const characters = Array.from(value.replace(/\s+/g, ' ').trim())
      let start = 0
      let end = characters.length
      while (start < end) {
        const middle = Math.ceil((start + end) / 2)
        probe.textContent = `${characters.slice(0, middle).join('').trimEnd()}… ${content.memory.readMore}`
        if (probe.scrollHeight <= maxHeight) start = middle
        else end = middle - 1
      }
      setPreview(`${characters.slice(0, start).join('').trimEnd()}…`)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(probe)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [value])

  const canExpand = preview !== null
  return (
    <div className="image-description-wrap">
      <p className="image-description image-description-probe" ref={probeRef} aria-hidden="true" />
      <p
        className={`image-description${canExpand && expanded ? ' expanded' : ''}`}
        onClick={canExpand && expanded ? () => setExpanded(false) : undefined}
      >
        {canExpand && !expanded ? preview : value}
        {canExpand && (
          <>
            {' '}
            <button
              type="button"
              className="image-description-toggle"
              aria-expanded={expanded}
              onClick={(event) => {
                event.stopPropagation()
                setExpanded((previous) => !previous)
              }}
            >
              {expanded ? content.memory.readLess : content.memory.readMore}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
