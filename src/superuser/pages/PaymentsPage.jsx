import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { count, inputClass, money } from '../format'
import Pager from '../Pager'
import useDebounced from '../useDebounced'

// Payments console: every order (ticket purchases and booking fees), what
// happened to it — refunds, disputes, ledger entries — and the
// reconciliation status of the books against Stripe and PayPal.
const cents = (c) => money((c || 0) / 100)

const STATUS_STYLE = {
  paid: 'bg-green-950 text-green-400',
  pending: 'bg-gray-800 text-gray-300',
  failed: 'bg-red-950 text-red-400',
  expired: 'bg-gray-800 text-gray-500',
  needs_attention: 'bg-yellow-950 text-yellow-400',
}

const FILTERS = [
  ['', 'All orders'],
  ['needs_attention', 'Needs attention'],
  ['paid', 'Paid'],
  ['pending', 'Pending'],
  ['refunded', 'Refunded'],
  ['disputed', 'Disputed'],
  ['failed', 'Failed'],
  ['expired', 'Expired'],
]

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[status] || 'bg-gray-800 text-gray-400'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function Reconciliation() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)

  const load = useCallback(() => {
    api.get('/superuser/finance/reconciliation').then(setData).catch((err) => setError(err.message))
  }, [])
  useEffect(load, [load])

  async function runNow() {
    setRunning(true)
    setError('')
    try {
      setRunResult(await api.post('/superuser/finance/reconcile', {}))
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  if (error && !data) return <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>
  if (!data) return <p className="text-gray-500 text-sm">Checking the books…</p>

  const books = data.books
  const t = books.totals || {}
  const ok = books.issues.length === 0
  const provider = runResult || data.last_provider_run

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Reconciliation</h2>
          <p className={`text-sm ${ok ? 'text-green-400' : 'text-red-400'}`}>
            {ok
              ? `Books reconcile: ${count(books.orders_checked)} orders checked, ledger balanced.`
              : `${books.issues.length} inconsistenc${books.issues.length === 1 ? 'y' : 'ies'} in the books.`}
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {running ? 'Checking Stripe / PayPal…' : 'Check against Stripe / PayPal now'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <Figure label="Ticket sales" value={cents(t.ticket_gross_cents)} />
        <Figure label="Refunded" value={cents(t.refunded_cents)} />
        <Figure label="Commission (net)" value={cents(t.commission_cents)} />
        <Figure label="Booking fees (net)" value={cents(t.booking_fee_revenue_cents)} />
        <Figure label="Processing fees" value={cents(t.processing_fees_cents)} />
        <Figure label="Dispute losses" value={cents(t.dispute_losses_cents)} />
        <Figure label="Owed to hosts" value={cents(t.host_payable_cents)} />
        <Figure label="Needs attention" value={count(books.needs_attention_orders.length)} warn={books.needs_attention_orders.length > 0} />
      </div>

      {(books.failed_webhooks > 0 || books.stale_pending_orders > 0) && (
        <p className="text-sm text-yellow-400">
          {books.failed_webhooks > 0 && `${books.failed_webhooks} webhook deliveries failed or need attention. `}
          {books.stale_pending_orders > 0 && `${books.stale_pending_orders} checkouts are still pending after 2 hours.`}
        </p>
      )}

      {books.issues.length > 0 && <IssueList issues={books.issues} />}

      <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
        {provider ? (
          <>
            Provider check {data.last_provider_run_at && !runResult ? `(${new Date(data.last_provider_run_at).toLocaleString()})` : '(just now)'}:{' '}
            {count(provider.orders_checked)} orders compared,{' '}
            <span className={provider.issues?.length ? 'text-red-400' : 'text-green-400'}>{count(provider.issues?.length)} mismatches</span>
            {provider.repaired?.length > 0 && `, ${provider.repaired.length} missed payments recorded`}
            {provider.fees_recorded > 0 && `, ${provider.fees_recorded} fees booked`}.
            {provider.issues?.length > 0 && <IssueList issues={provider.issues} />}
          </>
        ) : (
          'No provider check has run yet.'
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}

function Figure({ label, value, warn }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2">
      <p className={`font-semibold ${warn ? 'text-yellow-400' : ''}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function IssueList({ issues }) {
  return (
    <ul className="mt-2 space-y-1 text-xs font-mono text-red-300 max-h-48 overflow-y-auto">
      {issues.map((is, i) => (
        <li key={i}>
          {is.check}: {is.detail}
          {is.order_id && <span className="text-gray-500"> (order {is.order_id.slice(0, 8)})</span>}
        </li>
      ))}
    </ul>
  )
}

function OrderDetail({ id, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get(`/superuser/orders/${id}`).then(setDetail).catch((err) => setError(err.message))
  }, [id])

  async function refund(e) {
    e.preventDefault()
    const o = detail.order
    const amountCents = amount === '' ? 0 : Math.round(parseFloat(amount) * 100)
    const shown = cents(amountCents || o.refundable_cents)
    if (!window.confirm(`Refund ${shown} to ${o.buyer_email}? This sends money back through ${o.provider} and can't be undone.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await api.post(`/superuser/orders/${id}/refund`, { amount_cents: amountCents, reason })
      if (data.order) setDetail(data)
      if (data.error) setNotice(data.error)
      else setNotice(`Refunded ${shown}.`)
      setAmount('')
      setReason('')
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !detail) return <p className="text-red-400 text-sm px-4 py-3">{error}</p>
  if (!detail) return <p className="text-gray-500 text-sm px-4 py-3">Loading…</p>
  const o = detail.order

  return (
    <div className="px-4 py-4 bg-gray-950 border-t border-gray-800 space-y-4 text-sm">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
        <p>Order <span className="font-mono text-gray-300">{o.id}</span></p>
        <p>Fee rule <span className="text-gray-300">{o.fee_rule}</span> · platform fee {cents(o.platform_fee_cents)}</p>
        <p>Checkout <span className="font-mono text-gray-300">{o.provider_checkout_id || '—'}</span></p>
        <p>Payment <span className="font-mono text-gray-300">{o.provider_payment_id || '—'}</span></p>
        <p>Processing fee {o.provider_fee_cents == null ? 'not reconciled yet' : cents(o.provider_fee_cents)}</p>
        {o.failure_reason && <p className="text-yellow-400 sm:col-span-2">{o.failure_reason}</p>}
      </div>

      {detail.tickets.length > 0 && (
        <p className="text-xs text-gray-400">
          Tickets:{' '}
          {detail.tickets.map((tk) => (
            <span key={tk.serial_no} className={`mr-2 font-mono ${tk.voided_at ? 'line-through text-gray-600' : 'text-gray-300'}`}>
              #{tk.serial_no}{tk.void_reason ? ` (${tk.void_reason})` : ''}
            </span>
          ))}
        </p>
      )}

      {detail.refunds.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1">Refunds</p>
          {detail.refunds.map((r) => (
            <p key={r.id} className="text-xs text-gray-400">
              {new Date(r.created_at).toLocaleString()} · {cents(r.amount_cents)} · {r.status}{r.reversed ? ' (reversed)' : ''}
              {r.reason ? ` · ${r.reason}` : ''} <span className="font-mono text-gray-600">{r.provider_refund_id}</span>
            </p>
          ))}
        </div>
      )}

      {detail.disputes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1">Disputes</p>
          {detail.disputes.map((d) => (
            <p key={d.provider_dispute_id} className="text-xs text-gray-400">
              {cents(d.amount_cents)} · {d.outcome} ({d.provider_status}) · held {cents(d.withdrawn_cents)} · fee {cents(d.fee_cents)}
              {d.reason ? ` · ${d.reason}` : ''}
            </p>
          ))}
        </div>
      )}

      {detail.journals.length > 0 && (
        <details>
          <summary className="text-xs text-gray-500 cursor-pointer">Ledger ({detail.journals.length} entries)</summary>
          <table className="mt-2 text-xs font-mono w-full">
            <tbody>
              {detail.journals.map((j) => (
                <tr key={j.key} className="border-t border-gray-800 align-top">
                  <td className="py-1 pr-3 text-gray-500 whitespace-nowrap">{j.kind}</td>
                  <td className="py-1 text-gray-400">
                    {Object.entries(j.postings).map(([acct, c]) => (
                      <span key={acct} className="mr-3">{acct} {c > 0 ? '+' : ''}{(c / 100).toFixed(2)}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {o.refundable_cents > 0 && (
        <form onSubmit={refund} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-400">
            Amount (USD)
            <input
              type="number" min="0.01" step="0.01" max={(o.refundable_cents / 100).toFixed(2)}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={(o.refundable_cents / 100).toFixed(2)}
              className={`${inputClass} block mt-1 w-32`}
            />
          </label>
          <label className="text-xs text-gray-400 flex-1 min-w-48">
            Reason
            <input
              required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why this refund is being made"
              className={`${inputClass} block mt-1 w-full`}
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="text-sm px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
          >
            {busy ? 'Refunding…' : amount ? 'Refund amount' : 'Refund all'}
          </button>
        </form>
      )}
      {notice && <p className="text-sm text-green-400">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default function PaymentsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const search = useDebounced(q, 300)

  const query = new URLSearchParams({ q: search, status, page: String(page) }).toString()
  const [result, setResult] = useState({ key: null, orders: [], total: 0 })
  const [error, setError] = useState('')
  const key = `${query}#${refresh}`
  const loading = result.key !== key

  useEffect(() => {
    let cancelled = false
    api
      .get(`/superuser/orders?${query}`)
      .then((d) => { if (!cancelled) { setResult({ key, orders: d.orders || [], total: d.total || 0 }); setError('') } })
      .catch((err) => { if (!cancelled) { setResult({ key, orders: [], total: 0 }); setError(err.message) } })
    return () => { cancelled = true }
  }, [query, key])

  return (
    <div className="space-y-6">
      <Reconciliation key={refresh} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Search buyer, host, event or payment ID"
          className={`${inputClass} flex-1 min-w-56`}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className={inputClass} aria-label="Filter orders">
          {FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>}

      <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden ${loading ? 'opacity-60' : ''}`}>
        {!loading && result.orders.length === 0 && <p className="p-6 text-center text-gray-500 text-sm">No orders.</p>}
        {result.orders.map((o) => (
          <div key={o.id} className="border-t border-gray-800 first:border-t-0">
            <button
              onClick={() => setOpenId(openId === o.id ? null : o.id)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-gray-800/50 transition-colors"
              aria-expanded={openId === o.id}
            >
              <span className="text-xs text-gray-500 w-36 shrink-0">{new Date(o.created_at).toLocaleString()}</span>
              <StatusBadge status={o.status} />
              <span className="flex-1 min-w-48">
                <span className="font-medium">{o.kind === 'booking_fee' ? 'Booking fee' : `${o.quantity} ticket${o.quantity !== 1 ? 's' : ''}`}</span>
                <span className="text-gray-400"> · {o.event_title}</span>
                <span className="block text-xs text-gray-500">{o.buyer_email} · host {o.host_email} · {o.provider}</span>
              </span>
              <span className="text-right">
                <span className="font-semibold">{cents(o.amount_cents)}</span>
                {o.refunded_cents > 0 && <span className="block text-xs text-red-400">−{cents(o.refunded_cents)} refunded</span>}
                {o.open_disputes > 0 && <span className="block text-xs text-yellow-400">disputed</span>}
              </span>
            </button>
            {openId === o.id && <OrderDetail id={o.id} onChanged={() => setRefresh((r) => r + 1)} />}
          </div>
        ))}
      </div>

      <Pager page={page} total={result.total} onPage={setPage} noun="orders" />
    </div>
  )
}
