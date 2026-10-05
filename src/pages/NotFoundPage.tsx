import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="py-16">
      <p className="font-serif text-5xl">404</p>
      <p className="mt-3 text-sm text-muted-foreground">Такої сторінки немає.</p>
      <Link to="/admin" className="mt-6 inline-block text-sm underline underline-offset-4">
        На головну
      </Link>
    </div>
  )
}
