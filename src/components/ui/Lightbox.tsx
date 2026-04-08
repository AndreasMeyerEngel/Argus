import React, { useEffect, useCallback, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'

interface LightboxProps {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

export function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const prev = useCallback(() => { setIdx(i => (i - 1 + images.length) % images.length); setScale(1); setOffset({ x: 0, y: 0 }) }, [images.length])
  const next = useCallback(() => { setIdx(i => (i + 1) % images.length); setScale(1); setOffset({ x: 0, y: 0 }) }, [images.length])
  const zoomIn  = () => setScale(s => Math.min(s + 0.5, 5))
  const zoomOut = () => setScale(s => { const n = Math.max(s - 0.5, 1); if (n === 1) setOffset({ x: 0, y: 0 }); return n })
  const reset   = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  const download = () => {
    const a = document.createElement('a')
    a.href = images[idx]
    a.download = `evidencia-${idx + 1}.png`
    a.click()
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onClose])

  // Scroll to zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
  }

  // Drag to pan when zoomed
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const onMouseUp = () => setDragging(false)

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-black/60 backdrop-blur-sm">
        <span className="text-sm text-white/60 font-mono">
          {idx + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <ToolBtn onClick={zoomOut} disabled={scale <= 1} title="Zoom out (-)"><ZoomOut size={16} /></ToolBtn>
          <button
            onClick={reset}
            className="px-2.5 py-1.5 text-xs font-mono text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors min-w-[48px] text-center"
            title="Reset zoom (0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <ToolBtn onClick={zoomIn} disabled={scale >= 5} title="Zoom in (+)"><ZoomIn size={16} /></ToolBtn>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <ToolBtn onClick={download} title="Baixar imagem"><Download size={16} /></ToolBtn>
          <ToolBtn onClick={onClose} title="Fechar (Esc)"><X size={16} /></ToolBtn>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={images[idx]}
          alt={`Evidência ${idx + 1}`}
          draggable={false}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          }}
          onDoubleClick={() => scale === 1 ? zoomIn() : reset()}
        />

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip (se mais de 1 imagem) */}
      {images.length > 1 && (
        <div className="flex gap-2 justify-center py-3 px-4 shrink-0 bg-black/60 backdrop-blur-sm overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setScale(1); setOffset({ x: 0, y: 0 }) }}
              className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === idx ? 'border-accent' : 'border-transparent opacity-50 hover:opacity-80'}`}
            >
              <img src={img} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Hint bar */}
      <div className="text-center py-1.5 text-xs text-white/25 shrink-0">
        Duplo clique para zoom · Scroll para zoom · Arraste para mover · Esc para fechar
      </div>
    </div>
  )
}

function ToolBtn({ onClick, disabled, title, children }: {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-default transition-colors"
    >
      {children}
    </button>
  )
}
