import { Link } from 'react-router-dom'

export default function ActiveEventCard({ event }) {
  const date = new Date(event.starts_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-purple-600"
    >
      <h3 className="font-bold text-lg leading-snug">{event.title}</h3>
      <p className="mt-2 text-sm text-gray-500">{date}</p>
    </Link>
  )
}
