# Fintrackr — Improvements Tracker

Checklist of shipped features and planned improvements. Items without a check are not yet built.

---

## Priority Roadmap

Ranked by impact-to-effort ratio. Does not include bank parsers (blocked on statement samples).

| # | Feature | Section | Why |
|---|---------|---------|-----|
| 1 | **Generic CSV import** | Import & Parsing | Unblocks all banks (BCA, BRI, BNI, Jago, GoPay, OVO all export CSV); one column-mapper UI supports every bank without writing a parser |
| 2 | ~~**Google Drive auto-backup**~~ ✓ | Data & Backup | ~~localStorage can be wiped by the browser; one accidental "Clear site data" = all data gone; this is the biggest trust gap for serious long-term use~~ Shipped |
| 3 | **Debt payoff optimizer** | Assets Tab | Avalanche vs snowball comparison with total interest saved; the data (balance, rate, installment) is already stored — just needs the math and UI |
| 4 | **Gold price auto-fetch** | Assets Tab | Antam/LM publishes a public price; auto-multiply by weight = zero manual input for the most common Indonesian non-bank asset |
| 5 | ~~**In-app notification center**~~ ✓ | Mobile & UX | ~~Budget overrun, goal deadline, stale assets, backup overdue — currently all silent; a bell icon with a list makes the app proactive~~ Shipped |
| 6 | **Investment return tracking** | Assets Tab | Add "initial invested amount" field; compute actual return % vs current value; the one number investors care about most |
| 7 | **Budget rollover** | Budget Tab | Unspent budget carries to next month; widely expected by users |
| 8 | ~~**Vault inactivity timeout**~~ ✓ | Security & Vault | ~~Auto-lock after X minutes of inactivity; basic security hygiene~~ Shipped |
| 9 | ~~**Subscription manager**~~ ✓ | Nice to Have | ~~Detect recurring charges from fixed commitments; show total monthly and annual cost; surface cancel links~~ Shipped |
| 10 | **SPT / tax summary** | Nice to Have | Annual income summary for Indonesian tax filing (PPh 21 context) |

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
- [ ] **Generic CSV import** ⭐ — column-mapper UI (user assigns which column is date / description / debit / credit); supports any bank or e-wallet that exports CSV without writing a dedicated parser; unlocks BCA, BRI, BNI, GoPay, OVO, Dana, Shopee Pay in one shot
- [ ] **GoPay / OVO / Dana e-wallet import** — e-wallet transaction history covers most daily spending in Indonesia; CSV or in-app export; without this, a large slice of real spending is invisible to the app

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
- [x] **Merchant labels** — tag icon on each description to assign a human-readable alias (e.g. UBP...FFFFFF... → "Shopee"); alias shown as primary bold text with raw description below in gray; saved to vault transactionLabels; included in backup; label key is `normalizeDetail(description) + '|' + amount` so the same merchant at the same price (e.g. all 35k Apple Music charges) share one label, while the same merchant at a different price (169k iCloud vs 35k Apple Music) get separate labels; legacy keys kept for backward compat
- [x] **Category icons** — each category badge shows a small Heroicon (w-3 h-3) before the label for faster visual scanning
- [x] **Loan category** — for KKB, KPR, personal loan installments; 9 default keyword rules; excluded from spending analysis and savings rate trend; counted as Needs in 50/30/20; appears in fixed commitments detection; rose/pink badge + ReceiptPercentIcon
- [x] **ATM withdrawal rules** — Tarik ATM, TARIK ATM, ATM-, TARIKAN ATM → Transfer (cash conversion, not spending)
- [x] **Income miscategorization guard** — parser checks explicitly for D/K marker (no silent default to credit when column is missing); categorizer skips Income keyword rules for debit transactions; AI hook blocks learned Income rules from being seeded or applied to debits; Phase 2 re-queues existing debit+Income transactions for AI re-categorization; AI results overridden to Uncategorized if AI still returns Income for a debit

---

## Dashboard — Overview Tab

- [x] Summary cards — income, expense, net with month-over-month delta badges
- [x] Income vs Expense bars with savings rate badge
- [x] Monthly trend line chart — year-filtered, 12-month sliding window with ← → navigation
- [x] Month comparison — per-category breakdown vs prior month; dual bars; amber highlight ≥30% increase
- [x] Daily spending calendar — heat map grid; click any day to see transactions with inline recategorization
- [x] **Spending forecast** — projects next month income, expenses, and net using 3-month rolling average; excludes Transfer/Loan/Bank Charges; confidence badge (high/medium/low) based on variance; placed in Overview tab
- [x] **Year-over-year comparison** — adapts to active filter: month selected → same month vs last year; year selected → year totals vs prior year (same months only); all time → most recent year vs previous; % delta badges on income/expenses/net; top-5 category dual-bar breakdown

