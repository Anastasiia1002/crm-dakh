import { toast } from 'sonner'
import { GuestForm } from '@/components/guests/GuestForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSaveGuest } from '@/hooks/useGuestDirectory'
import { errorMessage } from '@/lib/errors'
import type { Guest } from '@/types'

export function GuestFormDialog({
  open,
  guest,
  onOpenChange,
}: {
  open: boolean
  guest?: Guest
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveGuest()
  const editing = Boolean(guest)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Редагувати гостя' : 'Новий гість'}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? 'Форма редагування даних гостя' : 'Форма нового гостя'}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <GuestForm
            key={guest?.id ?? 'new'}
            guest={guest}
            submitLabel={editing ? 'Зберегти зміни' : 'Зберегти гостя'}
            pending={save.isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              try {
                await save.mutateAsync(values)
                toast.success(editing ? 'Дані гостя оновлено' : 'Гість успішно доданий')
                onOpenChange(false)
              } catch (error) {
                toast.error(errorMessage(error))
              }
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
