import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function GuestExportDialog({
  open,
  onOpenChange,
  pending,
  onExport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onExport: (format: 'csv' | 'xlsx') => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Експорт клієнтів</DialogTitle>
          <DialogDescription>Експортуються лише клієнти цього готелю з урахуванням пошуку та фільтрів.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" disabled={pending} onClick={() => onExport('csv')}>
            CSV
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onExport('xlsx')}>
            XLSX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
