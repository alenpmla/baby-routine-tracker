export interface WhatNewEntry {
  version: string
  date: string
  items: string[]
}

/** Recent features, newest first. Update this when shipping user-visible changes. */
export const WHATS_NEW: WhatNewEntry[] = [
  {
    version: '0.1.10',
    date: '2026-08-22',
    items: [
      'Medication reminders: if you logged a dose yesterday, Home asks around the same time today whether you gave it again — tap "Yes, log it" to record the dose at that time, or "Don\'t show me again" to silence reminders for that medication until you log it again',
    ],
  },
  {
    version: '0.1.9',
    date: '2026-08-16',
    items: [
      'PDF report asks which sections to include — Summary, Daily totals, Sleep, Feeding, Diaper, Medication, Temperature, Weight, Head circumference, Teeth, Teething, and Milestones — and remembers your choice',
      'PDF report sections with no data in the chosen period are disabled so empty sections are not included',
      'PDF report date picker offers quick presets — This month, Last month, Past 3 months, Last 7 days, and Last 30 days — that fill the From/To dates automatically',
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
