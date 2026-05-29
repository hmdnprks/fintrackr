# fintrackr

Personal finance tracker. Parse bank statements (PDF), categorize transactions, visualize income/expense with charts, detect recurring transactions, store data securely with encryption.

Built with [Next.js](https://nextjs.org) (App Router), React, TypeScript, Tailwind CSS, Chart.js.

## Features

- **PDF Parsing** — Upload Mandiri bank statement PDFs, auto-extract transactions
- **Transaction Categorization** — Auto-categorize income & expense transactions
- **Dashboard** — Summary cards, income/expense bar chart, category breakdown pie chart, monthly trend line chart
- **Recurring Detection** — Identifies repeating transactions (subscriptions, bills)
- **Secure Vault** — Password-protected, encrypted local storage (AES-GCM)
- **Settings** — Manage categories, configure recurring rules

## Tech Stack

| Layer        | Technology                    |
|-------------|-------------------------------|
| Framework   | Next.js 16 (App Router)       |
| UI          | React 19, Tailwind CSS v4     |
| Charts      | Chart.js, react-chartjs-2     |
| Validation  | Zod                           |
| PDF Parsing | pdfreader                     |
| Security    | Web Crypto API (AES-GCM)      |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command       | Description            |
|---------------|------------------------|
| `npm run dev` | Start dev server       |
| `npm run build` | Production build     |
| `npm run start` | Start production     |
| `npm run lint`  | Run ESLint          |

## Project Structure

```
src/
├── app/          # Next.js pages & API routes
│   ├── dashboard/
│   ├── settings/
│   └── api/parse-pdf/
├── components/   # React components
│   ├── charts/
│   ├── dashboard/
│   └── ui/
├── context/      # React context (Vault)
├── hooks/        # Custom hooks
├── lib/          # Core logic
│   ├── parser/mandiri/      # PDF statement parser
│   ├── categorizer/mandiri/ # Transaction categorizer
│   ├── insights/            # Recurring detection
│   ├── security/            # Encryption
│   └── storage/             # Secure storage
└── types/        # TypeScript types
```
