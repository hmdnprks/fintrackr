# Fintrackr — Feature Overview

## Import

- Upload Mandiri bank statement PDFs (password-protected supported)
- Collapsible guide: how to find the e-statement email, correct subject line (`[WARNING: MESSAGE ENCRYPTED] Consolidated Statement Bank Mandiri - Apr 2026`), filename format (`ConsolidatedStatement_Apr_2026.pdf`), and default PDF password hint (date of birth, DDMMYYYY)
- Password field shows inline hint "Usually your date of birth — DDMMYYYY"
- Auto-extract account summary: account number, product name, branch, period, balance
- Auto-extract full transaction list with dates, descriptions, amounts, auto-categorization
- Preview parsed results (income/expense CSS bars, ranked category breakdown, full transaction table) before saving
- Duplicate period detection — warns before saving a month already in the vault
- Save statement to encrypted local vault

## Transaction Categorization

- **Rule-based** — keyword matching against configurable rules (user rules override system defaults)
- **50+ Indonesian default rules** covering: Alfamart/Indomaret/Superindo (Groceries), Gojek/Grab/Pertamina/KAI (Transportation), PLN/PDAM/Indihome (Housing), Shopee/Lazada/Blibli (Shopping), Telkomsel/Indosat/XL (Services), Netflix/Spotify/Steam (Entertainment), GoPay/OVO/DANA/ShopeePay (Transfer), Apotek/Halodoc/Klinik (Health), and more
- **AI-powered** — DeepSeek API batch-categorizes uncategorized transactions with Indonesian-context prompt; sequential batching with exponential backoff on rate limits
- **Manual override** — click any category badge in the transaction table to reassign inline
- **Recurring batch** — detect repeating uncategorized transactions and assign category to all occurrences at once
- 14 categories: Income, Food & Dining, Groceries, Shopping, Services, Transportation, Health & Medical, Entertainment, Education, Housing, Insurance, Bank Charges, Transfer, Uncategorized

## Dashboard

Three-tab layout with shared year/month filter:

### Overview tab
- Summary cards — total income, expense, net with month-over-month delta badges (↑/↓ % vs last month); net card turns red when negative
- Income vs Expense — CSS progress bars showing income, expense, and net with savings rate badge (e.g. "Saved 25%")
- Monthly trend line chart — IDR-abbreviated Y-axis (1.5M/500K), smooth curves, green/red dataset colors, filled area; guards for single or zero data points
- **Daily spending calendar** — heat map grid (Mon–Sun) when a specific month is selected; cells colored white→amber→red by daily spend; shows abbreviated amount per day; income dot, today indicator, click to expand full transaction list for that day
- AI Insights — persistent card with Generate/Regenerate/Clear; sends pre-aggregated category summary + period label (not raw rows) to DeepSeek; structured 4-bullet output: top spending, concern, positive, action
- Month comparison section — per-category breakdown vs prior month; expense categories only; sorted by biggest % change; dual bars (prev/current); amber highlight for increases ≥30%

### Budget tab
- Monthly budget tracker — set spending limits per category, progress bars with green/amber/red thresholds (80% warning, 100% over)
- Budget input uses IDR thousand-separator formatting (e.g. 1.500.000)
- Add/edit via modal showing current month's actual spending as context
- Budgets always compare against current calendar month, regardless of dashboard filter
- **Financial goals** — savings goals and spending habit goals (see Goals section)
- Category breakdown — donut chart + ranked list showing color dot, name, proportional bar, amount, percentage; Expenses/Income toggle

### Transactions tab
- Full transaction list with category color badges, green credit / red debit amounts
- Sortable column headers: Date (newest first by default), Amount
- Search by description, filter by category, filter by type (All / ↑ In / ↓ Out)
- Subtitle shows filtered transaction count and total amount
- Date column shows year when transactions span multiple years
- Paginated (50 per page) with "Load more"
- Click any category badge to reassign inline
- Uncategorized rows highlighted with amber left border
- Recurring uncategorized pattern panel — bulk-assign categories
- AI Categorize button — sends descriptions to DeepSeek

## Manual Transactions

- Add transactions manually via modal (no PDF required)
- Type toggle: Expense (red) / Income (green) — sets color and default category
- IDR-formatted amount input with Rp prefix
- Per-field validation with inline error messages
- Live preview row shows the transaction before saving
- Merged with imported statements in dashboard and all hooks

