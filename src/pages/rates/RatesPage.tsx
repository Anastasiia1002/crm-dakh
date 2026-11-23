import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { pricePeriodRange, type PricePeriodPresetId } from '@/lib/price-nights'
import { canManageRates } from '@/lib/roles'
import { CurrentPricesCalendar } from './CurrentPricesCalendar'
import { PriceWorkspace } from './PriceWorkspace'
import { LengthStayDiscountsPanel } from './StayPricingSections'

export const LENGTH_STAY_POLICY =
  'Знижка застосовується автоматично до вартості проживання. Додаткові послуги оплачуються окремо. Якщо є промокод, застосовується більша знижка; однакові суми лишають промокод. Суми не складаються.'

export function RatesPage() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'discounts' ? 'discounts' : 'prices'
  const initial = pricePeriodRange('current-month')
  const [editor, setEditor] = useState(false)
  const [preset, setPreset] = useState<PricePeriodPresetId>('current-month')
  const [firstNight, setFirstNight] = useState(initial.firstNight)
  const [lastNight, setLastNight] = useState(initial.lastNight)
  const [roomIds, setRoomIds] = useState<string[]>([])

  if (editor) {
    return (
      <PriceWorkspace
        initialFirstNight={firstNight}
        initialLastNight={lastNight}
        initialRoomIds={roomIds}
        onBack={() => setEditor(false)}
        onSaved={(next) => {
          setFirstNight(next.firstNight)
          setLastNight(next.lastNight)
          setRoomIds(next.roomIds)
          setPreset('current-month')
          setEditor(false)
        }}
      />
    )
  }

  return (
    <Tabs
      className="space-y-4"
      value={tab}
      onValueChange={(value) => {
        const copy = new URLSearchParams(params)
        if (value === 'discounts') copy.set('tab', 'discounts')
        else copy.delete('tab')
        setParams(copy, { replace: true })
      }}
    >
      <PageHeader
        title="Ціни"
        description={
          tab === 'discounts'
            ? LENGTH_STAY_POLICY
            : 'Діючі ціни по номерах і будиночках. Щоб змінити їх — «Змінити ціни».'
        }
        actions={
          tab === 'prices' && canWrite ? (
            <Button type="button" onClick={() => setEditor(true)}>
              Змінити ціни
            </Button>
          ) : undefined
        }
      />
      <TabsList>
        <TabsTrigger value="prices">Поточні ціни</TabsTrigger>
        <TabsTrigger value="discounts">Знижки</TabsTrigger>
      </TabsList>
      <TabsContent value="prices">
        {tab === 'prices' ? (
          <CurrentPricesCalendar
            embedded
            firstNight={firstNight}
            lastNight={lastNight}
            preset={preset}
            highlightedRoomIds={roomIds}
            onRangeChange={(next) => {
              setPreset(next.preset)
              setFirstNight(next.firstNight)
              setLastNight(next.lastNight)
            }}
            onEditPrices={() => setEditor(true)}
          />
        ) : null}
      </TabsContent>
      <TabsContent value="discounts">
        {tab === 'discounts' ? <LengthStayDiscountsPanel /> : null}
      </TabsContent>
    </Tabs>
  )
}
