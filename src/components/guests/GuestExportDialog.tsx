import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function GuestExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Експорт гостей</DialogTitle>
          <DialogDescription>Експорт списку гостей недоступний.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
