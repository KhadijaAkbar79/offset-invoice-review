import type { ChangeEntry } from './types'
import { labelFor } from './mockFields'

const time = (d: Date) =>
  d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function ChangeLog({ entries, onSelect }: { entries: ChangeEntry[]; onSelect: (fieldId: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Change log</h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
          No changes yet. Approvals, edits and added fields appear here, newest first.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.fieldId)}
                className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm hover:border-slate-300"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {labelFor(c.field)}{' '}
                    <span className="font-normal text-slate-500">
                      {c.kind === 'edit' ? 'edited' : c.kind === 'approve' ? 'approved' : 'added'}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] tabular-nums text-slate-400" dateTime={c.at.toISOString()}>
                    {time(c.at)}
                  </time>
                </div>
                {c.kind === 'edit' ? (
                  <p className="mt-1 font-mono text-xs">
                    <span className="text-red-600 line-through">{c.oldValue}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="text-emerald-700">{c.newValue}</span>
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-600">{c.newValue}</p>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
