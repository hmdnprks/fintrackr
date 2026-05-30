# Fintrackr — Feature Overview

## Import

- Upload one or multiple Mandiri PDF bank statements at once (password-protected supported)
- **Multi-file batch import** — drop several PDFs at once; files processed sequentially with one shared password; live progress list shows per-file status (pending / processing / saved / duplicate / error) with period and transaction count on completion; duplicates skipped automatically; single file keeps the existing parse → preview → save flow
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
- **AI-powered** — DeepSeek API categorizes uncategorized transactions with Indonesian-context prompt; three-phase smart pipeline:
  1. **Learned rules** — builds a map of normalized descriptions from already-categorized transactions; same merchant across different branch codes or reference numbers reuses the known category with zero API calls
  2. **Deduplication** — groups remaining transactions by normalized description (numbers/punctuation stripped); only unique merchant names are sent to AI — 2,000 transactions with 20 unique merchants become 20 API rows, not 2,000; AI result is applied back to all matching transactions
  3. **AI fallback** — novel descriptions that passed both prior phases are batch-sent to DeepSeek with exponential backoff on rate limits
- Live status text during processing shows each phase; result modal breaks down counts: "X from learned rules · Y via AI"
- **Manual override** — click any category badge in the transaction table to reassign inline
- **Recurring batch** — detect repeating uncategorized transactions and assign category to all occurrences at once
- 14 categories: Income, Food & Dining, Groceries, Shopping, Services, Transportation, Health & Medical, Entertainment, Education, Housing, Insurance, Bank Charges, Transfer, Uncategorized

## Dashboard

Five-tab layout with shared year/month filter:

### Overview tab
- Summary cards — total income, expense, net with month-over-month delta badges (↑/↓ % vs last month); net card turns red when negative
- Income vs Expense — CSS progress bars showing income, expense, and net with savings rate badge (e.g. "Saved 25%")
- Monthly trend line chart — respects the active year filter; IDR-abbreviated Y-axis, smooth curves, green/red dataset colors, filled area; 12-month sliding window with ← → navigation; guards for single or zero data points
- **Daily spending calendar** — heat map grid (Mon–Sun) when a specific month is selected; cells colored white→amber→red by daily spend; shows abbreviated amount per day; income dot, today indicator, click to expand full transaction list for that day
- Month comparison section — per-category breakdown vs prior month; expense categories only; sorted by biggest % change; dual bars (prev/current); amber highlight for increases ≥30%

### Insights tab
- **AI Insights** — persistent card with Generate/Regenerate/Clear; sends pre-aggregated category summary + period label (not raw rows) to DeepSeek; structured 4-bullet output: top spending, concern, positive, action
- **Financial Health Score** — composite 0–100 score (grades A+/A/B/C/D) across 4 weighted dimensions: Savings Rate (30 pts), Emergency Fund (30 pts), Investment Rate (20 pts), Budget Adherence (20 pts); per-dimension progress bars coloured green/amber/red; motivating message per grade; reads emergency fund from Assets tab
- **50/30/20 Spending Breakdown** — classifies debit transactions into Needs, Wants, and Surplus; each row shows actual %, IDR amount, a bar with the ideal threshold marked, and a status message; warns when a large portion is uncategorized
- **Savings Rate Trend** — monthly bar chart for the selected year; bars colored green (≥20%), amber (10–19%), red (<10%); dashed reference line at 20% target; avg rate headline + insight line with best month
- **Investment Rate** — keyword-based detection of investment platform transfers (Bibit, Stockbit, Ajaib, Bareksa, IPOT, Indopremier, Mandiri Sekuritas, Pluang) in the filtered period; progress bar with 15% min and 20% great markers; lists detected transactions

### Budget tab
- Monthly budget tracker — set spending limits per category, progress bars with green/amber/red thresholds (80% warning, 100% over)
- Budget input uses IDR thousand-separator formatting (e.g. 1.500.000)
- Add/edit via modal showing current month's actual spending as context
- Budgets always compare against current calendar month, regardless of dashboard filter
- **Financial goals** — savings goals and spending habit goals (see Goals section)
- Category breakdown — donut chart + ranked list showing color dot, name, proportional bar, amount, percentage; Expenses/Income toggle
- **Fixed Monthly Commitments** — auto-detects expenses recurring in ≥2 distinct months across Housing, Services, Entertainment, Insurance, Bank Charges, Health & Medical, Transportation; shows monthly average per item, total fixed cost, and % of avg income; hidden when no recurring patterns found

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

