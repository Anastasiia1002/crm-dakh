import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteAdminRoomBlock } from '@/hooks/useHotel'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
import { formatDate, formatDateTime } from '@/lib/format'
import { blockConflictMessage, blockReasonLabel, unblockConfirmMessage } from '@/lib/room-block'
import { canManageAccommodations } from '@/lib/roles'
import type { Block } from '@/types'

export function BlockDetailsDialog({
  open,
  room,
  block,
  onOpenChange,
}: {
  open: boolean
  room: { id: string; name: string | null; number: string; typeName?: string | null } | null
  block: Block | null
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const removeBlock = useDeleteAdminRoomBlock()
  const [confirming, setConfirming] = useState(false)

  function close() {
    setConfirming(false)
    onOpenChange(false)
  }

  async function confirmRemove() {
    if (!room || !block) return
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    try {
      await removeBlock.mutateAsync({ roomId: room.id, blockId: block.id })
      toast.success('Блокування знято')
      close()
    } catch (error) {
      toast.error(blockConflictMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent>
        {confirming && room && block ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Зняти блокування</DialogTitle>
              <DialogDescription>{unblockConfirmMessage(room, block.startDate, block.endDate)}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={removeBlock.isPending}>
                Назад
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canWrite || removeBlock.isPending}
                onClick={() => void confirmRemove()}
              >
                Зняти блокування
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Блокування дат</DialogTitle>
              <DialogDescription>
                {room ? unitDisplayTitle(room, room.typeName) : 'Розміщення'} · {block ? `${formatDate(block.startDate)} — ${formatDate(block.endDate)}` : ''}
              </DialogDescription>
            </DialogHeader>
            {block ? (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Початок</dt>
                  <dd>{formatDate(block.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Кінець (не включно)</dt>
                  <dd>{formatDate(block.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Причина</dt>
                  <dd>{blockReasonLabel(block)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Внутрішня нотатка</dt>
                  <dd>{block.reason?.trim() ? block.reason : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Створено</dt>
                  <dd>{formatDateTime(block.createdAt)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Не вдалося завантажити деталі блокування.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Закрити
              </Button>
              {canWrite && block ? (
                <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
                  Зняти блокування
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
