import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { usePromoCodes, useSavePromo, useTogglePromo } from '@/hooks/useHotel'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import type { PromoCode } from '@/types'

const schema = z.object({
  code: z.string().min(1, 'Вкажіть код'),
  description: z.string(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number({ invalid_type_error: 'Вкажіть знижку' }).positive('Знижка має бути більшою за нуль'),
  validFrom: z.string().min(1, 'Вкажіть дату'),
  validTo: z.string().min(1, 'Вкажіть дату'),
  usageLimit: z.string(),
  active: z.enum(['yes', 'no']),
})

export function PromoCodesPage() {
  const promos = usePromoCodes()
  const toggle = useTogglePromo()
  const [editing, setEditing] = useState<PromoCode | 'new' | null>(null)
  if (!promos.data) return <LoadingState />

  return (
    <div>
      <SectionHeading title="Промокоди" action={<Button onClick={() => setEditing('new')}>Додати промокод</Button>} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Код</TableHead>
            <TableHead>Знижка</TableHead>
            <TableHead>Період</TableHead>
            <TableHead>Використання</TableHead>
            <TableHead>Стан</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {promos.data.map((promo) => (
            <TableRow key={promo.id}>
              <TableCell>
                <div className="font-medium tracking-wide">{promo.code}</div>
                <div className="text-xs text-muted-foreground">{promo.description}</div>
              </TableCell>
              <TableCell>
                {promo.discountType === 'percent' ? `${promo.discountValue}%` : formatMoney(promo.discountValue)}
              </TableCell>
              <TableCell>
                {formatDate(promo.validFrom)} — {formatDate(promo.validTo)}
              </TableCell>
              <TableCell>
                {promo.usedCount}
                {promo.usageLimit !== null ? ` / ${promo.usageLimit}` : ''}
              </TableCell>
              <TableCell>
                <Badge tone={promo.active ? 'success' : 'neutral'}>{promo.active ? 'Активний' : 'Вимкнений'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(promo)}>
                    Редагувати
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await toggle.mutateAsync({ id: promo.id, active: !promo.active })
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    {promo.active ? 'Вимкнути' : 'Увімкнути'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PromoDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function PromoDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: PromoCode
  onOpenChange: (open: boolean) => void
}) {
  const save = useSavePromo()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      code: item?.code ?? '',
      description: item?.description ?? '',
      discountType: item?.discountType ?? 'percent',
      discountValue: item?.discountValue ?? 10,
      validFrom: item?.validFrom ?? '',
      validTo: item?.validTo ?? '',
      usageLimit: item?.usageLimit ? String(item.usageLimit) : '',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати промокод' : 'Новий промокод'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                code: values.code,
                description: values.description,
                discountType: values.discountType,
                discountValue: values.discountValue,
                validFrom: values.validFrom,
                validTo: values.validTo,
                usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
                active: values.active === 'yes',
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Код" error={form.formState.errors.code?.message}>
            <Input {...form.register('code')} />
          </Field>
          <Field label="Опис">
            <Textarea {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Тип знижки">
              <Select
                value={form.watch('discountType')}
                onValueChange={(value: 'percent' | 'fixed') => form.setValue('discountType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Відсоток</SelectItem>
                  <SelectItem value="fixed">Фіксована сума</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Значення" error={form.formState.errors.discountValue?.message}>
              <Input type="number" {...form.register('discountValue', { valueAsNumber: true })} />
            </Field>
            <Field label="Від" error={form.formState.errors.validFrom?.message}>
              <Input type="date" {...form.register('validFrom')} />
            </Field>
            <Field label="До" error={form.formState.errors.validTo?.message}>
              <Input type="date" {...form.register('validTo')} />
            </Field>
          </div>
          <Field label="Ліміт використань" hint="Залиште порожнім, якщо без ліміту">
            <Input type="number" {...form.register('usageLimit')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
