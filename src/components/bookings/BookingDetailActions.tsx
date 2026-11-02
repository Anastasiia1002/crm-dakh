import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, LogIn, LogOut, Pencil, UserRoundX, XCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminBookingStatusAction } from '@/types'

const actionButton =
  'h-auto min-h-11 w-full justify-center gap-2 whitespace-normal px-4 text-left sm:w-auto'

function ActionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{label}</p>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">{children}</div>
    </section>
  )
}

export function BookingDetailActions({
  editTo,
  canEdit,
  canMove,
  actions,
  pending,
  busyAction,
  confirmRef,
  checkInRef,
  checkOutRef,
  noShowRef,
  cancelRef,
  onConfirm,
  onCheckIn,
  onCheckOut,
  onNoShow,
  onCancel,
}: {
  editTo: string
  canEdit: boolean
  canMove: boolean
  actions: AdminBookingStatusAction[]
  pending: boolean
  busyAction: AdminBookingStatusAction | null
  confirmRef: Ref<HTMLButtonElement>
  checkInRef: Ref<HTMLButtonElement>
  checkOutRef: Ref<HTMLButtonElement>
  noShowRef: Ref<HTMLButtonElement>
  cancelRef: Ref<HTMLButtonElement>
  onConfirm: () => void
  onCheckIn: () => void
  onCheckOut: () => void
  onNoShow: () => void
  onCancel: () => void
}) {
  const showManagement = canEdit || canMove
  const showArrival = actions.some((action) => action !== 'cancel')
  const showCancel = actions.includes('cancel')

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:w-auto lg:max-w-3xl lg:items-end">
      {showManagement ? (
        <ActionGroup label="Керування бронюванням">
          {canEdit ? (
            <Button variant="outline" size="lg" className={actionButton} disabled={pending} asChild>
              <Link to={editTo} data-action="edit">
                <Pencil className="size-4 shrink-0" aria-hidden />
                Редагувати
              </Link>
            </Button>
          ) : null}
          {canMove ? (
            <Button variant="outline" size="lg" className={actionButton} disabled={pending} asChild>
              <Link to={editTo} data-action="move">
                <BedDouble className="size-4 shrink-0" aria-hidden />
                Змінити розміщення
              </Link>
            </Button>
          ) : null}
        </ActionGroup>
      ) : null}

      {showArrival ? (
        <ActionGroup label="Статус заїзду">
          {actions.includes('confirm') ? (
            <Button
              ref={confirmRef}
              type="button"
              size="lg"
              className={actionButton}
              data-action="confirm"
              disabled={pending}
              loading={busyAction === 'confirm'}
              onClick={onConfirm}
            >
              <Check className="size-4 shrink-0" aria-hidden />
              Підтвердити
            </Button>
          ) : null}
          {actions.includes('check-in') ? (
            <Button
              ref={checkInRef}
              type="button"
              size="lg"
              className={actionButton}
              data-action="check-in"
              disabled={pending}
              loading={busyAction === 'check-in'}
              onClick={onCheckIn}
            >
              <LogIn className="size-4 shrink-0" aria-hidden />
              Заселити
            </Button>
          ) : null}
          {actions.includes('no-show') ? (
            <Button
              ref={noShowRef}
              type="button"
              variant="outline"
              size="lg"
              className={`${actionButton} border-warning! text-foreground hover:bg-secondary`}
              data-action="no-show"
              disabled={pending}
              loading={busyAction === 'no-show'}
              onClick={onNoShow}
            >
              <UserRoundX className="size-4 shrink-0" aria-hidden />
              Позначити незаїзд
            </Button>
          ) : null}
          {actions.includes('check-out') ? (
            <Button
              ref={checkOutRef}
              type="button"
              variant="outline"
              size="lg"
              className={actionButton}
              data-action="check-out"
              disabled={pending}
              loading={busyAction === 'check-out'}
              onClick={onCheckOut}
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Виселити
            </Button>
          ) : null}
        </ActionGroup>
      ) : null}

      {showCancel ? (
        <ActionGroup label="Небезпечні дії">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            size="lg"
            className={`${actionButton} border-destructive! text-destructive hover:bg-destructive/10`}
            data-action="cancel"
            disabled={pending}
            loading={busyAction === 'cancel'}
            onClick={onCancel}
          >
            <XCircle className="size-4 shrink-0" aria-hidden />
            Скасувати бронювання
          </Button>
        </ActionGroup>
      ) : null}
    </div>
  )
}
