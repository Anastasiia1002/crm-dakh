export const DASHBOARD_EMPTY_MESSAGE = 'За вибраний період даних немає.'
export const DASHBOARD_ERROR_MESSAGE = 'Не вдалося завантажити дані.'

export type DashboardPhase = 'loading' | 'error' | 'empty' | 'ready' | 'unavailable'

export type DashboardView =
  | { kind: 'unavailable'; title: string; detail: string }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'ready' }

/**
 * Real GET /api/admin/dashboard/summary.
 * A 200 with zeros is ready, not empty, and not unavailable.
 * Empty is unused for KPI cards — zeros render as zero.
 */
export function resolveDashboardView(input: { summaryEndpoint: boolean; phase?: DashboardPhase }): DashboardView {
  if (!input.summaryEndpoint || input.phase === 'unavailable') {
    return {
      kind: 'unavailable',
      title: 'Зведення недоступне',
      detail:
        'Сервер не надає зведені показники бронювань, завантаженості та оплат. Суми бронювань не показуються як отриманий дохід.',
    }
  }
  if (input.phase === 'loading' || !input.phase) return { kind: 'loading' }
  if (input.phase === 'error') return { kind: 'error', message: DASHBOARD_ERROR_MESSAGE }
  if (input.phase === 'empty') return { kind: 'empty', message: DASHBOARD_EMPTY_MESSAGE }
  return { kind: 'ready' }
}
