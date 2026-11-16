import { adminBookingRef, adminGuestName, adminRoomsLabel } from '@/lib/admin-booking-view'
import { adminBookingSourceLabel, bookingStatusLabel } from '@/lib/labels'
import type { AdminBookingListItem } from '@/types'

const HEADERS = ['ID', 'Гість', 'Телефон', 'Розміщення', 'Заїзд', 'Виїзд', 'Гості', 'Статус', 'Джерело', 'Сума']

function csvCell(value: string) {
  const text = value.replace(/^[=+\-@]/, "'$&")
  if (/[";\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function guestsCell(item: AdminBookingListItem) {
  const adults = `${item.adults} дорослих`
  if (!item.children) return adults
  return `${adults} · ${item.children} дітей`
}

export function bookingsPageCsv(items: readonly AdminBookingListItem[]) {
  const rows = items.map((item) => [
    adminBookingRef(item.id),
    adminGuestName(item.guest),
    item.guest.phone ?? '',
    adminRoomsLabel(item.rooms),
    item.checkIn,
    item.checkOut,
    guestsCell(item),
    bookingStatusLabel[item.status],
    adminBookingSourceLabel[item.source],
    `${item.totalAmount} ${item.currency}`,
  ])
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(csvCell).join(';')).join('\n')}`
}

export function downloadCsvBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadBookingsCsv(items: readonly AdminBookingListItem[]) {
  downloadCsvBlob(new Blob([bookingsPageCsv(items)], { type: 'text/csv;charset=utf-8' }), 'bronjuvannja.csv')
}
