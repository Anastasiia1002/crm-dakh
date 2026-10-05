import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGuestExport } from '@/hooks/useGuestDirectory'
import { errorMessage } from '@/lib/errors'
import { downloadGuestCsv, downloadGuestExcel } from '@/lib/guestExport'
import type { GuestFilters } from '@/types'

export function GuestExportDialog({
  open,
  filters,
  onOpenChange,
}: {
  open: boolean
  filters: GuestFilters
  onOpenChange: (open: boolean) => void
}) {
  const exportGuests = useGuestExport()
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')

  async function submit() {
    try {
      const rows = await exportGuests.mutateAsync(filters)
      if (format === 'csv') downloadGuestCsv(rows)
      else downloadGuestExcel(rows)
      toast.success('Список гостей експортовано')
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Експортувати гостей</DialogTitle>
          <DialogDescription>Експорт поточного списку гостей з урахуванням фільтрів.</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-medium">Формат</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="guest-export-format" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
            Excel (.xlsx)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="guest-export-format" checked={format === 'csv'} onChange={() => setFormat('csv')} />
            CSV (.csv)
          </label>
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="button" disabled={exportGuests.isPending} onClick={() => void submit()}>
            Експортувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
