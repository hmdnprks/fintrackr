/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export type NotificationType = 'budget_exceeded' | 'goal_deadline' | 'asset_stale' | 'backup_overdue'

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string
  dedupeKey: string
  createdAt: string
  readAt: string | null
  href?: string
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${n}`
}

export function getNotifications(): AppNotification[] {
  return ((getVaultDataSync() as any).notifications ?? []) as AppNotification[]
}

export async function saveNotifications(notifications: AppNotification[]) {
  await saveVaultData({ notifications } as any)
}

export async function markNotificationRead(id: string) {
  const updated = getNotifications().map(n =>
    n.id === id ? { ...n, readAt: new Date().toISOString() } : n
  )
  await saveNotifications(updated)
}

export async function markAllNotificationsRead() {
  const now = new Date().toISOString()
  const updated = getNotifications().map(n => n.readAt ? n : { ...n, readAt: now })
  await saveNotifications(updated)
}

const SKIP_CATEGORIES = new Set(['Transfer', 'Bank Charges', 'Uncategorized', 'Income', 'Loan'])
const STALE_MS = 30 * 24 * 60 * 60 * 1000

export function generateNotifications(): AppNotification[] {
  const vault = getVaultDataSync() as any
  const existing = (vault.notifications ?? []) as AppNotification[]
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const toCreate: AppNotification[] = []

  function hasUnread(key: string) {
    return existing.some((n: AppNotification) => n.dedupeKey === key && !n.readAt)
  }

  // ── 1. Budget exceeded (current month) ───────────────────────────────────
  const curStatement = (vault.statements ?? []).find((s: any) => s.monthKey === currentMonthKey)
  const statTx: any[] = curStatement?.transactions ?? []
  const manTx: any[] = (vault.manualTransactions ?? []).filter(
    (t: any) => t.transactionDate?.startsWith(currentMonthKey)
  )
  const spendByCategory: Record<string, number> = {}
  for (const tx of [...statTx, ...manTx]) {
    if (tx.type !== 'debit') continue
    const cat = tx.category || 'Uncategorized'
    if (SKIP_CATEGORIES.has(cat)) continue
    spendByCategory[cat] = (spendByCategory[cat] ?? 0) + (tx.amount || 0)
  }
  for (const [cat, limit] of Object.entries((vault.budgets ?? {}) as Record<string, number>)) {
    if (!limit) continue
    const spent = spendByCategory[cat] ?? 0
    if (spent <= limit) continue
    const key = `budget_exceeded:${cat}:${currentMonthKey}`
    if (hasUnread(key)) continue
    toCreate.push({
      id: crypto.randomUUID(), type: 'budget_exceeded',
      title: `${cat} budget exceeded`,
      body: `Spent ${fmtCompact(spent)} of your ${fmtCompact(limit)} budget this month.`,
      dedupeKey: key, createdAt: now.toISOString(), readAt: null,
      href: '/dashboard?tab=budget',
    })
  }

  // ── 2. Goal deadline within 30 days ──────────────────────────────────────
  for (const goal of (vault.goals ?? []) as any[]) {
    if (goal.type !== 'savings' || !goal.deadline) continue
    const [y, m] = (goal.deadline as string).split('-').map(Number)
    const daysLeft = (new Date(y, m - 1, 1).getTime() - now.getTime()) / 86_400_000
    if (daysLeft < 0 || daysLeft > 30) continue
    const key = `goal_deadline:${goal.id}`
    if (hasUnread(key)) continue
    const label = goal.name || `Save ${fmtCompact(goal.targetAmount)}`
    const days = Math.ceil(daysLeft)
    toCreate.push({
      id: crypto.randomUUID(), type: 'goal_deadline',
      title: 'Goal deadline approaching',
      body: `"${label}" is due in ${days} day${days !== 1 ? 's' : ''}.`,
      dedupeKey: key, createdAt: now.toISOString(), readAt: null,
      href: '/dashboard?tab=budget',
    })
  }

  // ── 3. Asset stale > 30 days (skip vehicle / property) ───────────────────
  for (const asset of (vault.assets ?? []) as any[]) {
    if (['vehicle', 'property'].includes(asset.type)) continue
    if (!asset.updatedAt) continue
    if (now.getTime() - new Date(asset.updatedAt).getTime() <= STALE_MS) continue
    const key = `asset_stale:${asset.id}`
    if (hasUnread(key)) continue
    toCreate.push({
      id: crypto.randomUUID(), type: 'asset_stale',
      title: 'Asset value outdated',
      body: `"${asset.name}" hasn't been updated in over 30 days.`,
      dedupeKey: key, createdAt: now.toISOString(), readAt: null,
      href: '/dashboard?tab=assets',
    })
  }

  // ── 4. Backup overdue ────────────────────────────────────────────────────
  if ((vault.statements ?? []).length > 0) {
    const lastBackupAt = vault.settings?.lastBackupAt as string | undefined
    const ageMs = lastBackupAt ? now.getTime() - new Date(lastBackupAt).getTime() : Infinity
    if (ageMs > STALE_MS) {
      const key = `backup_overdue:${currentMonthKey}`
      if (!hasUnread(key)) {
        toCreate.push({
          id: crypto.randomUUID(), type: 'backup_overdue',
          title: 'Backup overdue',
          body: lastBackupAt
            ? 'Last backup was over 30 days ago. Export a new one to protect your data.'
            : "You haven't backed up your data yet. Export a backup to keep it safe.",
          dedupeKey: key, createdAt: now.toISOString(), readAt: null,
          href: '/settings',
        })
      }
    }
  }

  return toCreate
}
