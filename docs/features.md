# fintrackr — Feature Overview

## PDF Parsing
- Upload Mandiri bank statement PDFs
- Auto-extract account summary, transaction list, balances
- Password-protected PDF support
- Multi-page transaction parsing

## Transaction Categorization
- **Rule-based** — keyword pattern matching from customizable rules
- **AI-powered** — DeepSeek API auto-categorizes uncategorized transactions
- Manual override via inline category dropdown in transactions table
- Custom rules in Settings (user rules override defaults)

## Dashboard
- Summary cards (total income, expense, balance)
- Income vs Expense bar chart (Chart.js)
- Category breakdown pie chart
- Monthly trend line chart
- Transactions table with date, detail, amount, category

## Recurring Detection
- Identifies repeating transactions (subscriptions, bills)
- Suggests categories for uncategorized recurring transactions
- Configurable threshold (min occurrences)

## AI Insights
- "Categorize with AI" button — batch-categorizes all uncategorized transactions via DeepSeek
- "AI Insights" button — generates natural language spending analysis (top categories, patterns, savings suggestions)
- Insights displayed in a styled card on dashboard

## Filters
- Year filter — shows only statements from selected year
- Month filter — shows only statements from selected month
- Months filtered dynamically based on selected year
- Year change resets month to "All Months"

## Secure Vault
- Password-protected encryption (AES-GCM via Web Crypto API)
- All transaction data encrypted in localStorage
- Unlock/lock vault session
- Change master password

## Settings
- Add/edit/delete custom categorization rules
- View system default rules
- Change vault master password
- AI configuration status

## Data Management
- Delete single month's data
- Clear all data
- Auto-save after PDF upload
- localStorage-based persistence
