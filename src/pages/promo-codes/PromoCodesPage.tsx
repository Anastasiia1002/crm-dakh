import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { AdminPromoCode } from '@/api/promoCodes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollableFormDialog, formDialogGridClass, formDialogSelectContentClass } from '@/components/pricing/ScrollableFormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useDeletePromo, usePromoCodes, useSavePromo, useTogglePromo } from '@/hooks/useHotel'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoneyAmount } from '@/lib/format'
import { canManageRates } from '@/lib/roles'

const MONEY_RE = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/

const schema = z
  .object({
    code: z.string().trim().regex(CODE_RE, 'Літери, цифри, дефіс або підкреслення, від 2 до 40 символів'),
    description: z.string().trim().max(200, 'Опис до 200 символів'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.string().trim().regex(MONEY_RE, 'Невідʼємне число з не більше ніж двома знаками'),
    validFrom: z.string(),
    validTo: z.string(),
    usageLimit: z.string(),
    active: z.enum(['yes', 'no']),
  })
  .superRefine((values, ctx) => {
    if (values.discountValue === '0' || values.discountValue === '0.0' || values.discountValue === '0.00') {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Знижка має бути більшою за нуль' })
    }
    if (values.discountType === 'PERCENTAGE' && Number(values.discountValue) > 100) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Відсоток не може перевищувати 100' })
    }
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'Дата кінця має бути не раніше за дату початку' })
    }
    if (values.usageLimit.trim() && !/^[1-9]\d{0,6}$/.test(values.usageLimit.trim())) {
      ctx.addIssue({ code: 'custom', path: ['usageLimit'], message: 'Ліміт — ціле число від 1' })
    }
  })

export function PromoCodesPage() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const promos = usePromoCodes()
  const toggle = useTogglePromo()
  const remove = useDeletePromo()
  const [editing, setEditing] = useState<AdminPromoCode | 'new' | null>(null)
  const items = promos.data?.items ?? []

  return (
    <div>
      <SectionHeading
        title="Промокоди"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати промокод</Button> : undefined}
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Код порівнюється точно, з урахуванням регістру. Знижка діє на проживання всього бронювання, не на послуги і не
        на окремий тип номера. Якщо автоматична знижка за 6 ночей більша, застосовується вона. Однаковий розмір лишає
        промокод. Суми не складаються.
      </p>
      {promos.isLoading && !promos.data ? <LoadingState /> : null}
      {promos.isError ? <p className="text-sm text-destructive">Не вдалося завантажити промокоди</p> : null}
      {!promos.isLoading && !promos.isError && items.length === 0 ? <EmptyState>Промокодів ще немає.</EmptyState> : null}
      {!promos.isError && items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Код</TableHead>
              <TableHead>Назва / опис</TableHead>
              <TableHead>Тип знижки</TableHead>
              <TableHead>Розмір знижки</TableHead>
              <TableHead>Діє з</TableHead>
              <TableHead>Діє до</TableHead>
              <TableHead>Ліміт використань</TableHead>
              <TableHead>Використано</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell className="font-medium tracking-wide">{promo.code}</TableCell>
                <TableCell>{promo.description || '—'}</TableCell>
                <TableCell>{promo.discountType === 'PERCENTAGE' ? 'Відсоток' : 'Фіксована сума'}</TableCell>
                <TableCell className="tabular-nums">
                  {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : formatMoneyAmount(promo.discountValue)}
                </TableCell>
                <TableCell>{promo.validFrom ? formatDate(promo.validFrom) : '—'}</TableCell>
                <TableCell>{promo.validTo ? formatDate(promo.validTo) : '—'}</TableCell>
                <TableCell>{promo.usageLimit ?? 'Без ліміту'}</TableCell>
                <TableCell className="tabular-nums">{promo.usageCount}</TableCell>
                <TableCell>
                  <Badge tone={promo.active ? 'success' : 'neutral'}>{promo.active ? 'Активний' : 'Вимкнений'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
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
                      {promo.usageCount === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await remove.mutateAsync(promo.id)
                              toast.success('Видалено')
                            } catch (error) {
                              toast.error(errorMessage(error))
                            }
                          }}
                        >
                          Видалити
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Лише перегляд</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <PromoDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        canWrite={canWrite}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function PromoDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: AdminPromoCode
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const save = useSavePromo()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      code: item?.code ?? '',
      description: item?.description ?? '',
      discountType: item?.discountType ?? 'PERCENTAGE',
      discountValue: item?.discountValue ?? '10.00',
      validFrom: item?.validFrom ?? '',
      validTo: item?.validTo ?? '',
      usageLimit: item?.usageLimit ? String(item.usageLimit) : '',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableFormDialog
        title={item ? 'Редагувати промокод' : 'Новий промокод'}
        onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              await save.mutateAsync({
                id: item?.id,
                input: {
                  code: values.code.trim(),
                  description: values.description.trim() || null,
                  discountType: values.discountType,
                  discountValue: values.discountValue,
                  validFrom: values.validFrom || null,
                  validTo: values.validTo || null,
                  usageLimit: values.usageLimit.trim() ? Number(values.usageLimit) : null,
                  active: values.active === 'yes',
                },
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={!canWrite || save.isPending}>
                Зберегти
              </Button>
            </>
          }
        >
          <Field label="Код" hint="Зберігається як введено. WINTER10 і winter10 — різні коди." error={form.formState.errors.code?.message}>
            <Input disabled={!canWrite} {...form.register('code')} />
          </Field>
          <Field label="Назва / опис" error={form.formState.errors.description?.message}>
            <Textarea disabled={!canWrite} {...form.register('description')} />
          </Field>
          <div className={formDialogGridClass}>
            <Field label="Тип знижки">
              <Select
                value={form.watch('discountType')}
                onValueChange={(value: 'PERCENTAGE' | 'FIXED') => form.setValue('discountType', value)}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
                  <SelectItem value="PERCENTAGE">Відсоток</SelectItem>
                  <SelectItem value="FIXED">Фіксована сума, ₴</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Розмір знижки" error={form.formState.errors.discountValue?.message}>
              <Input inputMode="decimal" disabled={!canWrite} {...form.register('discountValue')} />
            </Field>
          </div>
          <div className={formDialogGridClass}>
            <Field label="Діє з" hint="Порожнє поле — без дати початку" error={form.formState.errors.validFrom?.message}>
              <Input type="date" className="min-w-0" disabled={!canWrite} {...form.register('validFrom')} />
            </Field>
            <Field label="Діє до" hint="Останній день включно. Порожнє поле — без кінця" error={form.formState.errors.validTo?.message}>
              <Input type="date" className="min-w-0" disabled={!canWrite} {...form.register('validTo')} />
            </Field>
          </div>
          <Field label="Ліміт використань" hint="Порожнє поле — без ліміту. Уже використані рази змінити не можна." error={form.formState.errors.usageLimit?.message}>
            <Input inputMode="numeric" disabled={!canWrite} {...form.register('usageLimit')} />
          </Field>
          {item ? <p className="text-sm text-muted-foreground">Використано: {item.usageCount}</p> : null}
          <Field label="Статус">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)} disabled={!canWrite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
          </Field>
      </ScrollableFormDialog>
    </Dialog>
  )
}
