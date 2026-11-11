import { useState } from 'react'
import { GuestForm } from '@/components/guests/GuestForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSaveGuest } from '@/hooks/useGuestDirectory'
import { guestSaveHint, type GuestWriteInput } from '@/lib/admin-guests'

export function GuestFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const save = useSaveGuest()
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const [reuseContact, setReuseContact] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setHint(null)
          setConfirmDuplicate(false)
          setReuseContact(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новий клієнт</DialogTitle>
          <DialogDescription>Картка без бронювання. Коментар видно лише цьому готелю.</DialogDescription>
        </DialogHeader>
        <GuestForm
          submitLabel="Зберегти"
          pending={save.isPending}
          confirmDuplicate={confirmDuplicate}
          reuseContact={reuseContact}
          onConfirmDuplicate={setConfirmDuplicate}
          onReuseContact={setReuseContact}
          duplicateHint={hint}
          onCancel={() => onOpenChange(false)}
          onSubmit={(values: GuestWriteInput) => {
            setHint(null)
            void save.mutateAsync(values).then(
              () => onOpenChange(false),
              (error: unknown) => {
                setHint(guestSaveHint(error))
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
