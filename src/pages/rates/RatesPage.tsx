import { useState } from 'react'
import { CurrentPricesCalendar } from './CurrentPricesCalendar'
import { PriceWorkspace } from './PriceWorkspace'

export function RatesPage() {
  const [editor, setEditor] = useState(false)
  if (editor) {
    return <PriceWorkspace onBack={() => setEditor(false)} />
  }
  return <CurrentPricesCalendar onEditPrices={() => setEditor(true)} />
}
