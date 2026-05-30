# Fintrackr — Improvements Tracker

Checklist of shipped features and planned improvements. Items without a check are not yet built.

---

## Import & Parsing

- [x] Multi-file batch import — drop multiple PDFs at once; sequential processing with live per-file progress list (pending / processing / saved / duplicate / error)
- [x] Password-protected PDF support
- [x] Duplicate period detection — skips months already in the vault
- [x] Filter SALDO AWAL rows and undefined/NaN amounts from parsed output
- [x] Collapsible statement guide — email subject, filename format, password hint (DDMMYYYY)
- [ ] BCA statement parser
- [ ] Bank Jago statement parser (JSON export)
- [ ] BRI / BNI / CIMB parser
- [ ] Auto-detect bank from PDF so users don't need to choose

---

## Transaction Categorization

- [x] 50+ Indonesian default rules covering major merchants and services
- [x] User-defined keyword rules (override system defaults)
- [x] Smart AI categorization pipeline (3 phases):
  - [x] Phase 1 — learned rules: reuses categories from previously categorized transactions via normalized description matching
  - [x] Phase 2 — deduplication: groups by normalized description, sends only unique merchants to AI (2,000 transactions → 20 API rows)
  - [x] Phase 3 — AI fallback: DeepSeek with sequential batching and exponential backoff
- [x] Manual inline override — click any category badge to reassign; apply-to-all-similar prompt appears inline below the edited row with up to 5 matching transactions shown (date, merchant label, current category, amount); per-row × to exclude individual transactions before applying; success message shows actual applied count
- [x] Recurring uncategorized pattern panel — bulk-assign categories; expandable row shows last 5 occurrences with timestamps for manual lookup in Livin Mandiri
- [x] Categorization result modal shows learned vs AI counts
- [x] Confidence score per AI-categorized transaction — AI returns high/medium/low confidence per result; stored on each transaction; colored dot on category badge (green/amber/red) with tooltip
- [x] User feedback loop — "wrong category" flag on AI-categorized rows; flagged + reassigned transactions recorded in learnedRules with source 'ai-corrected'; improves future categorization without re-running AI
- [x] Learn from manual overrides automatically — every inline category change upserts normalizedDesc → category into vault learnedRules; Phase 1 seeds from learnedRules before scanning transaction history; AI results also persisted to learnedRules; included in backup
- [x] **Bulk search categorize** — "Set all N results as…" bar in filter card when search is active; applies selected category to all filtered transactions across all pages; 3s success indicator
- [x] **Merchant labels** — tag icon on each description to assign a human-readable alias (e.g. UBP...FFFFFF... → "Shopee"); alias shown as primary bold text with raw description below in gray; saved to vault transactionLabels; included in backup; label key keeps digits for precision (different UBP merchants stay distinct)
- [x] **Category icons** — each category badge shows a small Heroicon (w-3 h-3) before the label for faster visual scanning
- [x] **Loan category** — for KKB, KPR, personal loan installments; 9 default keyword rules; excluded from spending analysis and savings rate trend; counted as Needs in 50/30/20; appears in fixed commitments detection; rose/pink badge + ReceiptPercentIcon
- [x] **ATM withdrawal rules** — Tarik ATM, TARIK ATM, ATM-, TARIKAN ATM → Transfer (cash conversion, not spending)

---

## Dashboard — Overview Tab

- [x] Summary cards — income, expense, net with month-over-month delta badges
- [x] Income vs Expense bars with savings rate badge
- [x] Monthly trend line chart — year-filtered, 12-month sliding window with ← → navigation
- [x] Month comparison — per-category breakdown vs prior month; dual bars; amber highlight ≥30% increase
- [x] Daily spending calendar — heat map grid; click any day to see transactions with inline recategorization
- [ ] Spending forecast — project next month's income/expense based on recurring patterns
- [ ] Year-over-year comparison (not just month-over-month)

---

## Dashboard — Insights Tab

