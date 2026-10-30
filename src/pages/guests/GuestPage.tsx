import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GuestBookingHistory } from '@/components/guests/GuestBookingHistory'
import { GuestStats } from '@/components/guests/GuestStats'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { LoadingState } from '@/components/ui/states'
import { useGuestHistory, useGuestProfile } from '@/hooks/useGuestDirectory'
import { guestFailure, guestFailureMessage } from '@/lib/admin-guests'
import { formatDateTime } from '@/lib/format'
import { fullName } from '@/lib/utils'

const HISTORY_PAGE_SIZE = 20

export function GuestPage() {
  const { id = '' } = useParams()
  const [historyPage, setHistoryPage] = useState(1)
  const [historyGuestId, setHistoryGuestId] = useState(id)
  if (id !== historyGuestId) {
    setHistoryGuestId(id)
    setHistoryPage(1)
  }
  const activeHistoryPage = id === historyGuestId ? historyPage : 1
  const profile = useGuestProfile(id)
  const history = useGuestHistory(id, { page: activeHistoryPage, limit: HISTORY_PAGE_SIZE }, profile.isSuccess)
  const profileFailure = profile.isError ? guestFailure(profile.error) : null
  const historyFailure = history.isError ? guestFailure(history.error) : null

  if (profile.isLoading) return <LoadingState />
  if (profileFailure || !profile.data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/guests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Гості
        </Link>
        <p className="text-sm">{guestFailureMessage(profileFailure ?? 'unavailable')}</p>
        {profileFailure !== 'missing' ? (
          <Button size="sm" variant="outline" onClick={() => void profile.refetch()}>
            Спробувати ще раз
          </Button>
        ) : null}
      </div>
    )
  }

  const { guest, stats } = profile.data
  const notes = guest.notes?.trim()
  const fields = [
    { label: 'Імʼя та прізвище', value: fullName(guest.firstName, guest.lastName), prominent: true },
    { label: 'Email', value: guest.email || '—' },
    { label: 'Телефон', value: guest.phone || '—' },
    { label: 'Картку створено', value: formatDateTime(guest.createdAt) },
  ]

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/guests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Гості
        </Link>
        <p className="text-sm text-muted-foreground">Редагування картки гостя недоступне.</p>
      </div>

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className={field.prominent ? 'sm:col-span-2' : undefined}>
            <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{field.label}</dt>
            <dd className={field.prominent ? 'mt-2 font-serif text-4xl leading-none font-medium' : 'mt-1 text-sm'}>{field.value}</dd>
          </div>
        ))}
        {notes ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">Примітки</dt>
            <dd className="mt-1 max-w-2xl text-sm whitespace-pre-wrap">{notes}</dd>
          </div>
        ) : null}
      </dl>

      <GuestStats stats={stats} />

      {history.isLoading ? <LoadingState /> : null}
      {historyFailure ? (
        <div className="space-y-3">
          <p className="text-sm">{guestFailureMessage(historyFailure)}</p>
          <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}
      {history.data ? (
        <>
          <GuestBookingHistory history={history.data.items} />
          <Pagination
            page={history.data.page}
            pageSize={history.data.limit}
            total={history.data.total}
            onPageChange={setHistoryPage}
          />
        </>
      ) : null}
    </div>
  )
}
