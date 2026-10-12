import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import UserProfileButton from '../components/UserProfileButton'
import NotificationBell from '../components/NotificationBell'
import api from '../services/api'

export default function FraudAlerts() {
  const navigate = useNavigate()
  const [user, setUser] = useState({
    name: 'User',
    accountNumber: '',
    paymentId: '',
    balance: 0,
    isFrozen: false,
    profilePhoto: '',
  })

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all') // all | cancelled | overridden | pending
  const [isFreezing, setIsFreezing] = useState(false)
  const [freezeMessage, setFreezeMessage] = useState('')
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false)

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
      setLoading(true)
      const res = await api.get('/transfer/fraud-alerts')
      if (Array.isArray(res.data)) {
        setAlerts(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch user fraud alerts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleSelfFreeze = async () => {
    setIsFreezing(true)
    setFreezeMessage('')
    try {
      const res = await api.post('/transfer/self-freeze')
      setShowFreezeConfirm(false)
      setUser((prev) => ({ ...prev, isFrozen: true }))
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      stored.isFrozen = true
      localStorage.setItem('user', JSON.stringify(stored))
      setFreezeMessage(res.data?.message || 'Your account has been frozen for safety.')
    } catch (err) {
      console.error('Failed to self-freeze account:', err)
      setFreezeMessage(err.response?.data?.message || 'Failed to freeze account.')
    } finally {
      setIsFreezing(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === 'cancelled') return alert.userAction === 'cancelled_by_user'
    if (filterType === 'overridden') return alert.userAction === 'overridden_by_user'
    if (filterType === 'pending') return alert.userAction === 'pending'
    return true
  })

  const cancelledCount = alerts.filter((a) => a.userAction === 'cancelled_by_user').length
  const overriddenCount = alerts.filter((a) => a.userAction === 'overridden_by_user').length

  const activeUnresolvedAlerts = alerts.filter(
    (a) => !a.resolved && a.userAction !== 'cancelled_by_user'
  )

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

            {/* Header Section */}
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
                  onClick={fetchAlerts}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
                {!user.isFrozen ? (
                  <button
                    type="button"
                    onClick={() => setShowFreezeConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">ac_unit</span> Emergency Freeze
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-red-100 text-red-800 border border-red-200 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">lock</span> Account Frozen
                  </span>
                )}
              </div>
            </section>

            {/* Freeze Feedback Banner */}
            {freezeMessage && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <span>{freezeMessage}</span>
              </div>
            )}

            {/* Account Protection Status Banner */}
            <section className={`rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
              user.isFrozen
                ? 'bg-red-50/70 border-red-300 text-red-900'
                : activeUnresolvedAlerts.length > 0
                  ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  user.isFrozen
                    ? 'bg-red-600 text-white'
                    : activeUnresolvedAlerts.length > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {user.isFrozen ? 'lock' : activeUnresolvedAlerts.length > 0 ? 'warning' : 'verified_user'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-base">
                    {user.isFrozen
                      ? 'Your Account is Currently Frozen'
                      : activeUnresolvedAlerts.length > 0
                        ? `${activeUnresolvedAlerts.length} Active Security Warning${activeUnresolvedAlerts.length > 1 ? 's' : ''}`
                        : 'Account Security Shield Active — All Clear'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {user.isFrozen
                      ? 'Transfers are locked for your security. Please reach out to Bank Admin to unfreeze.'
                      : activeUnresolvedAlerts.length > 0
                        ? 'Automated fraud detection rules flagged an unreviewed outgoing transfer.'
                        : 'All automated heuristics are active. No open security threats detected on your account.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user.isFrozen
                    ? 'bg-red-200 text-red-800'
                    : activeUnresolvedAlerts.length > 0
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {user.isFrozen ? 'Status: Frozen' : activeUnresolvedAlerts.length > 0 ? 'Warning Active' : 'Status: Protected'}
                </span>
              </div>
            </section>

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
                  <span className="text-3xl font-extrabold text-red-600 font-mono">
                    {cancelledCount}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                    <span className="material-symbols-outlined text-xl">block</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Overridden & Proceeded
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-amber-600 font-mono">
                    {overriddenCount}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter Tabs */}
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
                    ? 'bg-red-700 text-white'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                Cancelled by You ({cancelledCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('overridden')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === 'overridden'
                    ? 'bg-amber-700 text-white'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Proceeded Anyway ({overriddenCount})
              </button>
            </div>

            {/* Alerts Feed Section */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Loading fraud alerts and security logs...
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No Fraud Alerts Recorded
                  </h3>
                  <p className="text-sm text-gray-500 max-w-[440px] mx-auto mb-5 leading-relaxed">
                    Your transactions adhere to all safety thresholds. Any future unusual activity will be logged here.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/transfer')}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Transfer Money
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAlerts.map((alert) => (
                    <div key={alert._id} className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col gap-3">
                      {/* Top Row: Date, Severity, and Outcome Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                          <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                          <span>{formatDate(alert.detectedAt)}</span>
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
                          {alert.userAction === 'cancelled_by_user' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">cancel</span>
                              Cancelled by You
                            </span>
                          ) : alert.userAction === 'overridden_by_user' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Proceeded Anyway
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Transfer Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                            Target Recipient
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {alert.receiverName || 'Recipient'}
                          </span>
                          <span className="text-xs font-mono text-gray-500 ml-2">
                            ({alert.receiverPaymentId || 'N/A'})
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                            Amount Flagged
                          </span>
                          <span className="text-lg font-bold font-mono text-gray-900">
                            ₹{alert.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Emergency Freeze Modal */}
      {showFreezeConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isFreezing && setShowFreezeConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[460px] p-6 sm:p-8 text-center shadow-2xl border border-red-200 animate-fadeIn relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !isFreezing && setShowFreezeConfirm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-sm">
              <span className="material-symbols-outlined text-3xl">ac_unit</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Emergency Account Freeze</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-[400px] mx-auto">
              Are you sure you want to freeze your account? Outgoing money transfers will be locked immediately until an Administrator reviews and unfreezes your account.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFreezeConfirm(false)}
                disabled={isFreezing}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelfFreeze}
                disabled={isFreezing}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isFreezing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Freezing...</span>
                  </>
                ) : (
                  <span>Yes, Freeze Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