---

## Dashboard — Insights Tab

- [x] AI Insights panel — Generate/Regenerate/Clear; pre-aggregates data before sending; structured 4-bullet output; period-aware
- [x] 50/30/20 Spending Breakdown — Needs / Wants / Surplus with ideal threshold markers and contextual status messages
- [x] Savings Rate Trend — monthly bar chart; horizontally scrollable (36px/bar, auto-scrolls to latest); 20% target line; best month label; hover banner (outside scroll container to avoid CSS overflow clipping) shows month/year, savings rate %, and ±IDR saved; X-axis shows year label only at year boundaries to disambiguate multi-year data
- [x] Fixed Monthly Commitments — auto-detects recurring expenses across ≥2 months; card layout with full description visible
- [x] Investment Rate — keyword-based detection of investment platform transfers (Bibit, Stockbit, Ajaib, etc.)
- [x] **Financial Health Score** — composite 0–100 score (grades A+/A/B/C/D) across savings rate (30 pts), emergency fund (30 pts), investment rate (20 pts), budget adherence (20 pts); per-dimension progress bars; motivating message per grade; placed in Insights tab
- [x] **FIRE Number** — 25× annual expenses; progress bar (net worth vs target); stats grid (annual expenses, savings, years to FIRE); birth year input saved to vault → shows projected FIRE age and target year; collapsible FIRE explainer (4% rule, Indonesian context, FIRE variants); net worth = assets − liabilities (reads fresh data on every render, not stale mount-time snapshot); placed in Assets tab
- [x] Cash Flow Forecast — covered by Spending Forecast (net projection = expected balance change)
- [x] **Income stability score** — CV of last 6 months income; three tiers Stable/Variable/Highly Variable; shows income range (low/avg/high), variance %; emergency fund implication per tier (3–6mo / 6–9mo / 9+mo); placed in Insights tab between Health Score and 50/30/20
- [x] **Burn rate** — avg daily expense = totalExpense / (months × 30); shown as compact row at bottom of Income vs Expense card in Overview; co-located with expense data, zero extra card space
- [x] **Savings rate trend overlay** — dashed indigo line on right Y-axis (0–100%) added to Monthly Trend chart; secondary axis with purple % labels; tooltip correctly formats as % not IDR

---

## Dashboard — Budget Tab

