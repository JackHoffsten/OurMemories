import { useLayoutEffect, useRef, useState } from 'react'

export function ExpandableText({
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
