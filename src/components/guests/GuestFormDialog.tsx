import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function GuestFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Картка гостя</DialogTitle>
          <DialogDescription>Додавання і редагування гостя тут недоступні. Гість з’являється з бронювання.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
