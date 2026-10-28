import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function GuestImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Імпорт гостей</DialogTitle>
          <DialogDescription>Імпорт списку гостей недоступний.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
