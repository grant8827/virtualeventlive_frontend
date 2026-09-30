import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import PasswordInput from '../../components/PasswordInput'
import { formatRate, useHourlyRate } from '../../api/pricing'

export default function PayoutsPage() {
  const navigate = useNavigate()
  const hourlyRate = useHourlyRate()

  const [payoutStatus, setPayoutStatus] = useState(null)
  const [payoutStatusLoading, setPayoutStatusLoading] = useState(false)
  const [payoutBalance, setPayoutBalance] = useState(null)
  const [gatewayAction, setGatewayAction] = useState('')
  const [gatewayConnectError, setGatewayConnectError] = useState('')
  const [payoutTriggerLoading, setPayoutTriggerLoading] = useState(false)
  const [payoutTriggerMessage, setPayoutTriggerMessage] = useState('')
  const [payoutSecurityLoading, setPayoutSecurityLoading] = useState(false)
  const [payoutPasscodeSet, setPayoutPasscodeSet] = useState(null)
  const [payoutUnlocked, setPayoutUnlocked] = useState(false)
  const [payoutToken, setPayoutToken] = useState('')
  const [payoutPasscode, setPayoutPasscode] = useState('')
  const [payoutPasscodeConfirm, setPayoutPasscodeConfirm] = useState('')
  const [payoutAccountPassword, setPayoutAccountPassword] = useState('')
  const [payoutSecurityError, setPayoutSecurityError] = useState('')

  // Payouts are locked by default and re-locked automatically — both when
  // this page unmounts (host navigates away) and after 5 minutes idle.
  useEffect(() => {
    checkPayoutSecurity()
    return () => lockPayouts()
  }, [])

  useEffect(() => {
    if (!payoutToken) return undefined
    const timer = window.setTimeout(() => lockPayouts(), 5 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [payoutToken])

  function lockPayouts() {
    setPayoutUnlocked(false)
    setPayoutToken('')
    setPayoutStatus(null)
    setPayoutBalance(null)
    setPayoutPasscode('')
    setPayoutPasscodeConfirm('')
    setPayoutAccountPassword('')
    setPayoutSecurityError('')
  }

  async function checkPayoutSecurity() {
    setPayoutSecurityLoading(true)
    setPayoutPasscodeSet(null)
    try {
      const data = await api.get('/connect/security/status')
      setPayoutPasscodeSet(Boolean(data.passcode_set))
    } catch (err) {
      setPayoutSecurityError(err.message)
    } finally {
      setPayoutSecurityLoading(false)
    }
  }

  async function handlePayoutSecuritySubmit(e) {
    e.preventDefault()
    setPayoutSecurityError('')
    setPayoutSecurityLoading(true)
    try {
      const data = payoutPasscodeSet
        ? await api.post('/connect/security/unlock', { passcode: payoutPasscode })
        : await api.post('/connect/security/passcode', {
            passcode: payoutPasscode,
            confirm_passcode: payoutPasscodeConfirm,
            password: payoutAccountPassword,
          })
      setPayoutToken(data.payout_token)
      setPayoutUnlocked(true)
      setPayoutPasscodeSet(true)
      setPayoutPasscode('')
      setPayoutPasscodeConfirm('')
      setPayoutAccountPassword('')
      await fetchPayoutStatus(data.payout_token)
    } catch (err) {
      setPayoutSecurityError(err.message)
    } finally {
      setPayoutSecurityLoading(false)
    }
  }

  async function fetchPayoutStatus(token = payoutToken) {
    if (!token) return
    setPayoutStatusLoading(true)
    try {
      const [status, balance] = await Promise.all([
        api.secureGet('/connect/status', token),
        api.secureGet('/connect/balance', token),
      ])
      setPayoutStatus(status)
      setPayoutBalance(balance)
    } catch {
      setPayoutStatus(null)
      setPayoutBalance(null)
    } finally {
      setPayoutStatusLoading(false)
    }
  }

  async function handleTriggerPayout() {
    setPayoutTriggerMessage('')
    setPayoutTriggerLoading(true)
    try {
      const data = await api.securePost('/connect/payout', {}, payoutToken)
      setPayoutTriggerMessage(`Sent $${Number(data.amount).toFixed(2)} via ${data.gateway}.`)
      await fetchPayoutStatus()
    } catch (err) {
      setPayoutTriggerMessage(err.message)
    } finally {
      setPayoutTriggerLoading(false)
    }
  }

  async function handleStripeConnect() {
    try {
      const data = await api.securePost('/connect/onboard', {}, payoutToken)
      if (data.url) window.location.href = data.url
    } catch (err) {
      alert(err.message)
    }
  }

  async function handlePayPalConnect() {
    setGatewayConnectError('')
    setGatewayAction('connect-paypal')
    try {
      const data = await api.securePost('/connect/paypal', {}, payoutToken)
      if (data.url) window.location.href = data.url
    } catch (err) {
      setGatewayConnectError(err.message)
    } finally {
      setGatewayAction('')
    }
  }

  async function handleActivate(gateway) {
    setGatewayConnectError('')
    setGatewayAction(`activate-${gateway}`)
    try {
      await api.securePost('/connect/activate', { gateway }, payoutToken)
      await fetchPayoutStatus()
    } catch (err) {
      setGatewayConnectError(err.message)
    } finally {
      setGatewayAction('')
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Deactivate payouts? New ticket purchases will be blocked until you activate an account again.')) return
    setGatewayConnectError('')
    setGatewayAction('deactivate')
    try {
      await api.securePost('/connect/deactivate', {}, payoutToken)
      await fetchPayoutStatus()
    } catch (err) {
      setGatewayConnectError(err.message)
    } finally {
      setGatewayAction('')
    }
  }

  if (!payoutUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-950 text-2xl">🔒</div>
            <h2 className="text-xl font-bold">
              {payoutPasscodeSet === false ? 'Create payout passcode' : 'Unlock payouts'}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {payoutPasscodeSet === false
                ? 'Create a 6-digit code to protect payout accounts and transfers.'
                : 'Enter your 6-digit payout passcode. This section locks again when you leave it.'}
            </p>
          </div>

          {payoutPasscodeSet === null ? (
            payoutSecurityLoading ? (
              <p className="py-6 text-center text-sm text-gray-400">Checking payout security…</p>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-red-400">{payoutSecurityError || 'Unable to check payout security.'}</p>
                <button
                  type="button"
                  onClick={checkPayoutSecurity}
                  className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/golive')}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handlePayoutSecuritySubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">6-digit passcode</label>
                <PasswordInput
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                  value={payoutPasscode}
                  onChange={(e) => setPayoutPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-purple-500 focus:outline-none"
                />
              </div>

              {payoutPasscodeSet === false && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-400">Confirm passcode</label>
                    <PasswordInput
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      value={payoutPasscodeConfirm}
                      onChange={(e) => setPayoutPasscodeConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-400">Current account password</label>
                    <PasswordInput
                      autoComplete="current-password"
                      required
                      value={payoutAccountPassword}
                      onChange={(e) => setPayoutAccountPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {payoutSecurityError && <p className="text-sm text-red-400">{payoutSecurityError}</p>}
              <button
                type="submit"
                disabled={payoutSecurityLoading || payoutPasscode.length !== 6}
                className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {payoutSecurityLoading ? 'Please wait…' : payoutPasscodeSet === false ? 'Create & Unlock' : 'Unlock Payouts'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/golive')}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-lg font-semibold mb-2">Payouts</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        Choose Stripe or PayPal. Buyers use the provider you activate; 90% goes directly to
        your connected merchant account and the platform receives its 10% fee.
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-2 text-sm text-gray-300 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Venue fee</span>
          <span>{formatRate(hourlyRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Platform commission</span>
          <span>10% per ticket</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Your cut</span>
          <span className="text-green-400 font-semibold">90% of ticket revenue</span>
        </div>
      </div>

      {gatewayConnectError && (
        <p className="text-red-400 text-sm mb-4">{gatewayConnectError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      {/* Stripe */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
        <h3 className="font-semibold">Stripe</h3>
        {payoutStatus?.stripe?.connected && (
          <span className={`text-xs px-2 py-1 rounded-full mt-2 ${payoutStatus.active_gateway === 'stripe' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            {payoutStatus.active_gateway === 'stripe' ? 'Active' : 'Connected'}
          </span>
        )}
        <p className="text-gray-500 text-xs my-4 flex-1">
          Funds transfer to your Stripe account automatically after each sale.
        </p>
        <button
          onClick={handleStripeConnect}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {payoutStatus?.stripe?.connected ? 'Manage Stripe Account →' : 'Connect Stripe Account →'}
        </button>
        {payoutStatus?.stripe?.connected && payoutStatus.active_gateway !== 'stripe' && (
          <button
            onClick={() => handleActivate('stripe')}
            disabled={gatewayAction !== ''}
            className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {gatewayAction === 'activate-stripe' ? 'Activating…' : 'Activate Stripe'}
          </button>
        )}
      </div>

      {/* WiPay */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
        <h3 className="font-semibold">WiPay</h3>
        <span className="text-xs px-2 py-1 rounded-full mt-2 bg-amber-950 text-amber-300">Coming Soon</span>
        <p className="text-gray-500 text-xs my-4 flex-1">
          WiPay ticket payments and host payouts are not available yet.
        </p>
        <button disabled className="w-full bg-gray-800 text-gray-500 px-4 py-2 rounded-xl text-sm font-semibold cursor-not-allowed">
          Coming Soon
        </button>
      </div>

      {/* PayPal */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
        <h3 className="font-semibold">PayPal</h3>
        {payoutStatus?.paypal?.connected && (
          <span className={`text-xs px-2 py-1 rounded-full mt-2 ${payoutStatus.active_gateway === 'paypal' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            {payoutStatus.active_gateway === 'paypal' ? 'Active' : 'Connected'}
          </span>
        )}
        <p className="text-gray-500 text-xs my-4 flex-1">
          Connect securely with PayPal. Ticket revenue goes directly to your PayPal merchant account.
        </p>
        {payoutStatus?.paypal?.connected ? (
          <>
            <p className="w-full truncate text-xs text-gray-400 mb-3" title={payoutStatus.paypal.account_id}>
              {payoutStatus.paypal.account_id}
            </p>
            {payoutStatus.active_gateway !== 'paypal' && (
              <button onClick={() => handleActivate('paypal')} disabled={gatewayAction !== ''} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                {gatewayAction === 'activate-paypal' ? 'Activating…' : 'Activate PayPal'}
              </button>
            )}
          </>
        ) : (
          <div className="w-full space-y-2">
            <button type="button" onClick={handlePayPalConnect} disabled={gatewayAction !== ''} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
              {gatewayAction === 'connect-paypal' ? 'Connecting…' : 'Connect PayPal'}
            </button>
          </div>
        )}
      </div>

      {payoutStatus?.active_gateway && (
        <div className="bg-red-950/30 border border-red-900/60 rounded-2xl p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-red-300">Deactivate payouts</h3>
              <p className="text-xs text-gray-400 mt-1">Your accounts remain saved, but new ticket purchases will be blocked.</p>
            </div>
            <button
              onClick={handleDeactivate}
              disabled={gatewayAction !== ''}
              className="shrink-0 border border-red-800 text-red-300 hover:bg-red-950 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {gatewayAction === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </div>
      )}
      </div>

      {/* WiPay is the only manual payout rail. Stripe and PayPal split at checkout. */}
      {payoutStatus?.active_gateway === 'wipay' && payoutBalance?.pending_amount > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Pending payout balance</h3>
            <span className="text-green-400 font-semibold">
              ${Number(payoutBalance?.pending_amount || 0).toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleTriggerPayout}
            disabled={payoutTriggerLoading || !(payoutBalance?.pending_amount > 0)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {payoutTriggerLoading ? 'Sending…' : `Request Payout via ${payoutStatus.active_gateway}`}
          </button>
          {payoutTriggerMessage && (
            <p className="text-sm text-gray-400 mt-3">{payoutTriggerMessage}</p>
          )}
        </div>
      )}

      {payoutStatusLoading && (
        <p className="text-xs text-gray-600 text-center mb-4">Loading payout status…</p>
      )}
      <p className="text-xs text-gray-600 text-center">
        Your banking info is never stored on our servers.
      </p>
    </div>
  )
}
