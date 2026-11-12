import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { exportAuditEvents } from '@/api/audit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { QueryErrorState } from '@/components/ui/page-status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useHotel'
import {
  AUDIT_CATEGORIES,
  auditCategoryLabel,
  entityHref,
  isAuditUnavailable,
  operationalAuditCategories,
  type AuditCategory,
  type AuditEvent,
} from '@/lib/admin-audit'
import { formatDateTimeKyiv } from '@/lib/format'
import { userRoleLabel } from '@/lib/labels'
import { canExportAudit, canReadAudit } from '@/lib/roles'

const PAGE_SIZE = 20
const ENTITY_TYPES = [
  { value: 'Booking', label: 'Бронювання' },
  { value: 'Guest', label: 'Гість' },
  { value: 'Room', label: 'Номер' },
  { value: 'RoomType', label: 'Тип розміщення' },
  { value: 'RoomBlock', label: 'Блокування' },
  { value: 'Hotel', label: 'Готель' },
  { value: 'BookingSettings', label: 'Налаштування бронювання' },
  { value: 'PromoCode', label: 'Промокод' },
  { value: 'Service', label: 'Послуга' },
  { value: 'AdminUser', label: 'Користувач' },
  { value: 'AdminInvitation', label: 'Запрошення' },
  { value: 'RatePlan', label: 'Тариф' },
]

export function AuditPage() {
  const { user } = useAuth()
  const canRead = canReadAudit(user?.role)
  const canExport = canExportAudit(user?.role)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actorId, setActorId] = useState('all')
  const [category, setCategory] = useState<AuditCategory | 'all'>('all')
  const [entityType, setEntityType] = useState('all')
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const categories = canExport ? AUDIT_CATEGORIES : operationalAuditCategories
  const filters = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      actorId: actorId === 'all' ? undefined : actorId,
      category: category === 'all' ? undefined : category,
      entityType: entityType === 'all' ? undefined : entityType,
    }),
    [actorId, category, dateFrom, dateTo, entityType, page],
  )
  const audit = useAuditLog(filters, { enabled: canRead })
  const staff = useUsers({ page: 1, limit: 100 })

  if (!canRead) {
    return (
      <div className="max-w-xl space-y-3 border-t border-border py-10">
        <h2 className="font-serif text-[1.7rem] font-medium">Немає доступу</h2>
        <p className="text-sm text-muted-foreground">Журнал дій недоступний для вашої ролі.</p>
      </div>
    )
  }

  if (audit.isLoading && !audit.data) return <LoadingState />
  if (audit.error) {
    if (isAuditUnavailable(audit.error)) {
      return (
        <div className="max-w-xl space-y-3 border-t border-border py-10">
          <h2 className="font-serif text-[1.7rem] font-medium">Журнал дій</h2>
          <p className="text-sm text-muted-foreground">
            Журнал дій ще не підключений на сервері. Сторінка доступна, записи зʼявляться після оновлення backend.
          </p>
        </div>
      )
    }
    return <QueryErrorState error={audit.error} onRetry={() => void audit.refetch()} />
  }

  const items = audit.data?.items ?? []
  const total = audit.data?.pagination.total ?? 0

  async function onExport() {
    setExporting(true)
    setExportError(null)
    try {
      const blob = await exportAuditEvents({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        actorId: filters.actorId,
        category: filters.category,
        entityType: filters.entityType,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'zhurnal-dii.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Не вдалося експортувати журнал')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium">Журнал дій</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Історія змін у готелі. Час показано за київським поясом. Записи не редагуються.
          </p>
        </div>
        {canExport ? (
          <Button variant="outline" onClick={() => void onExport()} disabled={exporting}>
            {exporting ? 'Експорт…' : 'Експортувати CSV'}
          </Button>
        ) : null}
      </div>
      {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Від</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">До</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Співробітник</span>
          <Select
            value={actorId}
            onValueChange={(value) => {
              setActorId(value)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Усі" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              {(staff.data?.items ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Категорія</span>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as AuditCategory | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Усі" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {auditCategoryLabel[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Сутність</span>
          <Select
            value={entityType}
            onValueChange={(value) => {
              setEntityType(value)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Усі" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              {ENTITY_TYPES.filter((item) => canExport || !['AdminUser', 'AdminInvitation', 'RatePlan'].includes(item.value)).map(
                (item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </label>
      </div>

      {items.length === 0 ? (
        <EmptyState>Записів за вибраними фільтрами немає.</EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Час</TableHead>
              <TableHead>Співробітник</TableHead>
              <TableHead>Дія</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead>Сутність</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const href = entityHref(item.entityType, item.entityId)
              return (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelected(item)}>
                  <TableCell className="whitespace-nowrap">{formatDateTimeKyiv(item.createdAt)}</TableCell>
                  <TableCell>
                    <div>{item.actor?.displayName ?? 'Система / невідомо'}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.actor?.role ? userRoleLabel[item.actor.role] : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{item.description}</div>
                    {item.outcome === 'failure' ? (
                      <Badge tone="warning" className="mt-1">
                        Невдача
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{auditCategoryLabel[item.category]}</TableCell>
                  <TableCell>
                    {href ? (
                      <Link to={href} onClick={(event) => event.stopPropagation()} className="underline-offset-2 hover:underline">
                        {item.entityLabel}
                      </Link>
                    ) : (
                      item.entityLabel
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.description ?? 'Деталі дії'}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <dl className="space-y-3 text-sm">
              <Detail label="Час" value={formatDateTimeKyiv(selected.createdAt)} />
              <Detail label="Співробітник" value={selected.actor?.displayName ?? 'Система / невідомо'} />
              <Detail label="Роль" value={selected.actor?.role ? userRoleLabel[selected.actor.role] : '—'} />
              <Detail label="Код дії" value={selected.action} />
              <Detail label="Категорія" value={auditCategoryLabel[selected.category]} />
              <Detail
                label="Сутність"
                value={
                  selected.entityId
                    ? `${selected.entityLabel} (${selected.entityId})`
                    : selected.entityLabel
                }
              />
              <div>
                <dt className="text-muted-foreground">Деталі</dt>
                <dd className="mt-1 whitespace-pre-wrap break-all font-mono text-xs">
                  {selected.details ? JSON.stringify(selected.details, null, 2) : 'Немає'}
                </dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}