### Assets tab
- Track all asset types in one place: **Savings**, **Gold**, **Investment**, **Pocket**, **Other**
- All icons use @heroicons/react — no emojis
- **Net worth summary card** — total value across all assets, allocation breakdown bars by type; shows month-over-month growth (↑/↓ amount and %) compared to the most recent snapshot ≥25 days old; hint shown until first snapshot exists
- **Net worth & asset history** — snapshots recorded automatically whenever any asset value is saved or updated; stores both aggregate net worth (up to 365 daily entries) and per-asset value history (up to 365 daily entries per asset); each asset card shows ↑/↓ growth vs previous snapshot; history included in JSON backup
- **Liquidity metrics** — displayed side-by-side on desktop, stacked on mobile:
  - *Emergency fund* — five tiers Critical/Low/Building/Healthy/Strong; progress bar with 3-month and 6-month markers; contextual advice per tier (Indonesian context: PHK, BPJS, variable income); amount to reach 6-month target
  - *Liquid coverage* — all savings accounts ÷ avg monthly expense (broader than emergency fund); four tiers Low/Adequate/Healthy/Excellent scaled to 12-month target; explains difference from emergency fund metric
- **Asset cards** grouped by type with Heroicons, each showing current value, per-asset growth since last snapshot, institution, last-updated timestamp, and type-specific details:
  - Savings: interest rate (% p.a.), emergency fund badge, months of expenses covered
  - Gold: weight in grams, auto-computed price per gram
  - Investment: investment type; **contributable toggle** — mark BPJS Ketenagakerjaan JHT and other auto-managed funds as non-contributable so they are excluded from windfall allocation suggestions; badge shows "Can top up" (green) or "Auto-managed" (gray)
  - Pocket: goal name, target amount, deadline, progress bar toward target
- Add / edit / delete assets via modal with type-specific field sets; savings and pocket field grids stack on mobile
- **Windfall allocation** — purple "Allocate Windfall" button in the Assets header; select type (Bonus/THR/Freelance/Other), enter amount; AI analyses your full financial profile and returns a concrete allocation plan:
  - Priority order: emergency fund gap → goal pockets by deadline → investments → reward slice
  - Reward slice always included: 0% (Critical) / 5% (Low) / 10% (Building) / 15–20% (Healthy/Strong) — acknowledges the user earned the windfall
  - THR type maps Lebaran spending to the reward slice
  - Each destination shows two bars: % of windfall + gap fill progress with amount still needed
  - AI constrained to never exceed windfall total; hard clamp on server as safety net
  - Non-contributable investment assets filtered out of context before sending to AI
