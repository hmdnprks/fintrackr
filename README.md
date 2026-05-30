# Fintrackr

Personal finance tracker for Indonesian bank statements. Import Mandiri PDFs, categorize transactions automatically, track budgets and goals, visualize daily spending on a heat map calendar, and get AI-powered insights — all stored locally in your browser.

Built with [Next.js](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS v4, Chart.js.

## Features

- **PDF Import** — Parse Mandiri bank statements; drop multiple PDFs at once for batch import with live progress list
- **Categorization** — 50+ Indonesian default rules + learned-rules from history + AI-powered deduplication (DeepSeek) + manual inline override; 2,000 transactions with 20 unique merchants send only 20 rows to AI
- **Dashboard tabs** — Overview (charts, calendar, month comparison) · Insights (AI, health score, 50/30/20, savings trend, investment rate) · Budget (limits, goals, category breakdown, fixed commitments) · Transactions (search, filter, sort, recategorize) · Assets
- **Financial metrics** — 50/30/20 spending breakdown, savings rate trend, investment rate, fixed monthly commitments — all computed from your real transaction data
- **Daily calendar** — Heat map calendar showing spending intensity per day; click any day to see its transactions
- **Manual transactions** — Add expenses/income manually without a PDF
- **Budget tracking** — Monthly spend limits per category with progress bars and warnings
- **Financial goals** — Savings targets (amount + deadline) and spending habit goals (consecutive months under limit)
- **Month comparison** — Delta badges on summary cards + per-category breakdown vs prior month
- **Assets profile** — Track savings, gold, investments, and goal pockets; net worth growth tracking; per-asset value history (up to 365 days); emergency fund + liquid coverage ratio side-by-side; contributable flag excludes auto-managed funds (BPJS JHT) from suggestions
- **Windfall allocation** — AI-powered plan for bonus/THR/freelance windfalls; allocates across emergency fund, goal pockets, investments, and a reward slice based on your real financial data
- **Financial Health Score** — composite 0–100 (grades A+–D) across savings rate, emergency fund, investment rate, and budget adherence; per-dimension bars with motivating message
- **FIRE Number** — 25× annual expenses target; progress bar vs net worth; projected FIRE age and year from birth year (saved to vault); collapsible FIRE explainer
- **Asset Reallocation Advisor** — AI restructures your existing portfolio (not new money); risk preference selector; priority-ordered suggestions with confidence levels, running balance, and savings safety check post-rebalance; result auto-saved to vault; exportable as PDF
- **Data backup** — JSON export/import (v4); includes statements, assets, net worth snapshots, per-asset history, rebalance history; v1–v3 backups remain compatible; merge or replace modes
- **CSV export** — Download filtered transactions as CSV
- **Secure vault** — AES-GCM encryption, PBKDF2 key derivation, confirm-on-create, all data local
- **Privacy-first** — No server, no database, no tracking; AI features are explicitly opt-in
- **Mobile-friendly** — Bottom navigation bar, scrollable tabs, stacked filter rows, swipeable savings rate chart, responsive modals and cards
- **Dark mode** — OS-preference detection, localStorage persistence, full coverage across all components; toggle in nav bar
- **PWA / installable** — Web app manifest, service worker with offline shell cache, "Add to Home Screen" support

See [`docs/features.md`](docs/features.md) for the full feature reference.

## Tech Stack

| Layer        | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js 16 (App Router)           |
| UI          | React 19, Tailwind CSS v4         |
| Charts      | Chart.js 4, react-chartjs-2       |
| AI          | DeepSeek API (optional)           |
| PDF Parsing | pdfreader                         |
| Security    | Web Crypto API (AES-GCM, PBKDF2)  |
| Storage     | Browser localStorage (encrypted)  |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AI features (optional)

AI categorization and insights require a DeepSeek API key. Add it in **Settings → AI Features**, or set it server-side in `.env`:

```
DEEPSEEK_API_KEY=sk-...
```

The env var takes priority. If not set, the key entered in Settings is used.

## Scripts

| Command         | Description          |
|-----------------|----------------------|
| `npm run dev`   | Start dev server     |
| `npm run build` | Production build     |
| `npm run start` | Start production     |
| `npm run lint`  | Run ESLint           |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Import page (PDF upload + statement guide)
│   ├── dashboard/            # Main dashboard (tabs)
│   ├── settings/             # Settings page
│   └── api/
│       ├── parse-pdf/        # PDF parsing endpoint
│       └── categorize/       # AI categorization & insights endpoint
├── components/
│   ├── charts/               # Chart.js wrappers
│   ├── dashboard/            # Dashboard sections & modals
│   │   ├── CalendarSection.tsx       # Daily heat map calendar (with inline recategorize)
│   ├── BatchProgress.tsx         # Multi-file import progress list
│   │   ├── GoalSection.tsx           # Financial goals
│   │   ├── MonthComparisonSection.tsx
│   │   ├── BudgetSection.tsx
│   │   ├── TransactionSection.tsx
│   │   ├── AIInsightsPanel.tsx
│   │   └── ...
│   ├── settings/             # Settings components (BackupSection)
│   ├── ui/                   # Shared UI primitives
│   └── VaultGate.tsx         # Auth gate with confirm-password on create
├── context/
│   └── VaultContext.tsx      # Vault state & encryption
├── hooks/
│   ├── useStatements.ts      # Load & filter statements
│   ├── useDashboardData.ts   # Aggregate metrics
│   ├── useAICategorization.ts
│   └── useMonthComparison.ts # Month-over-month deltas
└── lib/
    ├── backup.ts             # Export/import backup (v2, includes goals)
    ├── budgetStorage.ts      # Budget CRUD
    ├── categories.ts         # Category types & 50+ Indonesian rules
    ├── goalStorage.ts        # Goals CRUD
    ├── manualStorage.ts      # Manual transactions CRUD
    ├── csvExport.ts          # CSV download
    ├── formatter.ts          # IDR formatting, NaN guard
    ├── finance.ts            # Transaction aggregation
    ├── categorizer/          # Rule-based + AI categorizers
    ├── insights/             # Recurring detection
    ├── parser/mandiri/       # Mandiri PDF parser
    └── storage/              # Vault & secure storage
```
