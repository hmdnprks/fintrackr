/* eslint-disable @typescript-eslint/no-explicit-any */

export type ManualSubscription = {
  id: string
  name: string
  monthlyAmount: number
  cancelUrl?: string
  notes?: string
  createdAt: string
}

export type SubscriptionEntry = {
  key: string
  source: 'auto' | 'manual'
  name: string
  emoji: string
  cancelUrl?: string
  monthlyAmount: number
  lastAmount?: number
  months?: number
  firstSeenMonth?: string
  lastSeenMonth?: string
  priceChange?: {
    oldAvg: number
    newAvg: number
    pct: number
    direction: 'up' | 'down'
  }
  isNew: boolean
  isApple?: boolean
}

type CatalogEntry = {
  keywords: string[]
  name: string
  emoji: string
  cancelUrl: string
}

// Keywords are matched against the raw transaction detail uppercased.
// More specific entries must come before more general ones.
const CATALOG: CatalogEntry[] = [
  // Entertainment — streaming
  { keywords: ['NETFLIX'],                                           name: 'Netflix',        emoji: '🎬', cancelUrl: 'https://www.netflix.com/account' },
  { keywords: ['SPOTIFY'],                                           name: 'Spotify',        emoji: '🎵', cancelUrl: 'https://www.spotify.com/account/subscription/' },
  { keywords: ['YOUTUBE PREMIUM', 'YOUTUBEPREMIUM', 'YOUTUBE MUSIC', 'YOUTUBEMUSIC', 'GOOGLE*YOUTUBE'],
                                                                     name: 'YouTube Premium',emoji: '▶️',  cancelUrl: 'https://www.youtube.com/paid_memberships' },
  { keywords: ['DISNEY'],                                            name: 'Disney+',        emoji: '✨', cancelUrl: 'https://www.disneyplus.com/account' },
  { keywords: ['VIDIO'],                                             name: 'Vidio',          emoji: '📺', cancelUrl: 'https://www.vidio.com/account' },
  { keywords: ['MOLA TV', 'MOLATV', 'MOLA.TV'],                     name: 'Mola TV',        emoji: '⚽', cancelUrl: 'https://mola.tv/account' },
  { keywords: ['WETV', 'WE TV'],                                     name: 'WeTV',           emoji: '📺', cancelUrl: 'https://wetv.vip/en/account' },
  { keywords: ['VIU.COM', ' VIU ', 'VIU*'],                         name: 'Viu',            emoji: '📺', cancelUrl: 'https://www.viu.com/ott/id/' },
  { keywords: ['AMAZON PRIME', 'PRIMEVIDEO', 'PRIME VIDEO'],         name: 'Amazon Prime',   emoji: '🛒', cancelUrl: 'https://www.amazon.com/manageprime' },
  // Apple — all App Store / iCloud charges appear as a single entry
  { keywords: ['ITUNES', 'APL*', 'APPLE.COM/BILL'],                  name: 'Apple',          emoji: '🍎', cancelUrl: 'https://appleid.apple.com/account/manage', },
  // Google storage / workspace (must come after YouTube entry)
  { keywords: ['GOOGLE ONE', 'GOOGLE*ONE', 'GOOGLE DRIVE', 'GOOGLE*DRIVE', 'GOOGLE*STORAGE', 'GOOGLE STORAGE'],
                                                                     name: 'Google One',     emoji: '💾', cancelUrl: 'https://one.google.com/storage' },
  // Productivity
  { keywords: ['MICROSOFT 365', 'OFFICE 365', 'OFFICE365', 'MS365', 'MICROSOFT*365'],
                                                                     name: 'Microsoft 365',  emoji: '📊', cancelUrl: 'https://account.microsoft.com/services' },
  { keywords: ['ADOBE'],                                             name: 'Adobe',          emoji: '🎨', cancelUrl: 'https://account.adobe.com/plans' },
  { keywords: ['CANVA'],                                             name: 'Canva',          emoji: '🖌️',  cancelUrl: 'https://www.canva.com/settings/billing' },
  { keywords: ['NOTION'],                                            name: 'Notion',         emoji: '📝', cancelUrl: 'https://www.notion.com/profile/billing' },
  { keywords: ['FIGMA'],                                             name: 'Figma',          emoji: '🎯', cancelUrl: 'https://www.figma.com/billing' },
  { keywords: ['GITHUB'],                                            name: 'GitHub',         emoji: '⚙️',  cancelUrl: 'https://github.com/settings/billing' },
  { keywords: ['DROPBOX'],                                           name: 'Dropbox',        emoji: '📦', cancelUrl: 'https://www.dropbox.com/account/plan' },
  { keywords: ['ZOOM'],                                              name: 'Zoom',           emoji: '📹', cancelUrl: 'https://zoom.us/account' },
  { keywords: ['SLACK'],                                             name: 'Slack',          emoji: '💬', cancelUrl: 'https://slack.com/account/settings' },
  { keywords: ['GRAMMARLY'],                                         name: 'Grammarly',      emoji: '✍️',  cancelUrl: 'https://www.grammarly.com/premium' },
  // AI
  { keywords: ['CHATGPT', 'OPENAI'],                                 name: 'ChatGPT',        emoji: '🤖', cancelUrl: 'https://platform.openai.com/account/billing' },
  // Wellness / learning
  { keywords: ['DUOLINGO'],                                          name: 'Duolingo',       emoji: '🦉', cancelUrl: 'https://www.duolingo.com/settings/subscription' },
  { keywords: ['HEADSPACE'],                                         name: 'Headspace',      emoji: '🧘', cancelUrl: 'https://www.headspace.com/my-plan' },
]

