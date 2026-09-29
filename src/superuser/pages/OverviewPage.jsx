import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import DailyBarChart from '../DailyBarChart'
import { count, money, moneyShort } from '../format'

function StatTile({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function Section({ title, children, aside }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export default function OverviewPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Refresh every minute so "Live now" and viewer counts stay current.
  useEffect(() => {
    const load = () =>
      api
        .get('/superuser/overview')
        .then((d) => {
          setData(d)
          setError('')
        })
        .catch((err) => setError(err.message))
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

  if (error && !data) {
    return <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>
  }
  if (!data) return <p className="text-gray-500 text-sm">Loading…</p>

  const { users, events, tickets, revenue, daily, top_hosts: topHosts, live } = data

  return (
    <div className="space-y-8">
      <Section title="Revenue">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Platform earnings" value={money(revenue.platform_fees + revenue.venue_fees)} sub={`${money(revenue.platform_fees)} commission · ${money(revenue.venue_fees)} venue fees`} />
          <StatTile label="Ticket sales" value={money(revenue.gross_sales)} sub="Gross, all hosts" />
          <StatTile label="Paid to hosts" value={money(revenue.host_payouts)} sub={`${money(revenue.pending_payouts)} pending`} />
          <StatTile label="Processing fees" value={money(revenue.processing_fees)} sub="Stripe / PayPal" />
        </div>
      </Section>

      <Section title="Platform">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Registered users" value={count(users.total)} sub={`${count(users.new_30d)} new in 30 days`} />
          <StatTile label="Hosts" value={count(users.hosts)} sub={`${count(users.buyers)} buyer${users.buyers !== 1 ? 's' : ''}`} />
          <StatTile label="Events" value={count(events.total)} sub={`${count(events.upcoming)} upcoming · ${count(events.unpaid)} unpaid`} />
          <StatTile label="Tickets sold" value={count(tickets.total)} sub={`${count(tickets.last_30d)} in 30 days`} />
        </div>
        {users.pending > 0 && (
          <Link
            to="/superuser/users"
            className="block text-sm text-yellow-500 bg-yellow-950/40 border border-yellow-900 rounded-xl px-4 py-2.5 hover:bg-yellow-950 transition-colors"
          >
            {count(users.pending)} account{users.pending !== 1 ? 's are' : ' is'} waiting for your approval →
          </Link>
        )}
        {users.suspended > 0 && (
          <p className="text-xs text-gray-500">{count(users.suspended)} suspended account{users.suspended !== 1 ? 's' : ''}.</p>
        )}
      </Section>

      <Section title="Last 30 days">
        <div className="grid lg:grid-cols-3 gap-3">
          <DailyBarChart title="Tickets sold" data={daily} valueKey="tickets" format={count} />
          <DailyBarChart title="Ticket sales" data={daily} valueKey="gross" format={moneyShort} />
          <DailyBarChart title="New sign-ups" data={daily} valueKey="signups" format={count} />
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-8">
        <Section
          title="Live now"
          aside={
            <span className="text-xs text-gray-500">
              {data.ivs_enabled ? 'Refreshes every minute' : 'Streaming service not configured'}
            </span>
          }
        >
          {data.live_error && <p className="text-xs text-red-400">{data.live_error}</p>}
          {live.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500 text-center">
              Nothing is live right now.
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
              {live.map((ev) => (
                <div key={ev.event_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500 truncate">{ev.host_name || ev.host_email}</p>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-nowrap">👁 {count(ev.viewers)}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Top hosts">
          {topHosts.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500 text-center">
              No hosts yet.
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 text-left">
                    <th className="px-4 py-2.5 font-medium">Host</th>
                    <th className="px-4 py-2.5 font-medium text-right">Events</th>
                    <th className="px-4 py-2.5 font-medium text-right">Tickets</th>
                    <th className="px-4 py-2.5 font-medium text-right">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {topHosts.map((h) => (
                    <tr key={h.id} className="border-t border-gray-800">
                      <td className="px-4 py-2.5">
                        <p className="font-medium truncate max-w-48">{h.name || h.email}</p>
                        {h.name && <p className="text-xs text-gray-500 truncate max-w-48">{h.email}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{count(h.events)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{count(h.tickets)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{money(h.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
