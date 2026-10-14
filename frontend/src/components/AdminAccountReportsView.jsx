import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function AdminAccountReportsView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'Open' | 'Under Investigation' | 'Resolved'
  const [updatingId, setUpdatingId] = useState(null)

  // Local editing state for admin response per report card: { [reportId]: { status, adminNote } }
  const [formState, setFormState] = useState({})

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const res = await api.get('/admin/reports')
      const data = Array.isArray(res.data) ? res.data : []
      setReports(data)

      // Initialize form state
      const initialForm = {}
      data.forEach((r) => {
        initialForm[r.reportId] = {
          status: r.status || 'Open',
          adminNote: r.adminNote || '',
        }
      })
      setFormState(initialForm)
    } catch (err) {
      console.error('Failed to fetch admin reports:', err)
      setError(err.response?.data?.message || 'Failed to load account reports.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleFieldChange = (reportId, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || { status: 'Open', adminNote: '' }),
        [field]: value,
      },
    }))
  }

  const handleUpdateReport = async (reportId) => {
    const currentState = formState[reportId] || {}
    try {
      setUpdatingId(reportId)
      const res = await api.patch(`/admin/reports/${reportId}/status`, {
        status: currentState.status,
        adminNote: currentState.adminNote,
      })

      if (res.data?.success && res.data.report) {
        setReports((prev) =>
          prev.map((r) =>
            r.reportId === reportId
              ? {
                  ...r,
                  status: res.data.report.status,
                  adminNote: res.data.report.adminNote,
                  resolvedAt: res.data.report.resolvedAt,
                }
              : r
          )
        )
      } else {
        await fetchReports(true)
      }
    } catch (err) {
      console.error('Failed to update report status:', err)
      alert(err.response?.data?.message || 'Failed to update report status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (dateStr) => {
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
  const totalCount = reports.length
  const openCount = reports.filter((r) => r.status === 'Open').length
  const investigatingCount = reports.filter((r) => r.status === 'Under Investigation').length
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length

  // Filtered reports
  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true
    return report.status === filter
  })

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface">Account Reports</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="material-symbols-outlined text-[15px]">support_agent</span>
              Customer Support & Security Case Desk
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Review user-submitted incident reports, cross-examine account activity, and provide formal bank resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchReports()}
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

      {/* Top summary — 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Reports Received */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Reports Received
            </span>
            <span className="material-symbols-outlined text-[20px] text-primary">
              assignment
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface font-mono">
            {totalCount}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            All user-submitted reports
          </p>
        </div>

        {/* Card 2: Under Investigation (orange number) */}
        <div className="bg-surface-container-lowest border border-amber-200 bg-amber-50/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Under Investigation
            </span>
            <span className="material-symbols-outlined text-[20px] text-amber-600">
              pending_actions
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 font-mono">
            {investigatingCount}
          </div>
          <p className="text-xs text-amber-700/80 mt-1 font-medium">
            Cases actively being researched
          </p>
        </div>

        {/* Card 3: Resolved (green number) */}
        <div className="bg-surface-container-lowest border border-emerald-200 bg-emerald-50/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Resolved
            </span>
            <span className="material-symbols-outlined text-[20px] text-emerald-600">
              task_alt
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">
            {resolvedCount}
          </div>
          <p className="text-xs text-emerald-700/80 mt-1 font-medium">
            Cases closed with resolution note
          </p>
        </div>
      </div>

      {/* Filter tabs */}
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
          All Reports ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('Open')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'Open'
              ? 'bg-gray-800 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-gray-700 hover:bg-gray-100'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('Under Investigation')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'Under Investigation'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-amber-700 hover:bg-amber-50'
          }`}
        >
          Under Investigation ({investigatingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('Resolved')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === 'Resolved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-surface-container-lowest border border-outline-variant text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Reports Feed or No reports state */}
      {loading && reports.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-16 text-center shadow-sm">
          <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-on-surface-variant">Loading account reports...</p>
        </div>
      ) : reports.length === 0 ? (
        /* No reports state: If no reports exist — show: “No account reports submitted yet. Reports submitted by users will appear here.” */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">assignment</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No Reports Found</h3>
          <p className="text-sm text-on-surface-variant max-w-[480px] mx-auto leading-relaxed">
            No account reports submitted yet. Reports submitted by users will appear here.
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">filter_alt_off</span>
          </div>
          <h3 className="text-base font-bold text-on-surface mb-1">No matching reports</h3>
          <p className="text-xs text-on-surface-variant">No reports match the selected filter tab.</p>
        </div>
      ) : (
        /* Report cards — one card per report */
        <div className="space-y-6">
          {filteredReports.map((report) => {
            const isResolved = report.status === 'Resolved'
            const isInvestigating = report.status === 'Under Investigation'
            const isOpen = report.status === 'Open'
            const currentForm = formState[report.reportId] || {
              status: report.status || 'Open',
              adminNote: report.adminNote || '',
            }
            const isCurrentlyUpdating = updatingId === report.reportId

            return (
              <div
                key={report.reportId || report._id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* 1. Header of card */}
                <div className="p-5 sm:p-6 bg-surface-container-low/40 border-b border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-xl">assignment</span>
                      <span className="text-base font-bold font-mono text-on-surface">
                        {report.reportId}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1.5 font-mono">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>Submitted: {formatDate(report.createdAt)}</span>
                      {isResolved && report.resolvedAt && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">
                            Resolved: {formatDate(report.resolvedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge on the right: Open = grey, Under Investigation = orange, Resolved = green */}
                  <div>
                    {isOpen && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                        Open
                      </span>
                    )}
                    {isInvestigating && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                        Under Investigation
                      </span>
                    )}
                    {isResolved && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* 2. User Details Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs">
                    <div>
                      <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                        User Full Name
                      </span>
                      <span className="font-bold text-on-surface text-sm block">
                        {report.userName || report.userId?.name || 'User'}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                        Payment ID
                      </span>
                      <span className="font-mono font-semibold text-on-surface text-xs block">
                        {report.userPaymentId || report.userId?.paymentId || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                        Email Address
                      </span>
                      <span className="font-mono text-on-surface-variant text-xs block truncate">
                        {report.userEmail || report.userId?.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* 3. Issue Details Section */}
                  <div className="p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/40 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[11px]">
                          Issue Type:
                        </span>
                        <span className="font-bold text-on-surface text-sm">
                          {report.issueType}
                        </span>
                      </div>

                      {/* Transaction ID if provided — show as reference */}
                      {report.transactionId && (
                        <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-primary font-semibold">
                          <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                          <span>Transaction ID: {report.transactionId}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px] block mb-1">
                        Reported Description:
                      </span>
                      <p className="text-on-surface text-xs leading-relaxed whitespace-pre-wrap bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/50">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  {/* 4. User’s Recent Transactions Section inside the card */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        Recent Account Activity
                      </h4>
                    </div>

                    {report.recentTransactions && report.recentTransactions.length > 0 ? (
                      <div className="overflow-x-auto border border-outline-variant/50 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-surface-container-low text-[10.5px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40">
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Amount</th>
                              <th className="py-2 px-3">Receiver Payment ID</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {report.recentTransactions.map((tx) => (
                              <tr key={tx._id || tx.transactionId} className="hover:bg-surface-container-low/30">
                                <td className="py-2 px-3 font-mono text-[11px] text-on-surface-variant">
                                  {formatDate(tx.timestamp || tx.createdAt)}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-on-surface">
                                  ₹{Number(tx.amount || 0).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-on-surface-variant">
                                  {tx.receiverPaymentId || 'N/A'}
                                </td>
                                <td className="py-2 px-3">
                                  {tx.status === 'cancelled' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                      Cancelled
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Success
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface-variant text-center">
                        No recent transactions found on this account.
                      </div>
                    )}
                  </div>

                  {/* 5. User’s Fraud Alerts Section inside the card */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">gpp_maybe</span>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        Fraud Alert History
                      </h4>
                    </div>

                    {report.userFraudAlerts && report.userFraudAlerts.length > 0 ? (
                      <div className="space-y-2">
                        {report.userFraudAlerts.map((fa) => (
                          <div
                            key={fa._id}
                            className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-amber-900 font-semibold">
                                  {formatDate(fa.detectedAt || fa.createdAt)}
                                </span>
                                <span className="font-bold text-amber-950">
                                  ₹{Number(fa.amount || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-amber-800">
                                  to {fa.receiverPaymentId || 'Recipient'}
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-900/90 mt-1">
                                {(fa.triggeredRules && fa.triggeredRules.length > 0)
                                  ? fa.triggeredRules.join(' • ')
                                  : fa.message}
                              </div>
                            </div>
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  fa.userAction === 'proceeded' || fa.userAction === 'overridden_by_user'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {fa.userAction === 'proceeded' || fa.userAction === 'overridden_by_user'
                                  ? 'Proceeded Anyway'
                                  : 'Cancelled'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface-variant text-center">
                        No fraud alerts on this account.
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Admin Action Section at the bottom of each card */}
                <div className="p-5 sm:p-6 bg-surface-container-low/50 border-t border-outline-variant/60">
                  {isResolved ? (
                    /* If already resolved — show the resolved date and the admin note that was written. Disable the action section. */
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                          Report Resolved
                        </span>
                        {report.resolvedAt && (
                          <span className="text-[11px] font-mono text-emerald-700">
                            Closed on {formatDate(report.resolvedAt)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold block text-emerald-950 mb-0.5">Admin Response:</span>
                        <p className="whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-emerald-200/60 leading-relaxed text-emerald-900">
                          {report.adminNote || 'Case investigated and closed by Bank Administrator.'}
                        </p>
                      </div>
                      <div className="pt-1 text-[11px] text-emerald-700 italic">
                        This report is completed and archived. Action controls are disabled.
                      </div>
                    </div>
                  ) : (
                    /* Active Admin Action Form */
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
                          Admin Investigation & Resolution Action
                        </h4>

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-on-surface-variant">Status:</label>
                          <select
                            value={currentForm.status}
                            onChange={(e) => handleFieldChange(report.reportId, 'status', e.target.value)}
                            disabled={isCurrentlyUpdating}
                            className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="Open">Open</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      </div>

                      {/* Text area for admin note */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                          Admin Response (shown to user when resolved)
                        </label>
                        <textarea
                          rows={3}
                          value={currentForm.adminNote}
                          onChange={(e) => handleFieldChange(report.reportId, 'adminNote', e.target.value)}
                          placeholder="Write your findings and resolution here..."
                          disabled={isCurrentlyUpdating}
                          className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      </div>

                      {/* Button: “Update Report” */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleUpdateReport(report.reportId)}
                          disabled={isCurrentlyUpdating}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isCurrentlyUpdating ? (
                            <>
                              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">save</span>
                              <span>Update Report</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