## Financial Goals

Two goal types displayed as cards in the Budget tab:

### Savings Goal
- Set a target amount and deadline (month + year)
- Set start month for counting
- Progress: cumulative net (income − expense) across imported months in the range
- Shows: progress bar, amount saved, amount remaining, months left
- States: in-progress / achieved (green) / overdue (red)

### Spending Goal
- Set a category, monthly limit, and target consecutive months
- Progress: checks each month's category spending against the limit
- Shows: streak circles (●●○), per-month pass/fail rows with mini bars and amounts
- Streak resets on any month over the limit
- Achieved when streak ≥ target months

## Daily Spending Calendar

- Heat map calendar grid (Mon–Sun first day) rendered when a specific month is selected
- Cell color: white → amber → deep red, scaled to the busiest day (sqrt curve so small amounts show color)
- Each cell shows day number and abbreviated amount (e.g. 150K, 1.5M)
- Green dot = income received that day; blue dot = today
- Click any cell → expands transaction panel showing each transaction sorted by amount
- Header stats: average spend per active day, busiest day of month
- Legend: color scale, income dot, today dot

## Month-over-Month Comparison

- Automatically computes previous month when a specific month is selected
- Summary card delta badges: income ↑ green, expense ↑ red, expense ↓ green
- Per-category breakdown: expense categories only, sorted by biggest % change
- Dual progress bars (gray = last month, blue = this month)
- Delta badges: red ↑, green ↓, amber ↑ for big increases (≥30%)
- New/Gone badges for categories that appeared or disappeared
- Hidden on "All" or year-only view

## Data Export

- **CSV export** — download currently filtered transactions (Date, Description, Amount, Type, Category, Balance)
- **JSON backup** — full vault export: statements, manual transactions, rules, budgets, goals
- Vault credentials excluded (device-specific)

## Data Backup & Restore

Available in Settings:

- **Export** — downloads `fintrackr-backup-YYYY-MM-DD.json` containing all app data
- **Restore — Merge** — adds entries from backup that don't already exist (deduplicates by id); budget values from backup override existing for same category
- **Restore — Replace** — wipes current data and writes backup
- File validation — rejects non-Fintrackr JSON
- Preview before restoring: statement count, manual transactions, rules, budgets, goals, export date
- Backwards-compatible: v1 backups (without goals field) restore cleanly

## Recurring Transaction Detection

- Normalizes transaction descriptions (strips numbers/symbols)
- Groups transactions with matching normalized descriptions
- Configurable minimum occurrence threshold
- Displayed as a panel above the transaction list for bulk categorization

## AI Features

- **AI Categorize** — batch-categorizes uncategorized transactions; sequential processing with exponential backoff retry on rate limits; Indonesian-context system prompt with local service names
- **AI Insights** — pre-aggregates data (category totals, top expenses, savings rate) before sending; period label and IDR currency context included; structured 4-bullet output; temperature 0.1 for consistent factual output
- User-provided DeepSeek API key stored in vault and sent with each AI request — works in production without env vars
- Server-side `DEEPSEEK_API_KEY` env var takes priority over user-provided key
- AI data notice shown in Settings and next to each AI button in the dashboard

## Secure Vault

- AES-GCM encryption via Web Crypto API
- PBKDF2 key derivation from master password
- Vault creation requires password confirmation to prevent lockout from typos
- Password show/hide toggle and strength indicator on create/unlock screen
- Vault state: uninitialized → initialized+locked → unlocked
- Session restored from sessionStorage on page refresh
- Change master password in Settings (re-encrypts all data)
- VaultGate blocks all pages until vault is unlocked

## Privacy

- All data stored locally — no server, no database, no cloud
- Privacy notice on import page and vault creation screen
- **AI features are opt-in** — transaction descriptions and amounts are sent to DeepSeek's API when AI features are used; account numbers not included
- AI data notice shown in Settings and next to each AI button

## Settings

- Add / delete custom categorization rules (keyword → category); Enter key submits
- Collapsible system default rules (50+ Indonesian-specific)
- Single DeepSeek API key input — covers AI categorize, insights, and chat
- Change vault master password with show/hide toggle and strength indicator; Enter submits
- Success (green) / error (red) feedback on password change
- Data Backup & Restore section
