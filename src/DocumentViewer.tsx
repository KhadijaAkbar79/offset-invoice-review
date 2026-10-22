import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { BBox, LoadedDocument, ReviewField } from './types'
import { labelFor } from './mockFields'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

interface Props {
  doc: LoadedDocument
  page: number
  fields: ReviewField[] // fields on the current page only
  selectedId: string | null
  drawMode: boolean
  onPageCount: (n: number) => void
  onSelect: (id: string) => void
  onDrawn: (bbox: BBox) => void
}

interface Size {
  w: number
  h: number
}

/**
 * Renders one page of a PDF (via pdf.js) or an image, and lays field boxes over it.
 * Boxes are positioned in percentages of the page's natural size, so the same
 * bbox lines up at any zoom or screen width.
 */
export function DocumentViewer({ doc, page, fields, selectedId, drawMode, onPageCount, onSelect, onDrawn }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [natural, setNatural] = useState<Size | null>(null) // page size in document units
  const [width, setWidth] = useState(0) // displayed width in CSS px
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<BBox | null>(null) // box being drawn

  // Track the available width so the page always fits the column.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load the PDF once per file.
  useEffect(() => {
    setError(null)
    setNatural(null)
    if (doc.kind !== 'pdf') {
      setPdf(null)
      onPageCount(1)
      return
    }
    let cancelled = false
    // pdf.js takes ownership of the buffer it is given, so hand it a copy.
    const task = pdfjs.getDocument({ data: doc.data.slice(0) })
    task.promise
      .then((loaded) => {
        if (cancelled) return
        setPdf(loaded)
        onPageCount(loaded.numPages)
      })
      .catch(() => !cancelled && setError('This PDF could not be opened. Try another file.'))
    return () => {
      cancelled = true
      task.destroy()
    }
  }, [doc, onPageCount])

  // Render the current PDF page whenever the page or the width changes.
  useEffect(() => {
    if (!pdf || !width || !canvasRef.current) return
    let cancelled = false
    let renderTask: RenderTask | null = null
    pdf.getPage(page).then((p) => {
      if (cancelled || !canvasRef.current) return
      const base = p.getViewport({ scale: 1 })
      setNatural({ w: base.width, h: base.height })
      const scale = width / base.width
      const ratio = window.devicePixelRatio || 1
      const viewport = p.getViewport({ scale: scale * ratio })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${width}px`
      canvas.style.height = `${base.height * scale}px`
      renderTask = p.render({ canvasContext: canvas.getContext('2d')!, viewport })
      renderTask.promise.catch(() => {})
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, page, width])

  // Convert a pointer position to document units.
  const toDoc = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const nx = natural!.w / r.width
    const ny = natural!.h / r.height
    return [(e.clientX - r.left) * nx, (e.clientY - r.top) * ny] as const
  }

  // The start corner lives in a ref so fast drags don't read stale state.
  const startRef = useRef<readonly [number, number] | null>(null)

  const startDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawMode || !natural) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = toDoc(e)
    startRef.current = [x, y]
    setDraft([x, y, x, y])
  }
  const moveDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    const [x, y] = toDoc(e)
    setDraft([start[0], start[1], x, y])
  }
  const endDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    startRef.current = null
    const [x, y] = toDoc(e)
    const box: BBox = [
      Math.round(Math.min(start[0], x)),
      Math.round(Math.min(start[1], y)),
      Math.round(Math.max(start[0], x)),
      Math.round(Math.max(start[1], y)),
    ]
    setDraft(null)
    // Ignore accidental clicks; a real box needs some area.
    if (box[2] - box[0] > 4 && box[3] - box[1] > 4) onDrawn(box)
  }

  const pct = (b: BBox) => ({
    left: `${(b[0] / natural!.w) * 100}%`,
    top: `${(b[1] / natural!.h) * 100}%`,
    width: `${((b[2] - b[0]) / natural!.w) * 100}%`,
    height: `${((b[3] - b[1]) / natural!.h) * 100}%`,
  })

  // Keep the selected box in view on long pages.
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedId, natural])

  return (
    <div ref={wrapRef} className="w-full">
      {error && <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="relative mx-auto bg-white shadow-sm ring-1 ring-slate-200">
        {doc.kind === 'pdf' ? (
          <canvas ref={canvasRef} className="block" />
        ) : (
          <img
            src={doc.url}
            alt={doc.name}
            className="block w-full select-none"
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        )}

        {natural && (
          <div
            className={`absolute inset-0 ${drawMode ? 'cursor-crosshair' : ''}`}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
          >
            {fields.map((f) => {
              const selected = f.id === selectedId
              return (
                <button
                  key={f.id}
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  title={`${labelFor(f.field)}: ${f.value}`}
                  onClick={() => !drawMode && onSelect(f.id)}
                  style={pct(f.bbox)}
                  className={`absolute rounded-sm transition ${
                    selected
                      ? 'bg-amber-300/35 ring-2 ring-amber-500'
                      : drawMode
                        ? 'pointer-events-none'
                        : 'hover:bg-sky-300/20 hover:ring-1 hover:ring-sky-400'
                  }`}
                >
                  {selected && (
                    <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-medium text-white">
                      {labelFor(f.field)}
                    </span>
                  )}
                </button>
              )
            })}
            {draft && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-emerald-600 bg-emerald-300/20"
                style={pct([
                  Math.min(draft[0], draft[2]),
                  Math.min(draft[1], draft[3]),
                  Math.max(draft[0], draft[2]),
                  Math.max(draft[1], draft[3]),
                ])}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
