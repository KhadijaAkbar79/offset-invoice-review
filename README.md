# Invoice Review

A small React + TypeScript app for the Offset frontend task: upload an invoice, see where each extracted value was read from, and approve or correct it with a full change log.

**Live:** _add link after deploy_

## What it does

- **Upload** a PDF or image (PNG, JPG, WebP) by drag-and-drop or file picker. There's also a **sample invoice** whose layout matches the mock coordinates, so the boxes land on real values.
- **View the document.** PDFs are rendered with pdf.js onto a canvas at the column's width (sharp on high-DPI screens). Multi-page PDFs get page navigation.
- **Fields panel** loaded from the mock JSON. Clicking a field draws a highlight box on the document at its `bbox`. It also works the other way: clicking a value on the document selects its field.
- **Approve or edit** each value. Every action goes into the **change log** with the old value, the new value and a timestamp, newest first. Clicking a log entry jumps to that field.
- **Bonus:** "Add field by drawing" lets you drag a box on the page and name the new field. It's stored with its own bbox and logged as "added".

## Decisions

- **Coordinates.** `bbox` is `[x1, y1, x2, y2]` with the origin at the top-left of the page, in PDF points for PDFs and natural pixels for images. Boxes are positioned as percentages of the page's natural size, so they stay aligned at any screen width or zoom.
- **One source of truth.** Fields and the log live in `App.tsx`. The viewer and panel are presentational and only report intent (select, approve, edit, draw).
- **Selecting a field jumps to its page** and scrolls the box into view.
- **Drawing** keeps the start corner in a ref, so fast drags don't read stale React state. Boxes under 4 units are treated as accidental clicks.

## What I'd improve with more time

- Persist the review (fields + log) per document, so a refresh doesn't lose work.
- Keyboard flow for reviewers: `j`/`k` to move between fields, `a` to approve, `e` to edit.
- Zoom and pan for dense documents, and resizing or moving a drawn box.
- Code-split pdf.js so the first load is lighter.
- Tests with Vitest + Testing Library for the reducer-style logic (approve/edit/log) and a Playwright test for the click-to-highlight flow.

## Run locally

```bash
npm install
npm run dev
```

Build: `npm run build` (outputs to `dist/`).

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, pdf.js.
