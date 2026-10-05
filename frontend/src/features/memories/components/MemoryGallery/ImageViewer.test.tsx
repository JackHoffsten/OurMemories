import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ImageViewer } from './ImageViewer'

afterEach(cleanup)

it('shows only the selected image and close button and restores scrolling', () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
  const onClose = vi.fn()
  const images = ['First caption', 'Second caption'].map((description, index) => ({
    id: String(index),
    description,
    contentType: 'image/png',
    width: 10,
    height: 10,
    size: 100,
  }))
  const { unmount } = render(
    <ImageViewer
      memoryId="memory"

      images={images}
      initialIndex={1}

      onClose={onClose}
    />,
  )
  expect(document.body.style.overflow).toBe('hidden')
  expect(screen.getByAltText('Second caption')).toBeTruthy()
  expect(screen.queryByText('Second caption')).toBeNull()
  expect((screen.getByRole('button', { name: 'Nästa bild' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Föregående bild' }))
  expect(screen.getByAltText('First caption')).toBeTruthy()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })
  expect(screen.getByAltText('Second caption')).toBeTruthy()
  fireEvent.touchStart(screen.getByRole('img'), { touches: [{ clientX: 80, clientY: 100 }] })
  fireEvent.touchEnd(screen.getByRole('img'), {
    touches: [],
    changedTouches: [{ clientX: 200, clientY: 100 }],
  })
  expect(screen.getByAltText('First caption')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Stäng bildvisaren' }))
  expect(onClose).toHaveBeenCalledOnce()
  unmount()
  expect(document.body.style.overflow).toBe('')
})
