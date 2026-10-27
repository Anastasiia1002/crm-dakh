import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useCreateAdminRoomBlock } from '@/hooks/useHotel'
import { createSubmitLock } from '@/lib/booking-form'
import { repairBlockEndDate } from '@/lib/calendar-selection'
import { unitDisplayLabel } from '@/lib/accommodation-labels'
import { nightsLabel } from '@/lib/format'
import {
  BLOCK_NOTE_MAX,
  BLOCK_REASON_OPTIONS,
  blockConfirmMessage,
  blockConflictMessage,
  blockedNights,
  blockWriteFromReason,
  type BlockReasonId,
} from '@/lib/room-block'
import { canManageAccommodations } from '@/lib/roles'
import type { Accommodation } from '@/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const schema = z
  .object({
    roomId: z.string().min(1, 'Оберіть розміщення'),
    startDate: z.string().regex(DATE_RE, 'Формат YYYY-MM-DD'),
    endDate: z.string().regex(DATE_RE, 'Формат YYYY-MM-DD'),
    reasonId: z.enum(['repair', 'maintenance', 'owner_use', 'other']),
    note: z.string().max(BLOCK_NOTE_MAX, `Нотатка має бути до ${BLOCK_NOTE_MAX} символів`),
  })
  .superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата завершення має бути пізніше за дату початку',
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function BlockDatesDialog({
  open,
  rooms,
  selectedRoomId,
  typeNamesByRoomTypeId,
  initialStartDate = '',
  initialEndDate = '',
  onOpenChange,
  onDraftChange,
}: {
  open: boolean
  rooms: Accommodation[]
  selectedRoomId?: string
  typeNamesByRoomTypeId?: ReadonlyMap<string, string>
  initialStartDate?: string
  initialEndDate?: string
  onOpenChange: (open: boolean) => void
  onDraftChange?: (draft: { roomId: string; startDate: string; endDate: string } | null) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const save = useCreateAdminRoomBlock()
  const lock = useRef(createSubmitLock())
  const wasOpen = useRef(false)
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roomId: selectedRoomId ?? '',
      startDate: initialStartDate,
      endDate: initialEndDate,
      reasonId: 'repair',
      note: '',
    },
  })
  const values = form.watch()
  const room = rooms.find((item) => item.id === values.roomId) ?? null
  const roomTypeName = room ? typeNamesByRoomTypeId?.get(room.roomTypeId) : undefined
  const roomLabel = room ? unitDisplayLabel(room, roomTypeName) : 'Розміщення'
  const nights = blockedNights(values.startDate, values.endDate)
  const roomLocked = Boolean(selectedRoomId) || rooms.length === 1

  useEffect(() => {
    if (open && !wasOpen.current) {
      const startDate = initialStartDate
      form.reset({
        roomId: selectedRoomId || (rooms.length === 1 ? rooms[0].id : ''),
        startDate,
        endDate: repairBlockEndDate(startDate, initialEndDate),
        reasonId: 'repair',
        note: '',
      })
      setStep('form')
    }
    wasOpen.current = open
  }, [form, initialEndDate, initialStartDate, open, rooms, selectedRoomId])

  useEffect(() => {
    if (!open) {
      onDraftChange?.(null)
      return
    }
    if (values.roomId && DATE_RE.test(values.startDate) && DATE_RE.test(values.endDate) && values.endDate > values.startDate) {
      onDraftChange?.({ roomId: values.roomId, startDate: values.startDate, endDate: values.endDate })
      return
    }
    onDraftChange?.(null)
  }, [onDraftChange, open, values.endDate, values.roomId, values.startDate])

  function close() {
    setStep('form')
    onDraftChange?.(null)
    onOpenChange(false)
  }

  async function confirm() {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    if (!lock.current.tryBegin()) return
    const parsed = schema.safeParse(form.getValues())
    if (!parsed.success) {
      lock.current.end()
      setStep('form')
      return
    }
    try {
      const payload = blockWriteFromReason(parsed.data.reasonId as BlockReasonId, parsed.data.note)
      await save.mutateAsync({
        roomId: parsed.data.roomId,
        input: {
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          type: payload.type,
          reason: payload.reason,
        },
      })
      toast.success('Дати заблоковано')
      close()
    } catch (error) {
      toast.error(blockConflictMessage(error))
      setStep('form')
    } finally {
      lock.current.end()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent>
        {step === 'form' ? (
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(() => {
              if (!canWrite) {
                toast.error('Недостатньо прав для цієї дії')
                return
              }
              setStep('confirm')
            })}
          >
            <DialogHeader>
              <DialogTitle>Заблокувати дати</DialogTitle>
              <DialogDescription>
                Період напіввідкритий: [початок, кінець). Дата закінчення залишається вільною для заїзду.
              </DialogDescription>
            </DialogHeader>
            {roomLocked ? (
              <p className="text-sm">{roomLabel}</p>
            ) : (
              <Field label="Розміщення" error={form.formState.errors.roomId?.message}>
                <Select
                  value={values.roomId}
                  onValueChange={(value) => form.setValue('roomId', value, { shouldValidate: true })}
                  disabled={!canWrite}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть номер або будиночок" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {unitDisplayLabel(item, typeNamesByRoomTypeId?.get(item.roomTypeId))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Початок" error={form.formState.errors.startDate?.message}>
                <Input
                  type="date"
                  disabled={!canWrite}
                  {...form.register('startDate', {
                    onChange: (event) => {
                      const startDate = event.target.value
                      const endDate = repairBlockEndDate(startDate, form.getValues('endDate'))
                      if (endDate !== form.getValues('endDate')) {
                        form.setValue('endDate', endDate, { shouldValidate: true })
                      }
                    },
                  })}
                />
              </Field>
              <Field label="Кінець (не включно)" error={form.formState.errors.endDate?.message}>
                <Input type="date" disabled={!canWrite} {...form.register('endDate')} />
              </Field>
            </div>
            <Field label="Причина">
              <Select
                value={values.reasonId}
                onValueChange={(value: BlockReasonId) => form.setValue('reasonId', value)}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Внутрішня нотатка" error={form.formState.errors.note?.message} hint="Не показується гостям">
              <Textarea disabled={!canWrite} maxLength={BLOCK_NOTE_MAX} {...form.register('note')} />
            </Field>
            {nights.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Буде заблоковано {nightsLabel(nights.length)}: {nights.join(', ')}. {values.endDate} залишиться вільною,
                якщо немає іншого зайняття.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Скасувати
              </Button>
              <Button type="submit" disabled={!canWrite || save.isPending}>
                Далі
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Підтвердити блокування</DialogTitle>
              <DialogDescription>
                {room
                  ? blockConfirmMessage(
                      { name: room.name, number: room.number, typeName: roomTypeName },
                      values.startDate,
                      values.endDate,
                    )
                  : 'Перевірте дати перед підтвердженням.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('form')} disabled={save.isPending}>
                Назад
              </Button>
              <Button type="button" onClick={() => void confirm()} disabled={!canWrite || save.isPending}>
                Заблокувати
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
