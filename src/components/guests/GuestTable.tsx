import { MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMoney, nightsLabel } from '@/lib/format'
import { fullName } from '@/lib/utils'
import type { GuestListItem } from '@/types'

export function GuestTable({ guests, onEdit }: { guests: GuestListItem[]; onEdit: (guest: GuestListItem) => void }) {
  const navigate = useNavigate()

  return (
    <Table className="min-w-[920px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Гість</TableHead>
          <TableHead>Контакти</TableHead>
          <TableHead>Країна</TableHead>
          <TableHead>Бронювань</TableHead>
          <TableHead>Останнє бронювання</TableHead>
          <TableHead>Загальна кількість ночей</TableHead>
          <TableHead>Витрачено</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Дії</span>
          </TableHead>
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
              <TableCell>{guest.country || '—'}</TableCell>
              <TableCell className="tabular-nums">{guest.bookingsCount}</TableCell>
              <TableCell>{guest.lastBookingDate ? formatDate(guest.lastBookingDate) : '—'}</TableCell>
              <TableCell>{nightsLabel(guest.totalNights)}</TableCell>
              <TableCell className="tabular-nums">{formatMoney(guest.totalSpent)}</TableCell>
              <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded-md p-1.5 text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={`Дії: ${name}`}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate(`/admin/guests/${guest.id}`)}>Переглянути</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onEdit(guest)}>Редагувати</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
