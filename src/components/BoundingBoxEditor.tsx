// BoundingBoxEditor Component
// Reusable component for editing food bounding boxes on images

import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface BoundingBoxEditorProps {
  originalImage: string
  initialBox: BoundingBox
  onSave: (box: BoundingBox) => void
  onCancel: () => void
}

export function BoundingBoxEditor({
  originalImage,
  initialBox,
  onSave,
  onCancel
}: BoundingBoxEditorProps) {
  const [editedBox, setEditedBox] = useState<BoundingBox>(initialBox)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [dragMode, setDragMode] = useState<'none' | 'corner' | 'edge' | 'sketch' | 'pinch'>('none')
  const [dragStart, setDragStart] = useState<{ x: number; y: number; bbox: BoundingBox; corner?: string; edge?: string } | null>(null)

  const imageRef = useRef<HTMLImageElement>(null)
  const touchStartRef = useRef<{ touches: Touch[]; bbox: BoundingBox } | null>(null)

  // Load image dimensions
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height })
    }
    img.src = originalImage
  }, [originalImage])

  // Prevent browser zoom and scroll when actively manipulating
  useEffect(() => {
    if (dragMode === 'none') return

    const preventScrollAndZoom = (e: TouchEvent) => {
      e.preventDefault()
    }

    document.addEventListener('touchmove', preventScrollAndZoom, { passive: false })
    return () => {
      document.removeEventListener('touchmove', preventScrollAndZoom)
    }
  }, [dragMode])

  // Helper: Convert touch coordinates to image coordinates
  const touchToImageCoords = (touch: Touch): { x: number; y: number } | null => {
    if (!imageRef.current || !imageDimensions) return null

    const container = imageRef.current.parentElement
    if (!container) return null

    const containerRect = container.getBoundingClientRect()
    const imageAspect = imageDimensions.width / imageDimensions.height
    const containerAspect = containerRect.width / containerRect.height

    let renderedWidth: number, renderedHeight: number, offsetX: number, offsetY: number

    if (imageAspect > containerAspect) {
      renderedWidth = containerRect.width
      renderedHeight = containerRect.width / imageAspect
      offsetX = 0
      offsetY = (containerRect.height - renderedHeight) / 2
    } else {
      renderedHeight = containerRect.height
      renderedWidth = containerRect.height * imageAspect
      offsetX = (containerRect.width - renderedWidth) / 2
      offsetY = 0
    }

    const touchX = touch.clientX - containerRect.left - offsetX
    const touchY = touch.clientY - containerRect.top - offsetY

    const scaleX = imageDimensions.width / renderedWidth
    const scaleY = imageDimensions.height / renderedHeight

    return {
      x: touchX * scaleX,
      y: touchY * scaleY,
    }
  }

  // Helper: Detect which part of bbox is touched
  const detectTouchTarget = (touchX: number, touchY: number, bbox: BoundingBox): { type: 'corner' | 'edge' | 'inside' | 'outside'; detail?: string } => {
    const hitRadius = 30

    // Check corners
    const corners = {
      'top-left': { x: bbox.x, y: bbox.y },
      'top-right': { x: bbox.x + bbox.width, y: bbox.y },
      'bottom-left': { x: bbox.x, y: bbox.y + bbox.height },
      'bottom-right': { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    }

    for (const [name, corner] of Object.entries(corners)) {
      const dist = Math.sqrt(Math.pow(touchX - corner.x, 2) + Math.pow(touchY - corner.y, 2))
      if (dist < hitRadius) {
        return { type: 'corner', detail: name }
      }
    }

    // Check edges
    if (Math.abs(touchX - bbox.x) < hitRadius && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'edge', detail: 'left' }
    }
    if (Math.abs(touchX - (bbox.x + bbox.width)) < hitRadius && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'edge', detail: 'right' }
    }
    if (Math.abs(touchY - bbox.y) < hitRadius && touchX >= bbox.x && touchX <= bbox.x + bbox.width) {
      return { type: 'edge', detail: 'top' }
    }
    if (Math.abs(touchY - (bbox.y + bbox.height)) < hitRadius && touchX >= bbox.x && touchX <= bbox.x + bbox.width) {
      return { type: 'edge', detail: 'bottom' }
    }

    // Check inside
    if (touchX >= bbox.x && touchX <= bbox.x + bbox.width && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'inside' }
    }

    return { type: 'outside' }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageDimensions) return

    // Multi-touch - pinch/pan mode
    if (e.touches.length >= 2) {
      e.preventDefault()
      setDragMode('pinch')
      touchStartRef.current = {
        touches: Array.from(e.touches),
        bbox: { ...editedBox },
      }
      return
    }

    // Single touch
    const coords = touchToImageCoords(e.touches[0])
    if (!coords) return

    const target = detectTouchTarget(coords.x, coords.y, editedBox)

    if (target.type === 'corner') {
      e.preventDefault()
      setDragMode('corner')
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBox }, corner: target.detail })
    } else if (target.type === 'edge') {
      e.preventDefault()
      setDragMode('edge')
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBox }, edge: target.detail })
    } else if (target.type === 'inside') {
      e.preventDefault()
    } else if (target.type === 'outside') {
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBox } })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageDimensions) return

    // Intent detection for sketch mode
    if (dragMode === 'none' && dragStart && e.touches.length === 1) {
      const coords = touchToImageCoords(e.touches[0])
      if (!coords) return

      const deltaX = Math.abs(coords.x - dragStart.x)
      const deltaY = Math.abs(coords.y - dragStart.y)
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (totalMovement > 20) {
        const verticalRatio = deltaY / (deltaX + 1)

        if (verticalRatio > 2) {
          setDragStart(null)
          return
        } else {
          e.preventDefault()
          setDragMode('sketch')
          setEditedBox({ x: dragStart.x, y: dragStart.y, width: 0, height: 0 })
        }
      } else {
        return
      }
    }

    if (dragMode !== 'none') {
      e.preventDefault()
    }

    // Handle pinch mode
    if (dragMode === 'pinch' && touchStartRef.current && e.touches.length >= 2) {
      const touches = Array.from(e.touches)
      const startTouches = touchStartRef.current.touches
      const startBbox = touchStartRef.current.bbox

      if (startTouches.length < 2) return

      const container = imageRef.current?.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const imageAspect = imageDimensions.width / imageDimensions.height
      const containerAspect = containerRect.width / containerRect.height

      let renderedWidth: number, renderedHeight: number
      if (imageAspect > containerAspect) {
        renderedWidth = containerRect.width
        renderedHeight = containerRect.width / imageAspect
      } else {
        renderedHeight = containerRect.height
        renderedWidth = containerRect.height * imageAspect
      }

      const scaleX = imageDimensions.width / renderedWidth
      const scaleY = imageDimensions.height / renderedHeight

      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))

      const startDistance = getDistance(startTouches[0], startTouches[1])
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / startDistance

      const getMidpoint = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      })

      const startMidpoint = getMidpoint(startTouches[0], startTouches[1])
      const currentMidpoint = getMidpoint(touches[0], touches[1])
      const deltaX = (currentMidpoint.x - startMidpoint.x) * scaleX
      const deltaY = (currentMidpoint.y - startMidpoint.y) * scaleY

      const newWidth = Math.max(50, Math.min(imageDimensions.width, startBbox.width * scale))
      const newHeight = Math.max(50, Math.min(imageDimensions.height, startBbox.height * scale))
      const centerX = startBbox.x + startBbox.width / 2
      const centerY = startBbox.y + startBbox.height / 2

      let newX = centerX - newWidth / 2 + deltaX
      let newY = centerY - newHeight / 2 + deltaY

      newX = Math.max(0, Math.min(imageDimensions.width - newWidth, newX))
      newY = Math.max(0, Math.min(imageDimensions.height - newHeight, newY))

      setEditedBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      })
      return
    }

    // Handle single-finger modes
    if (!dragStart || e.touches.length !== 1) return

    const coords = touchToImageCoords(e.touches[0])
    if (!coords) return

    const deltaX = coords.x - dragStart.x
    const deltaY = coords.y - dragStart.y

    // Sketch mode
    if (dragMode === 'sketch') {
      const x1 = Math.min(dragStart.x, coords.x)
      const y1 = Math.min(dragStart.y, coords.y)
      const x2 = Math.max(dragStart.x, coords.x)
      const y2 = Math.max(dragStart.y, coords.y)

      setEditedBox({
        x: Math.max(0, x1),
        y: Math.max(0, y1),
        width: Math.min(imageDimensions.width - x1, x2 - x1),
        height: Math.min(imageDimensions.height - y1, y2 - y1),
      })
      return
    }

    // Corner dragging
    if (dragMode === 'corner') {
      const startBbox = dragStart.bbox
      let newBbox = { ...startBbox }

      switch (dragStart.corner) {
        case 'top-left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'top-right':
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'bottom-left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
        case 'bottom-right':
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
      }

      setEditedBox(newBbox)
      return
    }

    // Edge dragging
    if (dragMode === 'edge') {
      const startBbox = dragStart.bbox
      let newBbox = { ...startBbox }

      switch (dragStart.edge) {
        case 'left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          break
        case 'right':
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          break
        case 'top':
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'bottom':
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
      }

      setEditedBox(newBbox)
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    setDragMode('none')
    setDragStart(null)
  }

  if (!imageDimensions) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900">
        <h3 className="text-white font-semibold">Edit Bounding Box</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={() => onSave(editedBox)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Image with overlay */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          touchAction: dragMode === 'none' ? 'pan-y' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={originalImage}
          alt="Edit bounding box"
          className="max-w-full max-h-full object-contain"
        />

        {/* SVG Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="relative"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`
            }}
          >
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ display: 'block' }}
            >
              {/* Darken outside */}
              <defs>
                <mask id="bbox-mask">
                  <rect width={imageDimensions.width} height={imageDimensions.height} fill="white" />
                  <rect
                    x={editedBox.x}
                    y={editedBox.y}
                    width={editedBox.width}
                    height={editedBox.height}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width={imageDimensions.width} height={imageDimensions.height} fill="black" opacity="0.6" mask="url(#bbox-mask)" />

              {/* Bounding box */}
              <rect
                x={editedBox.x}
                y={editedBox.y}
                width={editedBox.width}
                height={editedBox.height}
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray="10,5"
              />

              {/* Edge handles */}
              <circle cx={editedBox.x} cy={editedBox.y + editedBox.height / 2} r="6" fill="#10b981" stroke="white" strokeWidth="2" />
              <circle cx={editedBox.x + editedBox.width} cy={editedBox.y + editedBox.height / 2} r="6" fill="#10b981" stroke="white" strokeWidth="2" />
              <circle cx={editedBox.x + editedBox.width / 2} cy={editedBox.y} r="6" fill="#10b981" stroke="white" strokeWidth="2" />
              <circle cx={editedBox.x + editedBox.width / 2} cy={editedBox.y + editedBox.height} r="6" fill="#10b981" stroke="white" strokeWidth="2" />

              {/* Corner handles */}
              <circle cx={editedBox.x} cy={editedBox.y} r="12" fill="#10b981" stroke="white" strokeWidth="3" />
              <circle cx={editedBox.x + editedBox.width} cy={editedBox.y} r="12" fill="#10b981" stroke="white" strokeWidth="3" />
              <circle cx={editedBox.x} cy={editedBox.y + editedBox.height} r="12" fill="#10b981" stroke="white" strokeWidth="3" />
              <circle cx={editedBox.x + editedBox.width} cy={editedBox.y + editedBox.height} r="12" fill="#10b981" stroke="white" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-900 text-white text-sm text-center">
        <p>Drag corners or edges to adjust • Pinch to scale • Draw outside to sketch new box</p>
      </div>
    </div>
  )
}
