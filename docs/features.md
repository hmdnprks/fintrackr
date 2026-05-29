# Fintrackr — Feature Overview

## Import

- Upload Mandiri bank statement PDFs (password-protected supported)
- Auto-extract account summary: account number, product name, branch, period, balance
- Auto-extract full transaction list with dates, references, descriptions, amounts
- Preview parsed results (income/expense summary, category breakdown, transaction table) before saving
- Save statement to encrypted local storage

## Transaction Categorization

- **Rule-based** — keyword matching against configurable rules (user rules override system defaults)
- **AI-powered** — DeepSeek API batch-categorizes all uncategorized transactions
- **Manual override** — click any category badge in the transaction table to reassign inline
- **Recurring batch** — detect repeating uncategorized transactions and assign category to all occurrences at once
- 14 categories: Income, Food & Dining, Groceries, Shopping, Services, Transportation, Health & Medical, Entertainment, Education, Housing, Insurance, Bank Charges, Transfer, Uncategorized

## Dashboard

Three-tab layout with shared year/month filter:

### Overview tab
- Summary cards — total income, expense, net with month-over-month delta badges (↑/↓ % vs last month)
- Income vs Expense bar chart
- Monthly trend line chart (all available months)
- AI Insights — generates natural language spending analysis via DeepSeek (top categories, patterns, suggestions)
- Month comparison section — per-category breakdown of biggest spending movers vs prior month, with dual progress bars and delta badges; highlights increases ≥30% in amber

### Budget tab
- Monthly budget tracker — set spending limits per category, progress bars with green/amber/red thresholds (80% warning, 100% over)
- Budget input uses IDR thousand-separator formatting (e.g. 1.500.000)
- Add/edit via modal showing current month's actual spending as context
- Budgets always compare against current calendar month, regardless of dashboard filter
- **Goals** — savings goals and spending habit goals (see Goals section)
- Category breakdown chart (bar/donut toggle)

### Transactions tab
- Full transaction list with category color badges, green/red amount coloring (credit/debit)
- Search by description, filter by category dropdown, filter by type (All / ↑ In / ↓ Out)
- Active filters highlighted; clear button
- Paginated (50 per page) with "Load more" — no fixed-height scroll box
- Click any category badge to reassign inline (dropdown on click, blur to close)
- Uncategorized rows highlighted with amber left border
- Recurring uncategorized pattern panel — detect and batch-assign categories
- AI Categorize button — sends uncategorized transaction descriptions to DeepSeek

## Manual Transactions

- Add transactions manually via modal (no PDF required)
- Type toggle: Expense (red) / Income (green) — sets color and default category
- IDR-formatted amount input with Rp prefix
- Per-field validation with inline error messages
- Live preview row shows the transaction before saving
- Merged with imported statements in dashboard and all hooks

## Financial Goals

Two goal types, displayed as cards in the Budget tab:

### Savings Goal
- Set a target amount and deadline (month + year)
- Set start month for counting
- Progress: cumulative net (income − expense) across all imported months within the range
- Shows: progress bar, amount saved, amount remaining, months left
- States: in-progress / achieved (green) / overdue (red)

### Spending Goal
- Set a category, monthly limit, and target number of consecutive months
- Progress: check each available month's spending in that category against the limit
- Shows: streak circles (●●○), per-month pass/fail rows with mini bars and amounts
- Streak resets on any month that exceeds the limit
- State: achieved when streak ≥ target months

## Month-over-Month Comparison

- Automatically computes previous month when a specific month is selected
- Summary cards show delta badges: income ↑ green, expense ↑ red, expense ↓ green
- MonthComparisonSection shows per-category spending changes:
  - Sorted by absolute % change (biggest movers first)
  - Dual progress bars (gray = last month, blue = this month)
  - Delta badges: red ↑, green ↓, amber ↑ for big increases (≥30%)
  - "New" badge for first-time categories, "Gone" for categories that disappeared
- Hidden when "All" or year-only view is selected

## Data Export

- **CSV export** — download currently filtered transactions as a CSV file (Date, Description, Amount, Type, Category, Balance)
- **JSON backup** — full data export including statements, manual transactions, rules, and budgets
- Vault credentials are excluded from backup (device-specific)

## Data Backup & Restore

Available in Settings:

- **Export** — downloads `fintrackr-backup-YYYY-MM-DD.json`
- **Restore — Merge** — adds entries from backup that don't already exist (deduplicates by id); safe to run repeatedly; budget values from backup override existing for same category
- **Restore — Replace** — wipes all current data, then writes backup
- File validation — rejects non-Fintrackr JSON files
- Preview before restoring: shows statement count, manual transaction count, rule count, budget count, and backup date

## Recurring Transaction Detection

- Normalizes transaction descriptions (strips numbers/symbols)
- Groups transactions with matching normalized descriptions
- Configurable minimum occurrence threshold
- Displayed as a panel above the transaction list for bulk categorization

## Secure Vault

- AES-GCM encryption via Web Crypto API
- PBKDF2 key derivation from master password
- Vault state: uninitialized → initialized+locked → unlocked
- Session password held in memory only (not persisted across hard refreshes)
- Change master password in Settings (re-encrypts all data)
- VaultGate blocks all pages until vault is unlocked

## Privacy

- All data stored locally in browser localStorage — no server, no database, no cloud
- Privacy notice on import page and vault creation screen
- **AI features are opt-in** — using AI Categorize or AI Insights sends transaction descriptions and amounts to DeepSeek's API; account numbers and personal details are not included
- AI data notice shown in Settings and next to each AI button

## Settings

- Add / delete custom categorization rules (keyword → category)
- View system default rules (read-only)
- Change vault master password with strength indicator
- AI Categorization config — status display, API key via `.env`
- AI Chat Assistant — save personal DeepSeek API key to localStorage
- Data Backup & Restore section
