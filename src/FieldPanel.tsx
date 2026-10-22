import { useState } from 'react'
import type { ReviewField } from './types'
import { labelFor } from './mockFields'

interface Props {
  fields: ReviewField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onApprove: (id: string) => void
  onEdit: (id: string, value: string) => void
}

const STATUS_STYLE: Record<ReviewField['status'], string> = {
  pending: 'bg-slate-100 text-slate-600',
  approved: 'bg-emerald-100 text-emerald-700',
  edited: 'bg-sky-100 text-sky-700',
}

export function FieldPanel({ fields, selectedId, onSelect, onApprove, onEdit }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (f: ReviewField) => {
    onSelect(f.id)
    setEditingId(f.id)
    setDraft(f.value)
  }
  const save = (f: ReviewField) => {
    const next = draft.trim()
    if (next && next !== f.value) onEdit(f.id, next)
    setEditingId(null)
  }

  const done = fields.filter((f) => f.status !== 'pending').length

  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Extracted fields</h2>
        <span className="text-xs tabular-nums text-slate-500">
          {done}/{fields.length} reviewed
        </span>
      </header>

      <ul className="space-y-2">
        {fields.map((f) => {
          const selected = f.id === selectedId
          const editing = f.id === editingId
          return (
            <li
              key={f.id}
              className={`rounded-lg border bg-white p-3 transition ${
                selected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'
              }`}
            >
              <button type="button" onClick={() => onSelect(f.id)} className="block w-full text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {labelFor(f.field)}
                    {f.manual && <span className="ml-1 text-emerald-600">(added)</span>}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[f.status]}`}>
                    {f.status}
                  </span>
                </div>
                {!editing && <p className="mt-1 font-mono text-base">{f.value}</p>}
                <p className="mt-1 text-[11px] text-slate-400">
                  page {f.page} · [{f.bbox.join(', ')}]
                </p>
              </button>

              {editing ? (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    save(f)
                  }}
                >
                  <input
                    id={`edit-${f.id}`}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm focus:border-sky-500 focus:outline-none"
                  />
                  <button className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={f.status === 'approved'}
                    onClick={() => onApprove(f.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-default disabled:bg-emerald-200"
                  >
                    {f.status === 'approved' ? 'Approved' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(f)}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
