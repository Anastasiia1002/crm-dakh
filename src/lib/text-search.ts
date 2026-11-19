const SEARCH_LOCALE = 'uk'

export function searchNeedle(term: string) {
  return term.trim().toLocaleLowerCase(SEARCH_LOCALE)
}

export function textIncludesSearch(value: string | null | undefined, term: string) {
  const needle = searchNeedle(term)
  if (!needle) return true
  return (value ?? '').toLocaleLowerCase(SEARCH_LOCALE).includes(needle)
}
