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

  // Reports state (Part 2)
  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportSuccessMessage, setReportSuccessMessage] = useState('')

  // Report modal form fields
  const [formIssueType, setFormIssueType] = useState('Unauthorized Transfer')
  const [formTxId, setFormTxId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

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

  // Fetch user's submitted reports
  const fetchMyReports = async () => {
    try {
      setLoadingReports(true)
      const res = await api.get('/report/my-reports')
      if (Array.isArray(res.data)) {
        setReports(res.data)
      } else {
        setReports([])
      }
    } catch (err) {
      console.error('Failed to fetch my reports', err)
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    fetchMyReports()
  }, [])

  // Submit report handler
  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault()
    setFormError('')

    if (!formIssueType) {
      setFormError('Please select an issue type.')
      return
    }

    if (!formDescription || formDescription.trim().length < 20) {
      setFormError('Please describe what happened with at least 20 characters.')
      return
    }

    try {
      setIsSubmittingReport(true)
      const res = await api.post('/report/submit', {
        issueType: formIssueType,
        transactionId: formTxId.trim(),
        description: formDescription.trim(),
      })

      setShowReportModal(false)
      setFormIssueType('Unauthorized Transfer')
      setFormTxId('')
      setFormDescription('')
      setReportSuccessMessage(
        `Your report has been submitted successfully. Report ID: ${res.data?.reportId || 'RPT-XXXXX'}. Our team will review your account shortly.`
      )

      await fetchMyReports()
    } catch (err) {
      console.error('Failed to submit report:', err)
      setFormError(err.response?.data?.message || 'Failed to submit report. Please try again.')
    } finally {
      setIsSubmittingReport(false)
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
                    fetchMyReports()
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>

                {/* Orange/Yellow outline button placed where Emergency Freeze was removed */}
                <button
                  type="button"
                  onClick={() => {
                    setFormError('')
                    setShowReportModal(true)
                  }}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">campaign</span> Report Suspicious Activity
                </button>
              </div>
            </section>

            {/* Feedback message when report is submitted */}
            {reportSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">check_circle</span>
                  <span className="font-medium">{reportSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReportSuccessMessage('')}
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-bold p-1 rounded-md"
                >
                  ✕
                </button>
              </div>
            )}

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

            {/* PART 2: “My Reports” section below the fraud alerts on the user’s Fraud Alerts page */}
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
                  <h3 className="text-lg font-bold text-gray-900">My Submitted Reports</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                  {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                </span>
              </div>

              {loadingReports ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  Loading your submitted reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center">
                  <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">assignment_late</span>
                  <p className="text-sm font-medium text-gray-600 max-w-[480px]">
                    You have not submitted any reports. If you notice suspicious activity, use the button above to report it.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {reports.map((report) => {
                    const isOpen = report.status === 'Open'
                    const isInvestigating = report.status === 'Under Investigation'
                    const isResolved = report.status === 'Resolved'

                    return (
                      <div
                        key={report._id || report.reportId}
                        className="p-5 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-all shadow-xs flex flex-col gap-3"
                      >
                        {/* Report Header: Report ID, Date, and Status Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div>
                            <div className="text-sm font-bold font-mono text-gray-900">
                              {report.reportId}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Submitted on {formatDate(report.createdAt)}
                            </div>
                          </div>

                          <div>
                            {isOpen && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                Open
                              </span>
                            )}
                            {isInvestigating && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                Under Investigation
                              </span>
                            )}
                            {isResolved && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Resolved
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Report Body: Issue Type, Tx ID, Description */}
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                              Issue Type:
                            </span>
                            <span className="text-sm font-semibold text-gray-800">
                              {report.issueType}
                            </span>
                          </div>

                          {report.transactionId && (
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                                Transaction ID:
                              </span>
                              <span className="font-mono font-semibold text-gray-700">
                                {report.transactionId}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                              Description:
                            </span>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1">
                              {report.description}
                            </p>
                          </div>
                        </div>

                        {/* If status is “Resolved” and admin wrote a note — show the note in a green info box */}
                        {isResolved && report.adminNote && (
                          <div className="mt-1 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">
                              support_agent
                            </span>
                            <div>
                              <span className="font-bold block mb-0.5 text-emerald-950">
                                Bank Response:
                              </span>
                              <p className="leading-relaxed whitespace-pre-wrap">{report.adminNote}</p>
                              {report.resolvedAt && (
                                <span className="text-[11px] text-emerald-700 mt-1 block">
                                  Resolved on {formatDate(report.resolvedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

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

      {/* Modal Form: Report Suspicious Activity */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !isSubmittingReport && setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[540px] p-6 sm:p-7 shadow-2xl border border-gray-200 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => !isSubmittingReport && setShowReportModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <span className="material-symbols-outlined text-2xl">campaign</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report Suspicious Activity</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submit an account security report to our investigations team.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="space-y-4">
              {/* Field 1 — Issue Type (dropdown, required) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Issue Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formIssueType}
                  onChange={(e) => setFormIssueType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  required
                >
                  <option value="Unauthorized Transfer">
                    Unauthorized Transfer — Someone transferred money without my permission
                  </option>
                  <option value="Suspicious Login">
                    Suspicious Login — I think someone accessed my account
                  </option>
                  <option value="Wrong Transaction">
                    Wrong Transaction — A transaction is showing incorrectly
                  </option>
                  <option value="Other">
                    Other — Something else is wrong
                  </option>
                </select>
              </div>

              {/* Field 2 — Transaction ID (text input, optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Transaction ID (if this is about a specific transaction)
                </label>
                <input
                  type="text"
                  value={formTxId}
                  onChange={(e) => setFormTxId(e.target.value)}
                  placeholder="e.g. TX-ABC123 — leave blank if not applicable"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Field 3 — Description (textarea, required) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Describe what happened <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-medium ${
                    formDescription.trim().length >= 20 ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {formDescription.trim().length}/20 chars min
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Please describe the suspicious activity in as much detail as possible."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  disabled={isSubmittingReport}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || formDescription.trim().length < 20}
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingReport ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
