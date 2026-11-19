const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"], [role="switch"], [data-row-stop]'

export function isInteractiveRowTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE))
}

export function shouldOpenRow(event: { button?: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; defaultPrevented: boolean; target: EventTarget | null }) {
  if (event.defaultPrevented) return false
  if ((event.button ?? 0) !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (isInteractiveRowTarget(event.target)) return false
  return true
}
