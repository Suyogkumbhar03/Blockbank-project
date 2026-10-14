import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function AdminFraudMonitoringView() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'proceeded' | 'cancelled' | 'pending_review'
  const [reviewingId, setReviewingId] = useState(null)

  const fetchAlerts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const res = await api.get('/admin/fraud-alerts')
      if (Array.isArray(res.data)) {
        setAlerts(res.data)
      } else {
        setAlerts([])
      }
    } catch (err) {
      console.error('Failed to fetch fraud alerts:', err)
      setError(err.response?.data?.message || 'Failed to load fraud alerts.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleMarkReviewed = async (alertId) => {
    try {
      setReviewingId(alertId)
      await api.patch(`/admin/fraud-alerts/${alertId}/review`)
      // Update local state immediately
      setAlerts((prevAlerts) =>
        prevAlerts.map((item) =>
          item._id === alertId ? { ...item, reviewed: true } : item
        )
      )
    } catch (err) {
      console.error('Failed to mark alert as reviewed:', err)
      alert(err.response?.data?.message || 'Failed to mark alert as reviewed')
    } finally {
      setReviewingId(null)
    }
  }

  // Formatting date helper
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Summary counts
  const totalCount = alerts.length
  const cancelledCount = alerts.filter(
    (a) => a.userAction === 'cancelled' || a.userAction === 'cancelled_by_user'
  ).length
  const proceededCount = alerts.filter(
    (a) => a.userAction === 'proceeded' || a.userAction === 'overridden_by_user'
  ).length
  const pendingReviewCount = alerts.filter((a) => !a.reviewed).length

  // Filtered alerts
  const filteredAlerts = alerts.filter((alert) => {
    const isCancelled = alert.userAction === 'cancelled' || alert.userAction === 'cancelled_by_user'
    const isProceeded = alert.userAction === 'proceeded' || alert.userAction === 'overridden_by_user'

    if (filter === 'proceeded') return isProceeded
    if (filter === 'cancelled') return isCancelled
    if (filter === 'pending_review') return !alert.reviewed
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface">Fraud Monitoring</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Monitoring
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time surveillance of flagged transactions, customer overrides, and fraud rule evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchAlerts()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Top summary cards — 4 cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fraud Alerts */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Fraud Alerts (all time)
            </span>
            <span className="material-symbols-outlined text-[20px] text-primary">
              security
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface font-mono">
            {totalCount}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            All flagged transfers recorded
          </p>
        </div>

        {/* Card 2: Cancelled by User */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Cancelled by User
            </span>
            <span className="material-symbols-outlined text-[20px] text-emerald-600">
              cancel
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">
            {cancelledCount}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            User saw warning and stopped
          </p>
        </div>

        {/* Card 3: Proceeded Anyway — show this count in red */}
        <div className="bg-surface-container-lowest border border-red-200 bg-red-50/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Proceeded Anyway
            </span>
            <span className="material-symbols-outlined text-[20px] text-red-600">
              warning
            </span>
          </div>
          <div className="text-3xl font-extrabold text-red-600 font-mono">
            {proceededCount}
          </div>
          <p className="text-xs text-red-600/80 mt-1 font-medium">
            User saw warning and continued
          </p>
        </div>

        {/* Card 4: Pending Review */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Pending Review
            </span>
            <span className="material-symbols-outlined text-[20px] text-amber-600">
              pending_actions
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 font-mono">
            {pendingReviewCount}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Alerts where reviewed is false
          </p>
        </div>
      </div>

      {/* Filter tabs below the cards */}
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/60 pb-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          All Alerts ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('proceeded')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'proceeded'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-red-700 hover:bg-red-50'
          }`}
        >
          Proceeded Anyway ({proceededCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'cancelled'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Cancelled ({cancelledCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending_review')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'pending_review'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-amber-700 hover:bg-amber-50'
          }`}
        >
          Pending Review ({pendingReviewCount})
        </button>
      </div>

      {/* Main Content Area: Table or Empty state */}
      {loading && alerts.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-16 text-center shadow-sm">
          <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-on-surface-variant">Loading fraud alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        /* No data state: If no fraud alerts exist, show: “No fraud alerts recorded yet. The system is actively monitoring all transactions.” */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
            <span className="material-symbols-outlined text-[32px]">verified_user</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">
            All Clear
          </h3>
          <p className="text-sm text-on-surface-variant max-w-[480px] mx-auto leading-relaxed">
            No fraud alerts recorded yet. The system is actively monitoring all transactions.
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">filter_alt_off</span>
          </div>
          <h3 className="text-base font-bold text-on-surface mb-1">No matching alerts</h3>
          <p className="text-xs text-on-surface-variant">No alerts match the selected filter tab.</p>
        </div>
      ) : (
        /* Alert table — one row per alert */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">User Name + Payment ID</th>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Receiver Payment ID</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Triggered Rules</th>
                  <th className="py-3.5 px-4">User Action</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filteredAlerts.map((alert) => {
                  const isProceeded =
                    alert.userAction === 'proceeded' || alert.userAction === 'overridden_by_user'
                  const isCancelled =
                    alert.userAction === 'cancelled' || alert.userAction === 'cancelled_by_user'
                  const isReviewed = Boolean(alert.reviewed)
                  const isCurrentlyReviewing = reviewingId === alert._id

                  return (
                    <tr
                      key={alert._id}
                      className={`transition-colors ${
                        isProceeded
                          ? 'border-l-4 border-l-red-500 bg-red-50/35 hover:bg-red-50/60'
                          : 'hover:bg-surface-container-low/40'
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-on-surface-variant text-[11.5px]">
                        {formatDateTime(alert.createdAt || alert.detectedAt)}
                      </td>

                      {/* User Name + Payment ID */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-on-surface text-sm">
                          {alert.userName || 'Unknown User'}
                        </div>
                        <div className="font-mono text-on-surface-variant text-[11px]">
                          {alert.senderPaymentId || 'N/A'}
                        </div>
                      </td>

                      {/* Transaction ID */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono font-semibold text-on-surface">
                        {alert.transactionId || '—'}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono font-bold text-on-surface text-sm">
                        ₹{Number(alert.amount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Receiver Payment ID */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-on-surface-variant text-[11.5px]">
                        {alert.receiverPaymentId || '—'}
                      </td>

                      {/* Triggered Rules — show each rule as a small badge */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[340px]">
                          {(alert.triggeredRules && alert.triggeredRules.length > 0
                            ? alert.triggeredRules
                            : ['Suspicious transfer pattern']
                          ).map((rule, rIdx) => (
                            <span
                              key={rIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80 leading-tight"
                            >
                              <span className="material-symbols-outlined text-[13px] text-amber-600 shrink-0">
                                warning
                              </span>
                              <span>{rule}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* User Action — show “Cancelled” in green badge or “Proceeded Anyway” in red badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            Cancelled
                          </span>
                        ) : isProceeded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <span className="material-symbols-outlined text-[14px]">report</span>
                            Proceeded Anyway
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Status — show “Pending Review” in orange or “Reviewed” in grey */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {!isReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Reviewed
                          </span>
                        )}
                      </td>

                      {/* Action button — “Mark as Reviewed” button, disabled and greyed out if already reviewed */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        {isReviewed ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                            title="This alert has already been reviewed"
                          >
                            Mark as Reviewed
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkReviewed(alert._id)}
                            disabled={isCurrentlyReviewing}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            {isCurrentlyReviewing ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[15px]">done</span>
                                <span>Mark as Reviewed</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
