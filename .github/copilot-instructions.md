<!-- Copilot / AI agent instructions for contributors -->
# Repo Orientation & Quick Tasks

This file contains concise, actionable guidance for coding agents working on this repository.

- **Run locally:** `npm install` then `npm run dev` (Vite dev server, default host/port from Vite).
- **Build:** `npm run build` (`tsc` + `vite build`). `vercel-build` is also present for Vercel.

**Where to look first**
- UI entry: `index.tsx` -> mounts `App`.
- Main app: `App.tsx` — orchestrates data loading, page routing and global settings in `localStorage` (`almox_settings`).
- Pages: `pages/*` (e.g. `Dashboard.tsx`, `Inventory.tsx`) — component-level logic and charts.
- Shared components: `components/*` (e.g. `Sidebar.tsx`, `StatCard.tsx`).
- Data/service layer: `services/sheetService.ts` — canonical CSV fetching + parsing logic for Google Sheets CSV exports.
- Types & enums: `types.ts` — canonical models (`InventoryItem`, `Movement`, `AppSettings`, `Page`).

**Important runtime/config details**
- The app fetches CSVs from Google Sheets (or raw CSV URLs). URLs are stored in `AppSettings` and saved in `localStorage` under `almox_settings`.
- `services/sheetService.ts` provides two exported functions used throughout the app:
  - `fetchInventoryData(url: string): Promise<InventoryItem[]>`
  - `fetchMovements(url: string, type: 'entrada'|'saida'): Promise<Movement[]>`
- Parsing rules you must preserve when modifying `sheetService`:
  - Header detection uses `findHeaderRow` and matches common Portuguese column keywords (e.g. `cód`, `data`, `quant`).
  - `parseCSVLine` handles quoted cells and escaped quotes.
  - `parseDate` accepts Excel serials, `dd/mm/yyyy` and ISO; invalid dates fall back to `null` (and in some callers to `new Date()`).
  - `parseNumber` handles Brazilian formats and strips `R$`/spaces, and converts `1.234,56` correctly.

**Data model / behavioral conventions**
- `App.tsx` intentionally prioritizes the snapshot from the main sheet for `quantidadeAtual` (do not replace with computed historical totals automatically).
- Movement IDs are constructed as `${type}-${i}` in `fetchMovements`. Movement `tipo` values are exact strings: `entrada` or `saida`.
- Item `codigo` strings are normalized by removing whitespace and padding single-digit codes (the existing normalization must be preserved).

**Adding features / pages**
- To add a new page:
  1. Add the page component under `pages/` and export default a React component.
  2. Add a corresponding `Page` enum entry in `types.ts`.
  3. Import and include the page in `App.tsx`'s page switch.
  4. Add a `menuItems` entry in `components/Sidebar.tsx` to make it navigable.

**Styling & UX**
- Tailwind CSS is used. The app toggles dark mode by adding/removing the `dark` class on `document.documentElement` (see `App.tsx`).
- Keep strings in Portuguese where present (UI uses pt-BR conventions).

**Build & Debug tips**
- Vite dev server shows fast refresh at `http://localhost:5173` by default. Use `npm run dev`.
- For network/data problems, reproduce requests in browser devtools — `sheetService.fetchCSV` appends a ts param to avoid caching.

**Do not change**
- Contract of `sheetService` exports (signatures and key parsing behaviors) — several components assume the shape and normalization performed there.
- `almox_settings` localStorage key name (used for persistence and UI toggles).

If anything here is unclear or you want additional examples (e.g. typical CSV header rows, example Google Sheet URLs, or preferred log messages), tell me which parts to expand.  
