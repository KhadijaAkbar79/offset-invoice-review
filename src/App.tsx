import { useCallback, useEffect, useState } from 'react'
import type { BBox, ChangeEntry, LoadedDocument, ReviewField } from './types'
import { MOCK_FIELDS } from './mockFields'
import { DocumentViewer } from './DocumentViewer'
import { FieldPanel } from './FieldPanel'
import { ChangeLog } from './ChangeLog'

const uid = () => crypto.randomUUID()

const freshFields = (): ReviewField[] =>
  MOCK_FIELDS.map((f) => ({ ...f, id: uid(), status: 'pending' }))

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp'

export default function App() {
  const [doc, setDoc] = useState<LoadedDocument | null>(null)
  const [fields, setFields] = useState<ReviewField[]>(freshFields)
  const [log, setLog] = useState<ChangeEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [drawMode, setDrawMode] = useState(false)
  const [pendingBox, setPendingBox] = useState<BBox | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Free the object URL of the previous image when it is replaced.
  useEffect(() => () => {
    if (doc?.kind === 'image') URL.revokeObjectURL(doc.url)
  }, [doc])

  const openFile = async (file: File) => {
    setUploadError(null)
    if (file.type === 'application/pdf') {
      setDoc({ kind: 'pdf', name: file.name, data: await file.arrayBuffer() })
    } else if (file.type.startsWith('image/')) {
      setDoc({ kind: 'image', name: file.name, url: URL.createObjectURL(file) })
    } else {
      setUploadError('Please choose a PDF, PNG, JPG or WebP file.')
      return
    }
    // A new document starts a new review.
    setFields(freshFields())
    setLog([])
    setSelectedId(null)
    setPage(1)
    setDrawMode(false)
    setPendingBox(null)
  }

  const openSample = async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}sample-invoice.pdf`)
    const blob = await res.blob()
    openFile(new File([blob], 'sample-invoice.pdf', { type: 'application/pdf' }))
  }

  const record = (f: ReviewField, kind: ChangeEntry['kind'], oldValue: string | null, newValue: string) =>
    setLog((l) => [{ id: uid(), fieldId: f.id, field: f.field, kind, oldValue, newValue, at: new Date() }, ...l])

  // Selecting a field also jumps to the page it lives on.
  const select = useCallback(
    (id: string) => {
      const f = fields.find((x) => x.id === id)
      if (!f) return
      setSelectedId(id)
      setPage(f.page)
    },
    [fields],
  )

  const approve = (id: string) => {
    const f = fields.find((x) => x.id === id)
    if (!f || f.status === 'approved') return
    setFields((fs) => fs.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)))
    record(f, 'approve', null, f.value)
  }

  const edit = (id: string, value: string) => {
    const f = fields.find((x) => x.id === id)
    if (!f || f.value === value) return
    setFields((fs) => fs.map((x) => (x.id === id ? { ...x, value, status: 'edited' } : x)))
    record(f, 'edit', f.value, value)
  }

  const addField = (name: string, value: string) => {
    if (!pendingBox) return
    const f: ReviewField = { id: uid(), field: name, value, page, bbox: pendingBox, status: 'pending', manual: true }
    setFields((fs) => [...fs, f])
    record(f, 'add', null, value)
    setPendingBox(null)
    setDrawMode(false)
    setSelectedId(f.id)
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Invoice Review</h1>
            <p className="text-xs text-slate-500">Every value links back to where it was read on the document.</p>
          </div>
          {doc && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-48 truncate text-sm text-slate-600" title={doc.name}>
                {doc.name}
              </span>
              <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Replace file
                <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
      </header>

      {!doc ? (
        <main className="flex flex-1 items-center justify-center p-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) openFile(file)
            }}
            className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-white'
            }`}
          >
            <p className="text-base font-medium">Drop an invoice or bill here</p>
            <p className="mt-1 text-sm text-slate-500">PDF, PNG, JPG or WebP</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <label className="cursor-pointer rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
                Choose file
                <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
              </label>
              <button type="button" onClick={openSample} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                Use sample invoice
              </button>
            </div>
            {uploadError && <p className="mt-4 text-sm text-red-600">{uploadError}</p>}
            <p className="mt-6 text-xs text-slate-400">
              The sample is laid out so the mock field coordinates land on the right values.
            </p>
          </div>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                >
                  ‹ Prev
                </button>
                <span className="tabular-nums text-slate-600">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                >
                  Next ›
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrawMode((d) => !d)
                  setPendingBox(null)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  drawMode ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                {drawMode ? 'Drawing: drag a box on the page' : '+ Add field by drawing'}
              </button>
            </div>

            <DocumentViewer
              doc={doc}
              page={page}
              fields={fields.filter((f) => f.page === page)}
              selectedId={selectedId}
              drawMode={drawMode && !pendingBox}
              onPageCount={setPageCount}
              onSelect={select}
              onDrawn={setPendingBox}
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
            {pendingBox && <NewFieldForm bbox={pendingBox} onAdd={addField} onCancel={() => setPendingBox(null)} />}
            <FieldPanel fields={fields} selectedId={selectedId} onSelect={select} onApprove={approve} onEdit={edit} />
            <ChangeLog entries={log} onSelect={select} />
          </aside>
        </main>
      )}
    </div>
  )
}

function NewFieldForm({ bbox, onAdd, onCancel }: { bbox: BBox; onAdd: (name: string, value: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  return (
    <form
      className="rounded-lg border border-emerald-300 bg-emerald-50 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() && value.trim()) onAdd(name.trim(), value.trim())
      }}
    >
      <h2 className="text-sm font-semibold text-emerald-800">New field</h2>
      <p className="mb-2 text-[11px] text-emerald-700">Box [{bbox.join(', ')}]</p>
      <label className="block text-xs font-medium text-slate-600" htmlFor="new-field-name">
        Field name
      </label>
      <input
        id="new-field-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. vendorname"
        className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <label className="block text-xs font-medium text-slate-600" htmlFor="new-field-value">
        Value
      </label>
      <input
        id="new-field-value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mb-3 w-full rounded-md border border-slate-300 px-2 py-1 font-mono text-sm"
      />
      <div className="flex gap-2">
        <button className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700">Add field</button>
        <button type="button" onClick={onCancel} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-white">
          Discard
        </button>
      </div>
    </form>
  )
}
