import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GuestBookingHistory } from '@/components/guests/GuestBookingHistory'
import { GuestFormDialog } from '@/components/guests/GuestFormDialog'
import { GuestStats } from '@/components/guests/GuestStats'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/states'
import { useGuestProfile } from '@/hooks/useGuestDirectory'
import { fullName } from '@/lib/utils'

export function GuestPage() {
  const { id = '' } = useParams()
  const profile = useGuestProfile(id)
  const [editing, setEditing] = useState(false)

  if (profile.isLoading) return <LoadingState />
  if (profile.isError || !profile.data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/guests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Гості
        </Link>
        <p className="text-sm">Гостя не знайдено.</p>
        <Button size="sm" variant="outline" onClick={() => void profile.refetch()}>
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  const { guest, stats, history } = profile.data
  const fields = [
    { label: 'Імʼя та прізвище', value: fullName(guest.firstName, guest.lastName), prominent: true },
    { label: 'Email', value: guest.email || '—' },
    { label: 'Телефон', value: guest.phone || '—' },
    { label: 'Країна', value: guest.country || '—' },
    { label: 'Місто', value: guest.city || '—' },
  ]

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/guests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Гості
        </Link>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Редагувати
        </Button>
      </div>

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className={field.prominent ? 'sm:col-span-2' : undefined}>
            <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{field.label}</dt>
            <dd className={field.prominent ? 'mt-2 font-serif text-4xl leading-none font-medium' : 'mt-1 text-sm'}>{field.value}</dd>
          </div>
        ))}
        {guest.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">Примітки</dt>
            <dd className="mt-1 max-w-2xl text-sm whitespace-pre-wrap">{guest.notes}</dd>
          </div>
        ) : null}
      </dl>

      <GuestStats stats={stats} />
      <GuestBookingHistory history={history} />

      <GuestFormDialog open={editing} guest={guest} onOpenChange={setEditing} />
    </div>
  )
}
