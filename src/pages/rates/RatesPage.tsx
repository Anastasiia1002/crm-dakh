import { useState } from 'react'
import { pricePeriodRange, type PricePeriodPresetId } from '@/lib/price-nights'
import { CurrentPricesCalendar } from './CurrentPricesCalendar'
import { PriceWorkspace } from './PriceWorkspace'

export function RatesPage() {
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
    <CurrentPricesCalendar
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
  )
}
