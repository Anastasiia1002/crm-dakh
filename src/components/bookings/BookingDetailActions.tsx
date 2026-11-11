import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Check, ChevronDown, LogIn, LogOut, Pencil, UserRoundX, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bookingDetailOverflowActions, bookingDetailPrimaryAction } from '@/lib/booking-detail-actions'
import type { AdminBookingStatusAction } from '@/types'

const compact =
  'h-auto min-h-11 shrink-0 justify-center gap-2 whitespace-nowrap px-3 text-sm sm:px-4'

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
  const primary = bookingDetailPrimaryAction(actions)
  const overflow = bookingDetailOverflowActions(actions)

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:flex-row md:justify-end">
      {primary === 'confirm' ? (
        <Button
          ref={confirmRef}
          type="button"
          size="lg"
          className={compact}
          data-action="confirm"
          disabled={pending}
          loading={busyAction === 'confirm'}
          onClick={onConfirm}
        >
          <Check className="size-4 shrink-0" aria-hidden />
          Підтвердити
        </Button>
      ) : null}
      {primary === 'check-in' ? (
        <Button
          ref={checkInRef}
          type="button"
          size="lg"
          className={compact}
          data-action="check-in"
          disabled={pending}
          loading={busyAction === 'check-in'}
          onClick={onCheckIn}
        >
          <LogIn className="size-4 shrink-0" aria-hidden />
          Заселити
        </Button>
      ) : null}
      {primary === 'check-out' ? (
        <Button
          ref={checkOutRef}
          type="button"
          size="lg"
          className={compact}
          data-action="check-out"
          disabled={pending}
          loading={busyAction === 'check-out'}
          onClick={onCheckOut}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Виселити
        </Button>
      ) : null}

      {canEdit ? (
        <Button variant="outline" size="lg" className={compact} disabled={pending} asChild>
          <Link to={editTo} data-action="edit">
            <Pencil className="size-4 shrink-0" aria-hidden />
            Редагувати
          </Link>
        </Button>
      ) : null}
      {canMove ? (
        <Button variant="outline" size="lg" className={compact} disabled={pending} asChild>
          <Link to={editTo} data-action="move">
            <BedDouble className="size-4 shrink-0" aria-hidden />
            Змінити розміщення
          </Link>
        </Button>
      ) : null}

      {overflow.length > 0 ? (
        <details className="relative">
          <summary
            aria-label="Інші дії"
            className={`${compact} inline-flex cursor-pointer list-none items-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-muted [&::-webkit-details-marker]:hidden`}
          >
            Ще
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </summary>
          <div className="absolute top-full right-0 z-50 mt-1 min-w-52 rounded-md border border-border bg-surface p-1 shadow-sm">
            {overflow.includes('no-show') ? (
              <OverflowButton
                actionRef={noShowRef}
                dataAction="no-show"
                pending={pending}
                loading={busyAction === 'no-show'}
                warning
                onClick={onNoShow}
              >
                <UserRoundX className="size-4 shrink-0" aria-hidden />
                Позначити незаїзд
              </OverflowButton>
            ) : null}
            {overflow.includes('cancel') ? (
              <OverflowButton
                actionRef={cancelRef}
                dataAction="cancel"
                pending={pending}
                loading={busyAction === 'cancel'}
                destructive
                onClick={onCancel}
              >
                <XCircle className="size-4 shrink-0" aria-hidden />
                Скасувати бронювання
              </OverflowButton>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function OverflowButton({
  actionRef,
  dataAction,
  pending,
  loading,
  warning,
  destructive,
  onClick,
  children,
}: {
  actionRef: Ref<HTMLButtonElement>
  dataAction: 'no-show' | 'cancel'
  pending: boolean
  loading: boolean
  warning?: boolean
  destructive?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      ref={actionRef}
      type="button"
      variant="outline"
      size="lg"
      className={`h-auto min-h-11 w-full justify-start gap-2 px-3 ${
        destructive ? 'border-destructive! text-destructive hover:bg-destructive/10' : ''
      } ${warning ? 'border-warning! text-foreground hover:bg-secondary' : ''}`}
      data-action={dataAction}
      disabled={pending}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
