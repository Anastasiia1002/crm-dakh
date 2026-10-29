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
import { useSaveService, useServices, useToggleService } from '@/hooks/useHotel'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { serviceUnitLabel } from '@/lib/labels'
import type { Service, ServiceUnit } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  description: z.string(),
  price: z.number({ invalid_type_error: 'Вкажіть ціну' }).min(0),
  unit: z.enum(['per_stay', 'per_night', 'per_person']),
  active: z.enum(['yes', 'no']),
})

export function ServicesPage() {
  const services = useServices()
  const toggle = useToggleService()
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  if (!services.data) return <LoadingState />

  return (
    <div>
      <SectionHeading title="Додаткові послуги" action={<Button onClick={() => setEditing('new')}>Додати послугу</Button>} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Назва</TableHead>
            <TableHead>Одиниця</TableHead>
            <TableHead>Ціна</TableHead>
            <TableHead>Стан</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.data.map((service) => (
            <TableRow key={service.id}>
              <TableCell>
                <div>{service.name}</div>
                <div className="max-w-md text-xs text-muted-foreground">{service.description}</div>
              </TableCell>
              <TableCell>{serviceUnitLabel[service.unit]}</TableCell>
              <TableCell className="tabular-nums">{formatMoney(service.price)}</TableCell>
              <TableCell>
                <Badge tone={service.active ? 'success' : 'neutral'}>{service.active ? 'Активна' : 'Вимкнена'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(service)}>
                    Редагувати
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await toggle.mutateAsync({ id: service.id, active: !service.active })
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    {service.active ? 'Вимкнути' : 'Увімкнути'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ServiceDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function ServiceDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: Service
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveService()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      price: item?.price ?? 0,
      unit: item?.unit ?? 'per_stay',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати послугу' : 'Нова послуга'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                name: values.name,
                description: values.description,
                price: values.price,
                unit: values.unit as ServiceUnit,
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ціна, ₴" error={form.formState.errors.price?.message}>
              <Input type="number" {...form.register('price', { valueAsNumber: true })} />
            </Field>
            <Field label="Одиниця">
              <Select value={form.watch('unit')} onValueChange={(value: ServiceUnit) => form.setValue('unit', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(serviceUnitLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending} loading={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
