import { apiRequest } from '@/lib/api-client'

export type AdminPromoCode = {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: string
  validFrom: string | null
  validTo: string | null
  usageLimit: number | null
  usageCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type AdminPromoPage = {
  items: AdminPromoCode[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type AdminPromoWrite = {
  code: string
  description?: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: string
  validFrom?: string | null
  validTo?: string | null
  usageLimit?: number | null
  active?: boolean
}

export async function listAdminPromoCodes(page = 1, limit = 100): Promise<AdminPromoPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiRequest(`/api/admin/promo-codes?${params}`)
}

export async function createAdminPromoCode(input: AdminPromoWrite): Promise<AdminPromoCode> {
  return apiRequest('/api/admin/promo-codes', { method: 'POST', body: input })
}

export async function updateAdminPromoCode(id: string, input: Partial<AdminPromoWrite>): Promise<AdminPromoCode> {
  return apiRequest(`/api/admin/promo-codes/${id}`, { method: 'PATCH', body: input })
}

export async function deleteAdminPromoCode(id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/promo-codes/${id}`, { method: 'DELETE' })
}
