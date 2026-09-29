// Page size matches superuserPageSize in backend/handlers/superuser.go.
const PAGE_SIZE = 25

export default function Pager({ page, total, onPage, noun }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = Math.min(total, page * PAGE_SIZE)
  const btn =
    'text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        {first}–{last} of {total.toLocaleString()} {noun}
      </span>
      <div className="flex gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
