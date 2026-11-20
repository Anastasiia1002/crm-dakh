import { Link, useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MobileCard, MobileCardDetail, MobileCardDetails, MobileCardHeader, MobileList } from '@/components/ui/mobile-list'
import type { AdminGuestListItem } from '@/lib/admin-guests'
import { formatCount, formatDate } from '@/lib/format'
import { fullName } from '@/lib/utils'

export function GuestTable({ guests }: { guests: AdminGuestListItem[] }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="hidden md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
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
      <MobileList>
        {guests.map((guest) => {
          const name = fullName(guest.firstName, guest.lastName)
          const notes = guest.notes?.trim()
          return (
            <MobileCard key={guest.id}>
              <Link
                to={`/admin/guests/${guest.id}`}
                className="block rounded-sm no-underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Відкрити профіль: ${name}`}
              >
                <MobileCardHeader title={name} />
                <MobileCardDetails>
                  {guest.phone ? <MobileCardDetail label="Телефон">{guest.phone}</MobileCardDetail> : null}
                  <MobileCardDetail label="Візити">
                    <span className="tabular-nums">{formatCount(guest.visitCount)}</span>
                  </MobileCardDetail>
                  {guest.lastVisit ? (
                    <MobileCardDetail label="Останній візит">{formatDate(guest.lastVisit)}</MobileCardDetail>
                  ) : null}
                  {notes ? <MobileCardDetail label="Коментар">{notes}</MobileCardDetail> : null}
                </MobileCardDetails>
              </Link>
            </MobileCard>
          )
        })}
      </MobileList>
    </>
  )
}
