import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { guestPlaceLabel, type AdminGuestListItem } from '@/lib/admin-guests'
import { formatCount, formatDate } from '@/lib/format'
import { fullName } from '@/lib/utils'

export function GuestTable({ guests }: { guests: AdminGuestListItem[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Гість</TableHead>
            <TableHead>Контакти</TableHead>
            <TableHead>Країна</TableHead>
            <TableHead>Бронювань</TableHead>
            <TableHead>Останній заїзд</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest) => {
            const name = fullName(guest.firstName, guest.lastName)
            return (
              <TableRow
                key={guest.id}
                tabIndex={0}
                className="cursor-pointer"
                aria-label={`Відкрити профіль: ${name}`}
                onClick={() => navigate(`/admin/guests/${guest.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/admin/guests/${guest.id}`)
                  }
                }}
              >
                <TableCell>
                  <span className="font-medium">{name}</span>
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground">
                    <div>{guest.email || '—'}</div>
                    <div>{guest.phone || '—'}</div>
                  </div>
                </TableCell>
                <TableCell>{guestPlaceLabel(guest.country, guest.city)}</TableCell>
                <TableCell className="tabular-nums">{formatCount(guest.bookingsCount)}</TableCell>
                <TableCell>{guest.lastCheckIn ? formatDate(guest.lastCheckIn) : '—'}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
