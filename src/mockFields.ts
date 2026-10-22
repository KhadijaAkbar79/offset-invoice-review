import type { ExtractedField } from './types'

// The mock extraction result from the task brief, unchanged.
export const MOCK_FIELDS: ExtractedField[] = [
  { field: 'invoicenumber', value: 'INV-2041', page: 1, bbox: [120, 80, 260, 100] },
  { field: 'date', value: '2026-09-14', page: 1, bbox: [400, 80, 520, 100] },
  { field: 'totalamount', value: '48,250.00', page: 1, bbox: [400, 620, 520, 645] },
]

export const FIELD_LABELS: Record<string, string> = {
  invoicenumber: 'Invoice number',
  date: 'Date',
  totalamount: 'Total amount',
}

export const labelFor = (field: string) => FIELD_LABELS[field] ?? field