- [x] AI Insights panel — Generate/Regenerate/Clear; pre-aggregates data before sending; structured 4-bullet output; period-aware
- [x] 50/30/20 Spending Breakdown — Needs / Wants / Surplus with ideal threshold markers and contextual status messages
- [x] Savings Rate Trend — monthly bar chart; horizontally scrollable (min 20px/bar, auto-scrolls to latest); 20% target line; best month label
- [x] Fixed Monthly Commitments — auto-detects recurring expenses across ≥2 months; card layout with full description visible
- [x] Investment Rate — keyword-based detection of investment platform transfers (Bibit, Stockbit, Ajaib, etc.)
- [x] **Financial Health Score** — composite 0–100 score (grades A+/A/B/C/D) across savings rate (30 pts), emergency fund (30 pts), investment rate (20 pts), budget adherence (20 pts); per-dimension progress bars; motivating message per grade; placed in Insights tab
- [x] **FIRE Number** — 25× annual expenses; progress bar (net worth vs target); stats grid (annual expenses, savings, years to FIRE); birth year input saved to vault → shows projected FIRE age and target year; collapsible FIRE explainer (4% rule, Indonesian context, FIRE variants); placed in Assets tab
- [ ] Cash Flow Forecast — based on avg income and spending, project next month's expected balance change
- [ ] Income stability score — variance in monthly income; high variance → flag need for larger emergency fund
- [ ] Burn rate — average daily spending; useful for travel planning and cash management
- [ ] Savings rate trend shown as a chart line on the monthly trend chart (overlay)

---

## Dashboard — Budget Tab

- [x] Monthly budget limits per category with progress bars (green / amber ≥80% / red ≥100%)
- [x] IDR thousand-separator formatting in budget input
- [x] AI budget suggestions — based on last 3 months avg spending; editable per-row before applying
- [x] Financial goals — savings goals (target amount + deadline) and spending habit goals (consecutive months under limit)
- [x] Category breakdown — donut chart + ranked list; Expenses/Income toggle
- [ ] Budget rollover — unspent budget carries forward to next month
- [ ] Goal notifications — in-app alert when a goal deadline is approaching
- [ ] Shared budget mode — split expenses between people (future)

---

## Assets Tab

