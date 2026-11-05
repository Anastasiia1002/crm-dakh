import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminGuestListItem } from '@/lib/admin-guests'
import { formatCount, formatDate } from '@/lib/format'
import { fullName } from '@/lib/utils'

export function GuestTable({ guests }: { guests: AdminGuestListItem[] }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ПІБ</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Візити</TableHead>
              <TableHead>Останній візит</TableHead>
              <TableHead>Коментар</TableHead>
              <TableHead>Реєстрація</TableHead>
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
                  <TableCell className="text-muted-foreground">{guest.phone || '—'}</TableCell>
                  <TableCell className="tabular-nums">{formatCount(guest.visitCount)}</TableCell>
                  <TableCell>{guest.lastVisit ? formatDate(guest.lastVisit) : '—'}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{guest.notes?.trim() || '—'}</TableCell>
                  <TableCell>{formatDate(guest.createdAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y divide-border md:hidden">
        {guests.map((guest) => {
          const name = fullName(guest.firstName, guest.lastName)
          return (
            <li key={guest.id}>
              <button
                type="button"
                className="w-full space-y-1 py-4 text-left"
                onClick={() => navigate(`/admin/guests/${guest.id}`)}
              >
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{guest.phone || '—'}</p>
                <p className="text-sm text-muted-foreground">
                  Візити: {formatCount(guest.visitCount)} · Останній: {guest.lastVisit ? formatDate(guest.lastVisit) : 'не було'}
                </p>
                {guest.notes?.trim() ? <p className="text-sm text-muted-foreground">{guest.notes}</p> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