- **Asset Reallocation Advisor** — indigo "Rebalance with AI" button in the net worth card; restructures existing money (not new money); risk preference selector (Conservative / Moderate / Aggressive):
  - Suggestions sorted by priority (#1 = most urgent); confidence badge per card (High priority / Consider / Optional) with a one-phrase reason
  - Action types: Move, Increase, Reduce, Maintain — each with distinct icon and colour
  - Running balance computed client-side in priority order — shows remaining amount in source after each step; red ⚠ Insufficient funds when accumulated withdrawals exceed source balance
  - Execution note explains whether suggestions are sequential or alternatives
  - **Savings safety check** — AI computes remaining liquid savings after all moves and expresses months of expense coverage; verdict banner (Safe ✓ green / Caution amber / Warning red) shown below suggestion cards
  - **Vault persistence** — every analysis auto-saved (last 5 entries); "Load" banner on next open restores the previous result without an API call; included in JSON backup export and restore
  - **PDF export** — print-ready HTML page opened in a new tab (no library dependency); includes health badge, summary, execution note, all suggestion cards, safety check, and disclaimer
  - Net worth card shows last-updated label (amber when >30 days)
- **FIRE Number** — Financial independence target (25× annual expenses, 4% rule); progress bar showing current net worth vs target; stats grid (annual expenses, annual savings, years to FIRE); birth year input saved to vault → shows projected FIRE age and target calendar year; collapsible "What is FIRE?" explainer covering the 4% rule, Trinity Study, Indonesian investment context, and FIRE variants (Lean/Fat/Barista)
- Assets included in JSON backup (v4); v1/v2/v3 backups remain compatible; rebalance history included from v4

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
- **JSON backup** — full vault export: statements, manual transactions, rules, budgets, goals, assets, net worth snapshots, per-asset snapshots, rebalance history
- Vault credentials excluded (device-specific)

## Data Backup & Restore

Available in Settings:

- **Export** — downloads `fintrackr-backup-YYYY-MM-DD.json` containing all app data
- **Restore — Merge** — adds entries from backup that don't already exist (deduplicates by id); budget values from backup override existing for same category
- **Restore — Replace** — wipes current data and writes backup
- File validation — rejects non-Fintrackr JSON
- Preview before restoring: statement count, manual transactions, rules, budgets, goals, assets, export date
- Backwards-compatible: v1 (no goals), v2 (no assets), v3 (no asset snapshots) all restore cleanly; missing fields default to empty
- v4 backup includes: statements, manual transactions, rules, budgets, goals, assets, net worth snapshots (daily aggregate), asset snapshots (daily per-asset value history), rebalance history (last 5 entries)

## Recurring Transaction Detection

- Normalizes transaction descriptions (strips numbers/symbols)
- Groups transactions with matching normalized descriptions
- Configurable minimum occurrence threshold
- Displayed as a panel above the transaction list for bulk categorization

## AI Features

- **AI Categorize** — batch-categorizes uncategorized transactions; sequential processing with exponential backoff retry on rate limits; Indonesian-context system prompt with local service names
- **AI Insights** — pre-aggregates data (category totals, top expenses, savings rate) before sending; period label and IDR currency context included; structured 4-bullet output; temperature 0.1 for consistent factual output
- **AI Budget Suggestions** — generates per-category budget limits from last 3 months average spending; editable before applying
- **AI Windfall Allocation** — full financial context (income, assets, goals, emergency fund gap, THR type); reward slice; hard clamp prevents over-allocation
- **AI Rebalance Advisor** — restructures existing assets rather than allocating new money; risk-aware (Conservative / Moderate / Aggressive); priority-ordered suggestions with confidence levels and running balance; savings safety check post-rebalance; result auto-saved to vault; PDF export
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

## Mobile & UX

- Responsive layout across all pages — `px-4 py-6` on mobile, `sm:px-6 sm:py-10` on desktop
- **Navigation**: fixed bottom navigation bar on mobile (Import / Dashboard / Settings) with Heroicons, icon above label, `env(safe-area-inset-bottom)` padding for iOS notch; desktop keeps inline top nav links; active route highlighted blue
- **Dashboard tabs**: horizontally scrollable on mobile — 5 tabs scroll with `overflow-x-auto`, `shrink-0` + `whitespace-nowrap` prevents label wrapping
- **Dashboard header filters**: year and month selects in a 2-column grid on mobile; action buttons (Export, Delete, Clear) on a separate row below
- **Transaction tab**: title and AI Categorize button stack vertically on mobile; category filter goes full width; type toggle and Clear sit on a row below
- **Budget tab**: header stacks on mobile; each budget row shows amount below the category name instead of competing with action buttons on the same line
- **Savings rate chart**: horizontally scrollable with `min-w-[20px]` per bar; auto-scrolls to latest months on load; right-edge fade gradient and swipe hint label; Y-axis labels fixed outside scroll area
- **Fixed monthly commitments**: each item is a card — description full width on top (`break-words`), category badge + months + amount on the row below
- **Assets tab**: net worth breakdown bars stack label above bar; asset modal field grids stack on mobile; windfall allocation cards stack destination name above amount
- Transaction table: horizontally scrollable on mobile with `min-w-[560px]` so columns never collapse
- Calendar day cells: `h-10` on mobile, `h-14` on desktop
- All modals: constrained width with `p-4` backdrop padding to prevent viewport overflow

## Dark Mode

- **Class-strategy dark mode** via Tailwind CSS v4 `@variant dark` directive; toggled by adding `.dark` to `<html>`
- **DarkModeToggle** component (Sun/Moon icons from Heroicons): detects OS preference on first load via `prefers-color-scheme`; persists choice to `localStorage` under key `fintrackr-theme`; shown in desktop nav and mobile top bar
- Full dark mode coverage across all major components:
  - Navigation, VaultGate, import page, dashboard, settings
  - All dashboard cards: Summary, IncomeExpense, MonthlyTrend, MonthComparison, CalendarSection
  - Insights tab: SpendingBreakdown, SavingsRateTrend, RecurringExpenses, InvestmentRate, AIInsights
  - Budget tab: BudgetSection, GoalSection (cards with colored header tints), CategorySection
  - Transactions tab: TransactionSection, RecurringSuggestionPanel
  - Assets tab: AssetsTab, AssetModal, WindfallModal
  - Modals: AIModal, AddTransactionModal
  - Settings: BackupSection (including preview grid, file drop zone, amber warning)

## PWA / Installable

- **Web App Manifest** (`/public/manifest.json`): name "Fintrackr", `display: standalone`, theme color `#2563eb`, portrait orientation
- **Service Worker** (`/public/sw.js`): installs shell cache (`/`, `/dashboard`, `/settings`), cleans old caches on activate, network-first fetch with cache fallback for offline use
- **ServiceWorkerRegister** client component: registers SW on mount via `navigator.serviceWorker.register`
- **Meta tags** in layout: `<link rel="manifest">`, `theme-color`, `apple-mobile-web-app-capable`, Apple status bar style and title
- Add `public/icon-192.png` and `public/icon-512.png` (192×192 and 512×512) for full "Add to Home Screen" icon support
