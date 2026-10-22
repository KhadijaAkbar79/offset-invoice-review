/** [x1, y1, x2, y2] in document units, origin at the top-left of the page.
 *  PDF: points (1/72 inch). Image: natural pixels. */
export type BBox = [number, number, number, number]

export type FieldStatus = 'pending' | 'approved' | 'edited'

export interface ExtractedField {
  field: string
  value: string
  page: number
  bbox: BBox
}

export interface ReviewField extends ExtractedField {
  id: string
  status: FieldStatus
  /** true when a reviewer drew this box by hand instead of it coming from extraction */
  manual?: boolean
}

export type ChangeKind = 'edit' | 'approve' | 'add'

export interface ChangeEntry {
  id: string
  fieldId: string
  field: string
  kind: ChangeKind
  oldValue: string | null
  newValue: string
  at: Date
}

export type LoadedDocument =
  | { kind: 'pdf'; name: string; data: ArrayBuffer }
  | { kind: 'image'; name: string; url: string }
