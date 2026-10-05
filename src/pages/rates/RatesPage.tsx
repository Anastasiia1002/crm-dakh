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
import {
  useDeletePricePeriod,
  usePolicies,
  usePricePeriods,
  useRatePlans,
  useRoomTypes,
  useSavePricePeriod,
  useSaveRatePlan,
} from '@/hooks/useHotel'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import type { PricePeriod, RatePlan } from '@/types'

export function RatesPage() {
  const plans = useRatePlans()
  const prices = usePricePeriods()
  const roomTypes = useRoomTypes()
  const policies = usePolicies()
  const [planFilter, setPlanFilter] = useState('all')
  const [editingPlan, setEditingPlan] = useState<RatePlan | 'new' | null>(null)
  const [editingPrice, setEditingPrice] = useState<PricePeriod | 'new' | null>(null)
  const removePrice = useDeletePricePeriod()

  if (!plans.data || !prices.data || !roomTypes.data || !policies.data) return <LoadingState />

  const visible = prices.data
    .filter((price) => planFilter === 'all' || price.ratePlanId === planFilter)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading title="Тарифні плани" action={<Button onClick={() => setEditingPlan('new')}>Додати тариф</Button>} />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Скасування</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.data.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>{plan.name}</div>
                  <div className="max-w-md text-xs text-muted-foreground">{plan.description}</div>
                </TableCell>
                <TableCell>{policies.data.find((item) => item.id === plan.cancellationPolicyId)?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge tone={plan.active ? 'success' : 'neutral'}>{plan.active ? 'Активний' : 'Вимкнений'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPlan(plan)}>
                    Редагувати
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <SectionHeading
          title="Ціни за періодами"
          action={<Button onClick={() => setEditingPrice('new')}>Додати період</Button>}
        />
        <div className="mb-4 max-w-xs">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі тарифи</SelectItem>
              {plans.data.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Тариф</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead>Період</TableHead>
              <TableHead>Ціна за ніч</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((price) => (
              <TableRow key={price.id}>
                <TableCell>{plans.data.find((plan) => plan.id === price.ratePlanId)?.name}</TableCell>
                <TableCell>{roomTypes.data.find((type) => type.id === price.roomTypeId)?.name}</TableCell>
                <TableCell>
                  {formatDate(price.startDate)} — {formatDate(price.endDate)}
                </TableCell>
                <TableCell className="tabular-nums">{formatMoney(price.pricePerNight)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingPrice(price)}>
                      Редагувати
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await removePrice.mutateAsync(price.id)
                          toast.success('Період видалено')
                        } catch (error) {
                          toast.error(errorMessage(error))
                        }
                      }}
                    >
                      Видалити
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <PlanDialog
        open={editingPlan !== null}
        item={editingPlan && editingPlan !== 'new' ? editingPlan : undefined}
        policies={policies.data}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      />
      <PriceDialog
        open={editingPrice !== null}
        item={editingPrice && editingPrice !== 'new' ? editingPrice : undefined}
        plans={plans.data}
        roomTypes={roomTypes.data}
        onOpenChange={(open) => !open && setEditingPrice(null)}
      />
    </div>
  )
}

const planSchema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  description: z.string(),
  cancellationPolicyId: z.string().min(1, 'Оберіть правило'),
  active: z.enum(['yes', 'no']),
})

function PlanDialog({
  open,
  item,
  policies,
  onOpenChange,
}: {
  open: boolean
  item?: RatePlan
  policies: { id: string; name: string }[]
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveRatePlan()
  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    values: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      cancellationPolicyId: item?.cancellationPolicyId ?? policies[0]?.id ?? '',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати тариф' : 'Новий тариф'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                name: values.name,
                description: values.description,
                cancellationPolicyId: values.cancellationPolicyId,
                active: values.active === 'yes',
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Опис">
            <Textarea {...form.register('description')} />
          </Field>
          <Field label="Правило скасування">
            <Select
              value={form.watch('cancellationPolicyId')}
              onValueChange={(value) => form.setValue('cancellationPolicyId', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Стан">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
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

const priceSchema = z.object({
  ratePlanId: z.string().min(1),
  roomTypeId: z.string().min(1),
  startDate: z.string().min(1, 'Вкажіть дату'),
  endDate: z.string().min(1, 'Вкажіть дату'),
  pricePerNight: z.number({ invalid_type_error: 'Вкажіть ціну' }).positive('Ціна має бути більшою за нуль'),
})

function PriceDialog({
  open,
  item,
  plans,
  roomTypes,
  onOpenChange,
}: {
  open: boolean
  item?: PricePeriod
  plans: RatePlan[]
  roomTypes: { id: string; name: string }[]
  onOpenChange: (open: boolean) => void
}) {
  const save = useSavePricePeriod()
  const form = useForm<z.infer<typeof priceSchema>>({
    resolver: zodResolver(priceSchema),
    values: {
      ratePlanId: item?.ratePlanId ?? plans[0]?.id ?? '',
      roomTypeId: item?.roomTypeId ?? roomTypes[0]?.id ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      pricePerNight: item?.pricePerNight ?? 0,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати період' : 'Новий період'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({ id: item?.id, ...values })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Тариф">
            <Select value={form.watch('ratePlanId')} onValueChange={(value) => form.setValue('ratePlanId', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Категорія">
            <Select value={form.watch('roomTypeId')} onValueChange={(value) => form.setValue('roomTypeId', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Початок" error={form.formState.errors.startDate?.message}>
              <Input type="date" {...form.register('startDate')} />
            </Field>
            <Field label="Кінець" error={form.formState.errors.endDate?.message}>
              <Input type="date" {...form.register('endDate')} />
            </Field>
          </div>
          <Field label="Ціна за ніч, ₴" error={form.formState.errors.pricePerNight?.message}>
            <Input type="number" {...form.register('pricePerNight', { valueAsNumber: true })} />
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
