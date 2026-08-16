export interface WhatNewEntry {
  version: string
  date: string
  items: string[]
}

/** Recent features, newest first. Update this when shipping user-visible changes. */
export const WHATS_NEW: WhatNewEntry[] = [
  {
    version: '0.1.9',
    date: '2026-08-16',
    items: [
      'PDF report asks which sections to include (Summary, Daily totals, Sleep, Feeding, Diaper) and remembers your choice',
    ],
  },
  {
    version: '0.1.8',
    date: '2026-08-13',
    items: [
      'Offline→online sync is automatic — records added offline merge when you reconnect',
      'Offline banner shows as soon as you lose connectivity and clears when back online',
      'Retry sync now confirms "Synced" or "Sync failed — still offline"',
      'Weight records can be duplicated via swipe',
      'Solids and dirty-diaper records have clearer list icons',
      'Solids rows are more compact with a tap-to-expand food list',
    ],
  },
  {
    version: '0.1.7',
    date: '2026-08-11',
    items: [
      'Bottom sheets can be dragged down to dismiss',
      'Food picker: "Most used" section and clearer search',
      'Emoji food icons in the picker and selected-food chips',
    ],
  },
]