- [x] 5 asset types: Savings, Gold, Investment, Pocket, Other
- [x] Net worth summary with allocation breakdown bars by type
- [x] Net worth growth — auto-snapshot on every asset update; shows ↑/↓ vs most recent snapshot ≥25 days old
- [x] Per-asset value history — up to 365 daily snapshots per asset; each card shows growth since last snapshot
- [x] Emergency fund section — 5-tier status (Critical/Low/Building/Healthy/Strong); contextual advice in Indonesian context
- [x] Liquid coverage ratio — all savings ÷ avg monthly expense; 4-tier status; displayed alongside emergency fund
- [x] Contributable toggle — marks auto-managed funds (BPJS JHT) as non-contributable; excluded from windfall allocation
- [x] Windfall allocation — AI-powered plan for bonus/THR/freelance; emergency fund + pockets + investments + reward slice; two progress bars per destination; hard clamp prevents over-allocation
- [x] All icons via @heroicons/react
- [x] **Asset Reallocation Advisor** — AI CTA in the net worth card to analyse current asset distribution and suggest rebalancing; risk preference selector (Conservative / Moderate / Aggressive); AI considers emergency fund adequacy, excess low-yield savings, investment under-allocation, and Indonesian products (Reksa Dana Pasar Uang, Reksa Dana Saham, Deposito); returns structured suggestions with from/to/amount/reason; net worth card also shows last-updated timestamp
- [x] **Rebalance result persistence** — auto-saves every analysis to vault (last 5 entries); "Load" banner on next open restores the previous result without re-running AI; included in JSON backup export and restore
- [x] **Rebalance PDF export** — Export PDF button opens a print-ready HTML page (no library dependency) with health badge, summary, execution note, suggestion cards, safety check, and disclaimer
- [x] **Rebalance safety check** — AI computes remaining liquid savings after all moves and states months of expense coverage; verdict badge (Safe green / Caution amber / Warning red) shown below suggestion cards
- [x] **Rebalance UX improvements** — priority ordering (#1 most urgent), confidence badges (High priority / Consider / Optional) with reason phrases, running balance shown per suggestion card, insufficient-funds warning when accumulated withdrawals exceed source balance
- [ ] **Vehicle / Property asset type** — depreciating assets (car, motorcycle, house, land); excluded from liquid coverage and emergency fund calculations; value depreciation model
- [ ] **Stale asset indicator** — amber badge on cards and net worth summary when any asset value hasn't been updated in 30+ days; prompts user to refresh values
- [ ] **Net worth trend chart** — line chart showing aggregate net worth over time using stored snapshots; visual growth story
- [ ] **Per-asset mini sparkline** — small trend line on each card showing value history over last 6 months
- [ ] **Investment allocation targets** — user sets desired % per asset type (e.g. 30% savings, 40% investments, 20% gold); shows actual vs target with gap
- [ ] **BPJS JHT claim reminder** — if a JHT asset is marked as "from previous employer", surface a note that it is withdrawable now
- [ ] Manual portfolio import — paste Bibit/Stockbit portfolio value from app screenshot or CSV

---

## Data & Backup

- [x] JSON backup v4 — statements, transactions, rules, budgets, goals, assets, net worth snapshots, per-asset snapshots, rebalance history, learned rules, transaction labels
- [x] Backwards-compatible restore — v1/v2/v3 backups load cleanly
- [x] Merge restore — deduplicates by ID; backup wins on same-day snapshots
- [x] CSV export — filtered transaction list
- [ ] **Google Drive backup** — OAuth2 PKCE flow; auto-save encrypted backup to Drive appdata folder; requires Google Cloud project + OAuth client ID
- [ ] Scheduled auto-backup reminder — prompt user to export backup every 30 days
- [ ] Backup encryption option — encrypt the JSON file itself before download (separate from vault encryption) so it's safe to store in cloud

---

## AI Features

- [x] AI Categorize — sequential batching with exponential backoff; Indonesian-context prompt
- [x] AI Insights — period-aware; excludes Transfer/Bank Charges from spending analysis; 4-bullet structured output
- [x] AI Budget Suggestions — based on 3-month average spending; editable before applying
- [x] AI Windfall Allocation — full financial context (income, assets, goals, emergency fund gap); reward slice; THR-aware
- [x] AI Rebalance Advisor — priority-ordered suggestions, confidence levels, running balance per step, savings safety check post-rebalance; auto-saved to vault; exportable as PDF
- [x] User-provided DeepSeek API key stored in vault
- [x] Server-side `DEEPSEEK_API_KEY` env var override
- [ ] **Switch AI provider** — allow user to choose DeepSeek / OpenAI / Claude via settings
- [ ] **AI financial health check** — monthly summary: what improved, what needs attention, one action item
- [ ] AI-assisted goal planning — given a savings target, suggest how to reach it based on current income/expense patterns
- [ ] Improve investment rate detection — let user confirm/deny detected transactions to build a personal investment pattern

---

## Multi-Bank Support

- [x] Mandiri e-statement parser (consolidated PDF)
- [ ] BCA statement parser
- [ ] Bank Jago (primary account for emergency fund + pockets)
- [ ] Manual transaction entry as a universal fallback (already exists)
- [ ] Generic CSV import — map columns to date/description/amount/type

---

## Mobile & UX

- [x] Hamburger menu on mobile (auto-closes on navigation, Escape, or tap outside)
- [x] 5-tab dashboard with horizontally scrollable tab bar
- [x] Dashboard header filters: 2-column grid for selects, actions on separate row
- [x] Transaction tab: stacked header + full-width category filter on mobile
- [x] Budget tab: stacked header; amount shown below category name on mobile
- [x] Assets tab: responsive net worth bars; stacked modals; windfall cards stack on mobile
- [x] Savings rate chart: swipeable, auto-scrolls to latest month
- [x] Fixed commitments: card layout with full-width description
- [x] Import page: secondary button with Squares2X2Icon for dashboard link
- [ ] **Pull-to-refresh** on dashboard (mobile)
- [x] **Bottom navigation bar** on mobile — fixed bottom bar with Import/Dashboard/Settings icons, iOS safe-area inset, replaces hamburger entirely
- [x] Dark mode support — OS preference detection, localStorage persistence, full component coverage, Sun/Moon toggle in nav
- [x] PWA / installable — manifest.json, service worker (offline shell cache), ServiceWorkerRegister, Apple meta tags

---

## Security & Vault

- [x] AES-GCM encryption, PBKDF2 key derivation
- [x] Vault creation with password confirmation
- [x] Password show/hide toggle and strength indicator
- [x] Change master password (re-encrypts all data)
- [x] Session restored from sessionStorage on page refresh
- [x] Biometric unlock (Face ID / Touch ID via WebAuthn) on supported devices — platform authenticator via `navigator.credentials`; credential + vault password stored in IndexedDB; enable/disable in Settings; auto-revoked on master password change; graceful fallback to password on unsupported devices
- [ ] Vault inactivity timeout — auto-lock after X minutes

---

## Nice to Have / Long Term

- [ ] **Debt tracking** — car loan (KPR), credit card balance, personal loan; net worth = assets − liabilities
- [ ] **Subscription manager** — list all detected recurring subscriptions with cancel links and total monthly cost
- [ ] **Tax summary** — annual income summary for SPT filing (Indonesian context)
- [ ] **Multi-currency** — gold in USD/gram, investments in USD; display in IDR equivalent
- [ ] **Shared / household mode** — combine two users' finances into one dashboard
- [ ] Public release checklist — multi-bank support, custom parser SDK, privacy policy, App Store / Play Store listing