- [x] Monthly budget limits per category with progress bars (green / amber ≥80% / red ≥100%)
- [x] IDR thousand-separator formatting in budget input
- [x] AI budget suggestions — based on last 3 months avg spending; editable per-row before applying
- [x] Financial goals — savings goals (name + target amount + deadline) and spending habit goals (consecutive months under limit); goal name shown as card title; falls back to "Save Rp X" for unnamed goals
- [x] **Savings goal progress tracking modes** — pencil button opens "Track Progress" modal; three modes: Auto (net savings from statements), Manual (user-entered amount), Linked (reads balance from a savings/pocket/investment/gold asset); mode badge shown on card
- [x] Category breakdown — donut chart + ranked list; Expenses/Income toggle
- [ ] **Budget rollover** ⭐ — unspent budget carries forward to next month; widely expected by users; show rollover amount as a separate line in the budget card
- [ ] Goal notifications — in-app alert when a goal deadline is approaching
- [ ] Shared budget mode — split expenses between people (future)
- [x] **AI Goal Instrument Advisor** — indigo "AI Plan" button on each active savings goal card; goal name auto-filled from the saved goal name (no re-entry needed); optional override input; context summary shows target, deadline, months left, monthly surplus (avg last 6 months), required/month, and achievability badge (green ✓ / amber ⚠ / red ✗); time-horizon tiers: <3mo → Tabungan/Deposito, 3–12mo → Deposito/RDPU, 12–36mo → RDPT/ORI/Sukuk/SBR, 36mo+ → RDPU buffer + RD Campuran + RD Saham; AI returns instrument cards (name, allocation %, expected return range, rationale + allocation bar), required monthly contribution, risk level badge, risk note, and summary; last 3 plans per goal persisted in vault and reloadable without re-running AI; button hidden on completed or overdue goals; max_tokens 2048 to prevent JSON truncation

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
- [x] **Rebalance PDF export** — Export PDF button generates and downloads a `.pdf` file directly via jsPDF (no print dialog, no new tab); includes health badge, summary, execution note, suggestion cards, safety check, and disclaimer
- [x] **Rebalance safety check** — AI computes remaining liquid savings after all moves and states months of expense coverage; verdict badge (Safe green / Caution amber / Warning red) shown below suggestion cards
- [x] **Rebalance UX improvements** — priority ordering (#1 most urgent), confidence badges (High priority / Consider / Optional) with reason phrases, running balance shown per suggestion card, insufficient-funds warning when accumulated withdrawals exceed source balance
- [x] **Vehicle / Property asset type** — depreciating assets (car, motorcycle) and appreciating assets (house, apartment, land); excluded from liquid coverage and emergency fund; depreciation model `purchasePrice × (1 + rate/100)^years`; default rates per subtype; current value auto-fills from model as user types purchase fields; "Reset to estimate" link when manually overridden; amber illiquid note in modal
- [x] **Liabilities section** — separate section in Assets tab for debt tracking; types: KPR, KKB, KTA, Credit Card, Other; each liability stores original amount, remaining balance, monthly installment, interest rate, start/maturity dates, optional link to a vehicle/property asset; card shows type badge, remaining balance in red, paid-off progress bar (% paid), monthly installment + rate + months left; net worth card shows Assets − Liabilities = Net Worth row when liabilities exist; asset allocation bars use total assets as base; included in backup
- [x] **Credit card liability overhaul** — CC entries use semantically correct fields: Credit Limit, Outstanding Balance, Minimum Payment, Interest Rate (%/month; OJK cap hint: 1.75%/month); utilization bar with 3-colour scheme (green <30%, amber 30–70%, red ≥70%) and over-limit warning; card shows outstanding balance, utilization %, and minimum payment; form hides loan-specific fields (linked asset, maturity date) and shows card expiry instead; balance may exceed limit (over-limit flagged, not blocked); placeholder examples list popular Indonesian CC products
- [x] **Stale asset indicator** — amber badge on cards and net worth summary when any asset value hasn't been updated in 30+ days; dismissable banner lists stale asset names; "Xd old" badge per card; amber timestamp with "update recommended"; ⚠ on net worth last-updated label
- [x] **Net worth trend chart** — inline SVG area chart inside the net worth summary card; groups NetWorthSnapshots by month; up to 12 months; indigo fill + line; y-axis labels (rb/jt/M); x-axis month labels; shown when ≥2 months of data exist
- [x] **Per-asset mini sparkline** — compact SVG line on each asset card (between value and type details); groups AssetSnapshots by month; last 6 months; green when value ↑, red when ↓; shown when ≥2 months of data exist for that asset
- [x] **Interest projection simulator** — "▾ Simulate" toggle on any savings/pocket/investment asset card that has an interest rate; yearly view (1/3/5/10yr columns) and monthly view (12 rows); Rp/month top-up input; PPh Final 20% tax toggle (Indonesian bank deposit withholding tax); monthly compounding `FV = P(1+r)^n + M×((1+r)^n−1)/r`; shows gross interest, tax deduction, net interest, and final value per period
- [x] **Pocket interest rate** — optional interest rate field on pocket assets (e.g. Jago Kantong, GoPay Tabungan Plus); stored alongside the asset and surfaces the interest simulator automatically on the card
- [ ] **Investment allocation targets** — user sets desired % per asset type (e.g. 30% savings, 40% investments, 20% gold); shows actual vs target with gap
- [ ] **BPJS JHT claim reminder** — if a JHT asset is marked as "from previous employer", surface a note that it is withdrawable now
- [ ] Manual portfolio import — paste Bibit/Stockbit portfolio value from app screenshot or CSV
- [ ] **Debt payoff optimizer** ⭐ — given multiple liabilities, show avalanche (highest rate first) vs snowball (smallest balance first) strategies side by side; display total interest saved per strategy and projected payoff date; all required data (balance, rate, installment) is already stored
- [ ] **Gold price auto-fetch** ⭐ — Antam/LM publishes daily buy/sell prices; store weight (gram) on gold assets; fetch price automatically and compute IDR value; rate age badge turns amber after 1 day; eliminates the most common manual update for Indonesian investors
- [ ] **Investment return tracking** ⭐ — add "initial invested amount" field to investment assets; compute actual return % = (current − initial) / initial × 100; show absolute gain/loss and annualised return if purchase date is stored; this is the number investors care about most
- [x] **Multi-currency assets** — foreign currency support on savings, gold, and investment assets (USD, EUR, SGD, GBP, AUD, JPY, MYR, CNY, SAR, HKD); foreign amount + exchange rate stored; IDR auto-computed; "Fetch latest rate" hits **frankfurter.app** (free, no API key, ECB-backed); live IDR preview in modal; rate age on card turns amber after 7 days; currency field hidden for pocket, vehicle, property, and other types

---

## Data & Backup

- [x] JSON backup v4 — statements, transactions, rules, budgets, goals, assets, net worth snapshots, per-asset snapshots, rebalance history, learned rules, transaction labels, settings (excl. API key), goal advisor history, liabilities, notifications (incl. read/dismissed state), manual subscriptions, subscribed description keys, dismissed auto-detected subscription keys
- [x] Backwards-compatible restore — v1/v2/v3 backups load cleanly
- [x] Merge restore — deduplicates by ID; backup wins on same-day snapshots
- [x] CSV export — filtered transaction list
- [x] **Google Drive backup** — GIS token client (popup OAuth2, no server/redirect/client-secret needed); saves `fintrackr-backup.json` to Drive `appDataFolder` (private, not visible in My Drive); Connect/Save to Drive/Restore from Drive/Disconnect in Settings; restore feeds into the existing merge-or-replace flow; session token stored in sessionStorage with 1-hour TTL; 401 auto-clears token and prompts reconnect; first-time auth requires adding email as test user in Google Cloud Console (app in Testing mode); upload uses DELETE + POST (CORS-safe) instead of PATCH — the `/upload/drive/v3/` endpoint blocks PATCH in browser CORS preflight; manual multipart body avoids FormData preflight issues; "failed to fetch" errors treated as session expiry and prompt reconnect
- [ ] Scheduled auto-backup reminder — prompt user to export manual backup every 30 days if Google Drive is not connected
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
- [x] All AI features use `deepseek-chat` (DeepSeek V3) — fast, non-reasoning model; avoids token-budget exhaustion from chain-of-thought that caused empty responses on `deepseek-v4-pro`
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

## Financial Education & Hints

- [x] **Info tooltips on all financial-term cards** — small ⓘ icon next to card titles (and per-dimension in Health Score); click to open a popover with plain-language explanation; closes on outside click; dark-mode aware
  - Savings Rate: formula, Transfer exclusion, tier thresholds
  - Investment Rate: what counts, why 15–20% target
  - Income Stability: CV formula explained, tier thresholds
  - 50/30/20 Breakdown: rule origin (Elizabeth Warren), what each bucket covers, Indonesian context note
  - Financial Health Score: title tooltip (4 dimensions + grading); per-dimension tooltips with exact scoring thresholds
  - Emergency Fund: what qualifies, why not gold/investments, recommended ranges by household
  - Liquid Coverage: how it differs from emergency fund, 4-tier thresholds
- [x] **Household-aware Emergency Fund target** — selector (Single / Couple / Sole breadwinner / Family with many dependents) on the Emergency Fund card; each type sets a different recommended month target (6 / 6 / 9 / 12), minimum marker, and "To reach X months" amount; selection persisted to vault `settings.householdType`

---

## Mobile & UX

- [x] Hamburger menu on mobile (auto-closes on navigation, Escape, or tap outside)
- [x] 5-tab dashboard with horizontally scrollable tab bar
- [x] Dashboard header filters: 2-column grid for selects, actions on separate row
- [x] Transaction tab: stacked header + full-width category filter on mobile
- [x] Transaction table: date column always shows year (was conditional on multi-year data); summary line shows separate green +income and red −expense totals instead of a single meaningless gross sum
- [x] Budget tab: stacked header; amount shown below category name on mobile
- [x] Assets tab: responsive net worth bars; stacked modals; windfall cards stack on mobile
- [x] Savings rate chart: swipeable, auto-scrolls to latest month
- [x] Fixed commitments: card layout with full-width description
- [x] Import page: secondary button with Squares2X2Icon for dashboard link
- [ ] **Pull-to-refresh** on dashboard (mobile)
- [x] **In-app notification center** — bell icon in top nav (desktop + mobile) with red unread badge; 4 event types: budget category exceeded (current month), savings goal deadline ≤30 days away, asset value stale >30 days (excludes vehicle/property), backup not exported >30 days; notifications stored in vault; per-item dismiss + mark-all-read; dedupeKey prevents duplicate unread notifications; click navigates to relevant tab; empty state "All caught up"; `lastBackupAt` tracked on both local download and Drive save; `backup_overdue` auto-resolves (marked read) the moment a fresh Drive or local backup is made — no stale alert lingers after a successful backup
- [x] **Bottom navigation bar** on mobile — fixed bottom bar with Import/Dashboard/Settings icons, iOS safe-area inset, replaces hamburger entirely
- [x] Dark mode support — OS preference detection, localStorage persistence, full component coverage, Sun/Moon toggle in nav
- [x] **Dark mode contrast audit** — all colored status cards (Emergency Fund, Liquid Coverage), category badges, delta pills, tier badges, and tooltip threshold labels now carry matching `dark:bg-*/dark:border-*/dark:text-*` variants; 18 files updated so no text goes invisible against a light-colored card background in dark mode
- [x] **Import page dark mode** — all cards on the import page were plain `bg-white` with no dark variant; fixed across 5 files: privacy notice banner, FileUploadZone (card, drop zone states, file icon, password input), StatementGuide (card, amber tip box, step text), BatchProgress (card, progress bar, file list, status badges), ParseResultPreview (all 4 result cards, savings rate badge, bar backgrounds, table rows)
- [x] PWA / installable — manifest.json, service worker (offline shell cache), ServiceWorkerRegister, Apple meta tags

---

## Security & Vault

- [x] AES-GCM encryption, PBKDF2 key derivation
- [x] Vault creation with password confirmation
- [x] Password show/hide toggle and strength indicator
- [x] Change master password (re-encrypts all data)
- [x] Session restored from sessionStorage on page refresh
- [x] Biometric unlock (Face ID / Touch ID via WebAuthn) on supported devices — platform authenticator via `navigator.credentials`; credential + vault password stored in IndexedDB; enable/disable in Settings; auto-revoked on master password change; graceful fallback to password on unsupported devices
- [x] **Vault inactivity timeout** — auto-lock after configurable inactivity period (Off / 1 / 5 / 15 / 30 / 60 min); activity events (mouse, keyboard, touch, scroll) reset the timer; setting saved to vault, takes effect immediately without re-locking; added as Auto-lock card in Settings between Biometric and Data sections

---

## Nice to Have / Long Term

- [x] **Debt tracking** — see Liabilities section in Assets Tab above
- [x] **Subscription manager** — auto-detects 25 catalog services (Netflix, Spotify, Apple, Canva, etc.) from statement transactions; ↻ flag button on each debit row to mark any charge as a subscription; flag key is `normalizeDetail + '|' + amount` so 169k iCloud and 35k Apple Music are separate entries even though they share the same VAP-APPLE.COM description; catalog detection groups by service name (all Apple variants → one Apple entry unless explicitly flagged); user-flagged entries use per-amount transaction groups for accurate monthly average and price-change detection; manual add for GoPay/OVO subscriptions (name, amount, cancel URL, notes); cancel / manage links per service; NEW badge for services first seen in last 2 months; price-change badge (▲/▼ % vs prior 3-month avg, threshold ≥5%); unmark from subscription manager removes both the flag and the entry; all data in vault (`manualSubscriptions`, `subscribedDescriptions`, `dismissedSubscriptions`) and included in backup; **auto-detection** of non-catalog recurring charges — scans last 6 months for the same `normalizeDetail|amount` appearing in ≥3 consecutive calendar months, minimum Rp 5,000, shown with "auto-detected" indigo badge and "Recurring: Jan → Feb → Mar" history line, Dismiss button stores key in `dismissedSubscriptions` so it won't reappear; **"Go to transactions" folder icon button** on each subscription row — navigates to the Transactions tab and highlights matching rows with indigo left border + tinted background; for user/detected entries the key is `normalizeDetail|amount` so only the exact price point is highlighted (not all transactions from the same merchant); a "Subscription transactions · N found" banner confirms the filter with a clear (✕) button; clearing the highlight also resets the parent state so it doesn't re-inject on tab switch
- [ ] **Tax summary** ⭐ — annual gross income summary for SPT Tahunan filing; breakdown by month; Indonesian PPh 21 context
- [x] **Zakat Penghasilan calculator** — opt-in toggle in Settings; ZakatCard in Insights tab; BAZNAS 2025 nisab (85g × Rp 1,500,000 = Rp 127,500,000/year ≈ Rp 10,625,000/month); shows avg monthly income vs nisab, progress bar, obligated amount (monthly + annual), "Pay via BAZNAS" link; "Belum Wajib" state with Infaq/Sedekah suggestion when below nisab; footer with gold price basis and baznas.go.id link; nisab constant easy to update annually
- [ ] **Multi-currency** — gold in USD/gram, investments in USD; display in IDR equivalent
- [ ] **Shared / household mode** — combine two users' finances into one dashboard
- [ ] Public release checklist — multi-bank support, custom parser SDK, privacy policy, App Store / Play Store listing
