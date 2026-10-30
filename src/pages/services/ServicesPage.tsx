import { SectionHeading } from '@/components/ui/states'
import {
  ADMIN_SERVICE_CATALOG_BLOCKED_LABEL,
  adminServiceCatalogMessage,
} from '@/lib/admin-services'

export function ServicesPage() {
  return (
    <div className="max-w-xl space-y-4">
      <SectionHeading title="Додаткові послуги" />
      <p className="text-sm font-medium" role="status">
        {ADMIN_SERVICE_CATALOG_BLOCKED_LABEL}
      </p>
      <p className="text-sm text-muted-foreground">{adminServiceCatalogMessage()}</p>
    </div>
  )
}
