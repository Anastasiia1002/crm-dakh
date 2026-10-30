/**
 * Admin extra-service catalog. Deployed backend 5a768a5 has Service and
 * BookingService models and accepts services on create/quote, but there is no
 * GET /api/admin/services controller. CRM must not invent catalog rows.
 */
export const ADMIN_SERVICE_CATALOG_AVAILABLE = false

export const ADMIN_SERVICE_CATALOG_BLOCKED_LABEL = 'BLOCKED BY BACKEND'

export function adminServiceCatalogMessage() {
  return 'Сервер не надає GET /api/admin/services. Каталог не завантажується і не підставляється з локальних записів. Нове бронювання створюється без додаткових послуг, доки не з’явиться цей endpoint.'
}

export function adminBookingServicesBlockedMessage() {
  return 'BLOCKED BY BACKEND. Каталог послуг (GET /api/admin/services) відсутній. Додаткові послуги не обираються і не надсилаються з цієї форми. Сума нижче — серверний quote без послуг.'
}
