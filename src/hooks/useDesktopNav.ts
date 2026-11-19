import { useEffect, useState } from 'react'

const DESKTOP_NAV = '(min-width: 1024px)'

export function useDesktopNav() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_NAV).matches)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_NAV)
    const sync = () => setDesktop(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return desktop
}
