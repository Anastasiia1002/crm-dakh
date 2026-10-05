import { formatDate } from '@/lib/format'
import type { GuestListItem } from '@/types'

const HEADERS = ['Імʼя', 'Прізвище', 'Email', 'Телефон', 'Країна', 'Місто', 'Примітки', 'Бронювань', 'Останнє бронювання', 'Ночей', 'Витрачено']

function rowCells(guest: GuestListItem) {
  return [
    guest.firstName,
    guest.lastName,
    guest.email,
    guest.phone,
    guest.country,
    guest.city,
    guest.notes,
    String(guest.bookingsCount),
    guest.lastBookingDate ? formatDate(guest.lastBookingDate) : '',
    String(guest.totalNights),
    String(guest.totalSpent),
  ]
}

function escapeCsv(value: string) {
  if (/[",\n;]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function download(filename: string, mime: string, contents: string) {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadGuestCsv(guests: GuestListItem[]) {
  const lines = [HEADERS, ...guests.map(rowCells)].map((row) => row.map(escapeCsv).join(','))
  download('gosti.csv', 'text/csv;charset=utf-8', `\uFEFF${lines.join('\n')}`)
}

export function downloadGuestExcel(guests: GuestListItem[]) {
  const header = HEADERS.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')
  const body = guests
    .map((guest) => {
      const cells = rowCells(guest)
        .map((cell, index) => {
          const numeric = index >= 7 && index !== 8 && cell !== ''
          const type = numeric ? 'Number' : 'String'
          return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Гості"><Table><Row>${header}</Row>${body}</Table></Worksheet>
</Workbook>`
  download('gosti.xls', 'application/vnd.ms-excel;charset=utf-8', xml)
}

export const guestImportTemplate = `\uFEFFІмʼя,Прізвище,Email,Телефон,Країна,Місто,Примітки\n`

export function downloadGuestTemplate() {
  download('shablon-gostei.csv', 'text/csv;charset=utf-8', guestImportTemplate)
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('uk-UA', { maximumFractionDigits: 1 })} КБ`
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('uk-UA', { maximumFractionDigits: 1 })} МБ`
}
