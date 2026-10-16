import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import UserProfileButton from '../components/UserProfileButton'
import NotificationBell from '../components/NotificationBell'
import api from '../services/api'

export default function FraudAlerts() {
  const [user, setUser] = useState({
    name: 'User',
    accountNumber: '',
    paymentId: '',
    balance: 0,
    isFrozen: false,
    profilePhoto: '',
  })

  // Fraud alerts state
  const [alerts, setAlerts] = useState([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [filterType, setFilterType] = useState('all') // all | cancelled | proceeded


  // Fetch user profile
  useEffect(() => {
    let isMounted = true
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) setUser(parsed)
      } catch (err) {
        console.error('Failed to parse user data from localStorage', err)
      }
    }

    api.get('/profile')
      .then((res) => {
        if (res.data && isMounted) {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          const updatedUser = {
            ...stored,
            name: res.data.name || stored.name || '',
            email: res.data.email || stored.email || '',
            phone: res.data.phone || stored.phone || '',
            accountNumber: res.data.accountNumber || stored.accountNumber || '',
            paymentId: res.data.paymentId || stored.paymentId || '',
            balance: res.data.balance !== undefined ? res.data.balance : (stored.balance || 0),
            isFrozen: res.data.isFrozen !== undefined ? res.data.isFrozen : (stored.isFrozen || false),
          }
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
      })
      .catch((err) => console.error('Failed to fetch profile in FraudAlerts:', err))

    return () => { isMounted = false }
  }, [])

  // Fetch user's fraud alerts
  const fetchAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const res = await api.get('/transfer/fraud-alerts')
      if (Array.isArray(res.data)) {
        setAlerts(res.data)
      } else {
        setAlerts([])
      }
    } catch (err) {
      console.error('Failed to fetch user fraud alerts', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const cancelledCount = alerts.filter(
    (a) => a.userAction === 'cancelled' || a.userAction === 'cancelled_by_user'
  ).length

  const proceededCount = alerts.filter(
    (a) => a.userAction === 'proceeded' || a.userAction === 'overridden_by_user'
  ).length

  const filteredAlerts = alerts.filter((alert) => {
    const isCancelled = alert.userAction === 'cancelled' || alert.userAction === 'cancelled_by_user'
    const isProceeded = alert.userAction === 'proceeded' || alert.userAction === 'overridden_by_user'

    if (filterType === 'cancelled') return isCancelled
    if (filterType === 'proceeded') return isProceeded
    return true
  })

  return (
    <div className="font-sans antialiased min-h-screen flex bg-surface text-on-surface">
      {/* Shared User Sidebar */}
      <Sidebar role="user" />

      {/* Main Content Area */}
      <div className="ml-64 w-full flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-40 bg-surface border-b border-outline-variant flex justify-between items-center px-lg">
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span className="material-symbols-outlined text-primary text-base">security</span>
              Account Security & Fraud Monitoring
            </div>
          </div>
          <div className="flex items-center gap-md">
            <NotificationBell />
            <div className="h-6 w-px bg-outline-variant mx-2"></div>
            <UserProfileButton user={user} />
          </div>
        </header>

        {/* Fraud Alerts Page Canvas */}
        <main className="flex-1 mt-16 p-margin-desktop bg-background overflow-y-auto">
          <div className="max-w-[1280px] mx-auto flex flex-col gap-6">

            {/* Header Section: Refresh & "Report Suspicious Activity" button */}
            <section className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-500 text-3xl">gpp_maybe</span>
                  Fraud Alerts & Security
                </h2>
                <p className="text-sm text-gray-600">
                  Real-time record of automated fraud rule checks and flagged transaction alerts on your account.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    fetchAlerts()
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
              </div>
            </section>

            {/* Fix 1 — Status banner logic:
                If total flagged transfers count is 0 → show green banner: “All Clear — No suspicious activity detected on your account.”
                If flagged transfers exist → show yellow/orange banner: “Suspicious Activity Detected — Review the alerts below. If you did not perform these actions, contact your bank immediately.”
            */}
            {alerts.length === 0 ? (
              <section className="rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm bg-emerald-50/80 border-emerald-200 text-emerald-950">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-600 text-white shadow-sm">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      All Clear — No suspicious activity detected on your account.
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      All your transactions adhere to safety thresholds and standard banking activity patterns.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900">
                    Status: All Clear
                  </span>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm bg-amber-50/90 border-amber-300 text-amber-950">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-500 text-white shadow-sm">
                    <span className="material-symbols-outlined text-2xl">warning</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      Suspicious Activity Detected — Review the alerts below. If you did not perform these actions, contact your bank immediately.
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Automated fraud protection triggered one or more security alerts on outgoing transfers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                    Action Needed
                  </span>
                </div>
              </section>
            )}

            {/* Metrics Overview Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Total Flagged Transfers
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-gray-900 font-mono">
                    {alerts.length}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    <span className="material-symbols-outlined text-xl">flag</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Cancelled by You
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                    {cancelledCount}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-xl">cancel</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Proceeded Anyway
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-red-600 font-mono">
                    {proceededCount}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                    <span className="material-symbols-outlined text-xl">report</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter Tabs (when alerts exist) */}
            {alerts.length > 0 && (
              <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All Flags ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('cancelled')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'cancelled'
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Cancelled by You ({cancelledCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('proceeded')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'proceeded'
                      ? 'bg-red-700 text-white'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                >
                  Proceeded Anyway ({proceededCount})
                </button>
              </div>
            )}

            {/* Alerts Feed Section or Empty state */}
            {loadingAlerts ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 text-sm shadow-sm">
                Loading fraud alerts and security logs...
              </div>
            ) : alerts.length === 0 ? (
              /* Add 3 — Empty state message:
                 If user has zero fraud alerts, below the green “All Clear” banner show: “Your account has no suspicious activity. All your transactions are clean.”
              */
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Your account has no suspicious activity. All your transactions are clean.
                </h3>
                <p className="text-xs text-gray-500 max-w-[420px] mx-auto">
                  Every transfer adheres to banking security regulations. Any flagged activity will be displayed here in real time.
                </p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                <p className="text-sm text-gray-500">No alerts match the selected filter.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                {filteredAlerts.map((alert) => {
                  const isCancelled =
                    alert.userAction === 'cancelled' || alert.userAction === 'cancelled_by_user'
                  const isProceeded =
                    alert.userAction === 'proceeded' || alert.userAction === 'overridden_by_user'

                  return (
                    <div key={alert._id} className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col gap-3">
                      {/* Top Row: Date, Severity, and Outcome Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                          <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                          <span>{formatDate(alert.detectedAt || alert.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Severity badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {alert.severity || 'high'} Risk
                          </span>

                          {/* Outcome badge */}
                          {isCancelled ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">cancel</span>
                              Cancelled
                            </span>
                          ) : isProceeded ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">report</span>
                              Proceeded Anyway
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Transfer Details + Fix 2: Transaction ID below receiver name */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                            Target Recipient
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-semibold text-gray-900">
                              {alert.receiverName || 'Recipient'}
                            </span>
                            <span className="text-xs font-mono text-gray-500">
                              ({alert.receiverPaymentId || 'N/A'})
                            </span>
                          </div>
                          {/* Fix 2: Transaction ID as a small line below receiver name */}
                          <div className="text-xs font-mono text-gray-600 mt-1">
                            Transaction ID: {alert.transactionId || 'N/A'}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                            Amount Flagged
                          </span>
                          <span className="text-lg font-bold font-mono text-gray-900">
                            ₹{Number(alert.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Triggered Rules List */}
                      <div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                          Triggered Fraud Rules:
                        </span>
                        <ul className="space-y-1.5">
                          {(alert.triggeredRules || [alert.message]).map((rule, rIdx) => (
                            <li
                              key={rIdx}
                              className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-md flex items-start gap-2"
                            >
                              <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5 shrink-0">
                                report_problem
                              </span>
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}


            {/* Contact line at the bottom of the page */}
            <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-600 flex items-center justify-center gap-2 shadow-xs">
              <span className="material-symbols-outlined text-gray-400 text-base shrink-0">info</span>
              <span>
                If you believe your account has been compromised or you did not perform any of these actions, please contact your bank immediately at{' '}
                <a href="mailto:support@blockbank.com" className="font-semibold text-gray-800 hover:underline">
                  support@blockbank.com
                </a>
              </span>
            </section>

          </div>
        </main>
      </div>

    </div>
  )
}