function matchCatalog(rawDetail: string): CatalogEntry | null {
  const upper = rawDetail.toUpperCase()
  for (const entry of CATALOG) {
    if (entry.keywords.some(kw => upper.includes(kw.toUpperCase()))) return entry
  }
  return null
}

export function detectSubscriptions(
  statements: any[],
  manualSubs: ManualSubscription[]
): SubscriptionEntry[] {
  // Group by catalog service name so variants (NETFLIX.COM, PAYPAL*NETFLIX) merge
  const groups: Record<string, {
    catalogEntry: CatalogEntry
    monthAmounts: Record<string, number>
    sampleDetail: string
  }> = {}

  for (const s of statements) {
    const mk: string = s.monthKey
    if (!mk) continue
    for (const t of (s.transactions ?? []) as any[]) {
      if (t.type !== 'debit') continue
      const match = matchCatalog(t.detail ?? '')
      if (!match) continue
      if (!groups[match.name]) {
        groups[match.name] = { catalogEntry: match, monthAmounts: {}, sampleDetail: t.detail }
      }
      groups[match.name].monthAmounts[mk] =
        (groups[match.name].monthAmounts[mk] ?? 0) + (t.amount ?? 0)
    }
  }

  const now = new Date()
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const twoMonthsAgoKey = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const autoEntries: SubscriptionEntry[] = Object.entries(groups).map(([, g]) => {
    const { catalogEntry, monthAmounts } = g
    const sortedMonths = Object.keys(monthAmounts).sort()
    const allAmounts = sortedMonths.map(m => monthAmounts[m])
    const avgMonthly = allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length
    const lastSeenMonth = sortedMonths[sortedMonths.length - 1]
    const firstSeenMonth = sortedMonths[0]
    const lastAmount = monthAmounts[lastSeenMonth]

    // Price change: compare avg of last 3 months vs the 3 months before that
    const recent = sortedMonths.slice(-3).map(m => monthAmounts[m])
    const prior  = sortedMonths.slice(-6, -3).map(m => monthAmounts[m])
    let priceChange: SubscriptionEntry['priceChange']
    if (prior.length >= 2 && recent.length >= 2) {
      const recentAvg = recent.reduce((s, a) => s + a, 0) / recent.length
      const priorAvg  = prior.reduce((s, a) => s + a, 0) / prior.length
      const pct = priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0
      if (Math.abs(pct) >= 5) {
        priceChange = {
          oldAvg: priorAvg,
          newAvg: recentAvg,
          pct,
          direction: pct > 0 ? 'up' : 'down',
        }
      }
    }

    return {
      key: catalogEntry.name,
      source: 'auto' as const,
      name: catalogEntry.name,
      emoji: catalogEntry.emoji,
      cancelUrl: catalogEntry.cancelUrl,
      monthlyAmount: avgMonthly,
      lastAmount,
      months: sortedMonths.length,
      firstSeenMonth,
      lastSeenMonth,
      priceChange,
      isNew: firstSeenMonth >= twoMonthsAgoKey,
      isApple: catalogEntry.name === 'Apple',
    }
  }).sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  // Manual subs — show only those not already auto-detected
  const autoNames = new Set(autoEntries.map(e => e.name.toLowerCase()))
  const manualEntries: SubscriptionEntry[] = manualSubs
    .filter(m => !autoNames.has(m.name.toLowerCase()))
    .map(m => ({
      key: m.id,
      source: 'manual',
      name: m.name,
      emoji: '📋',
      cancelUrl: m.cancelUrl,
      monthlyAmount: m.monthlyAmount,
      isNew: false,
    }))

  return [...autoEntries, ...manualEntries]
}
