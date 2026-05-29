# Fintrackr

Personal finance tracker for Indonesian bank statements. Import Mandiri PDFs, categorize transactions automatically, track budgets and goals, and get AI-powered spending insights — all stored locally in your browser.

Built with [Next.js](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS v4, Chart.js.

## Features

- **PDF Import** — Parse Mandiri bank statement PDFs (password-protected), auto-extract transactions
- **Categorization** — Rule-based + AI-powered (DeepSeek) + manual inline override
- **Dashboard tabs** — Overview (charts, AI insights, month comparison) · Budget (limits, goals) · Transactions (search, filter, recategorize)
- **Manual transactions** — Add expenses/income manually without a PDF
- **Budget tracking** — Monthly spend limits per category with progress bars and warnings
- **Financial goals** — Savings targets (amount + deadline) and spending habit goals (consecutive months under limit)
- **Month comparison** — Delta badges on summary cards + per-category breakdown vs prior month
- **Data backup** — Export/import full JSON backup with merge or replace restore modes
- **CSV export** — Download filtered transactions as CSV
- **Secure vault** — AES-GCM encryption, PBKDF2 key derivation, all data stays in your browser
- **Privacy-first** — No server, no database, no tracking; AI features are explicitly opt-in

See [`docs/features.md`](docs/features.md) for the full feature reference.

## Tech Stack

| Layer        | Technology                      |
|-------------|----------------------------------|
| Framework   | Next.js 16 (App Router)          |
| UI          | React 19, Tailwind CSS v4        |
| Charts      | Chart.js 4, react-chartjs-2      |
| AI          | DeepSeek API (optional)          |
| PDF Parsing | pdfreader                        |
| Security    | Web Crypto API (AES-GCM, PBKDF2) |
| Storage     | Browser IndexedDB (AES-GCM encrypted unified vault) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AI features (optional)

Add your DeepSeek API key to `.env`:

```
DEEPSEEK_API_KEY=sk-...
```

AI categorization and insights work without this key if you enter it manually in Settings.

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
│   ├── page.tsx              # Import page (PDF upload)
│   ├── dashboard/            # Main dashboard (tabs)
│   ├── settings/             # Settings page
│   └── api/
│       ├── parse-pdf/        # PDF parsing endpoint
│       └── categorize/       # AI categorization endpoint
├── components/
│   ├── charts/               # Chart.js wrappers
│   ├── dashboard/            # Dashboard sections & modals
│   ├── settings/             # Settings components
│   ├── ui/                   # Shared UI primitives
│   └── VaultGate.tsx         # Auth gate
├── context/
│   └── VaultContext.tsx      # Vault state & encryption
├── hooks/
│   ├── useStatements.ts      # Load & filter statements
│   ├── useDashboardData.ts   # Aggregate metrics
│   ├── useAICategorization.ts
│   └── useMonthComparison.ts # Month-over-month deltas
└── lib/
    ├── backup.ts             # Export/import backup
    ├── budgetStorage.ts      # Budget CRUD
    ├── categories.ts         # Category types & rules
    ├── goalStorage.ts        # Goals CRUD
    ├── manualStorage.ts      # Manual transactions CRUD
    ├── csvExport.ts          # CSV download
    ├── formatter.ts          # IDR formatting, date parsing
    ├── finance.ts            # Transaction aggregation
    ├── categorizer/          # Rule-based + AI categorizers
    ├── insights/             # Recurring detection
    ├── parser/mandiri/       # Mandiri PDF parser
    └── storage/              # Vault & secure storage
```
