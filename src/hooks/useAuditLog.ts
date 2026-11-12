import { useQuery } from '@tanstack/react-query'
import { listAuditEvents } from '@/api/audit'
import type { AuditListQuery } from '@/lib/admin-audit'

export function useAuditLog(query: AuditListQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin-audit', query],
    queryFn: ({ signal }) => listAuditEvents(query, signal),
    enabled: options?.enabled ?? true,
  })
}
