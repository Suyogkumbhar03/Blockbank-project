import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import AdminProfileView from '../components/AdminProfileView'
import AdminTransactionsView from '../components/AdminTransactionsView'
import TransactionVolumeChart from '../components/TransactionVolumeChart'
import NotificationBell from '../components/NotificationBell'
import { generateReport } from '../utils/generateReport.jsx'
import PaymentBlockchainFlow from '../components/blockchain/PaymentBlockchainFlow'

function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'dashboard'
  })

  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    localStorage.setItem('adminActiveTab', tab)
  }
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [rejectedUsers, setRejectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')
  const [chartPeriod, setChartPeriod] = useState('1D')

  // Blockchain audit ledger state
  const [chain, setChain] = useState([])
  const [validationResult, setValidationResult] = useState({ valid: true })
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [isValidating, setIsValidating] = useState(false)

  // Payment Blockchain state
  const [explorerSubTab, setExplorerSubTab] = useState('admin') // 'admin' | 'payments'
  const [paymentViewTab, setPaymentViewTab] = useState('table') // 'table' | 'visual'
  const [paymentChain, setPaymentChain] = useState([])
  const [loadingPaymentChain, setLoadingPaymentChain] = useState(false)

  // Payment Blockchain Validation & Polling States
  const [paymentValidationStatus, setPaymentValidationStatus] = useState('not_run') // 'not_run' | 'valid' | 'warning' | 'invalid'
  const [paymentValidationResults, setPaymentValidationResults] = useState(null)
  const [paymentValidationSummary, setPaymentValidationSummary] = useState(null)
  const [isValidatingPaymentChain, setIsValidatingPaymentChain] = useState(false)
  const [newBlockToast, setNewBlockToast] = useState(null)
  const lastPaymentBlockCountRef = useRef(null)

  // Approve Users sub-tab state
  const [approveSubTab, setApproveSubTab] = useState('pending') // 'pending' | 'rejected'

  useEffect(() => {
    const loadAdminName = () => {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const u = JSON.parse(userStr)
          if (u && u.name) {
            setAdminName(u.name)
          }
        }
      } catch (e) {
        console.error('Failed to parse user in AdminDashboard', e)
      }
    }

    loadAdminName()

    window.addEventListener('profileUpdated', loadAdminName)
    window.addEventListener('storage', loadAdminName)
    return () => {
      window.removeEventListener('profileUpdated', loadAdminName)
      window.removeEventListener('storage', loadAdminName)
    }
  }, [])

  const fetchUsers = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        api.get('/admin/pending-users'),
        api.get('/admin/approved-users'),
        api.get('/admin/rejected-users'),
      ])
      setPendingUsers(pendingRes.data || [])
      setApprovedUsers(approvedRes.data || [])
      setRejectedUsers(rejectedRes.data || [])
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const fetchBlockchainData = useCallback(async () => {
    try {
      setIsValidating(true)
      const [chainRes, validateRes] = await Promise.all([
        api.get('/admin/blockchain/chain'),
        api.get('/admin/blockchain/validate'),
      ])
      setChain(chainRes.data || [])
      setValidationResult(validateRes.data || { valid: true })
    } catch (error) {
      console.error('Failed to fetch blockchain data', error)
    } finally {
      setIsValidating(false)
    }
  }, [])

  const fetchFraudAlerts = useCallback(async () => {
    try {
      const alertsRes = await api.get('/admin/blockchain/fraud-alerts')
      setFraudAlerts(alertsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch fraud alerts', error)
    }
  }, [])

  const fetchPaymentBlockchainData = useCallback(async () => {
    try {
      setLoadingPaymentChain(true)
      const res = await api.get('/admin/payment-blockchain/blocks')
      const blocks = res.data || []
      setPaymentChain(blocks)
      if (lastPaymentBlockCountRef.current === null) {
        lastPaymentBlockCountRef.current = blocks.length
      }
    } catch (error) {
      console.error('Failed to fetch payment blockchain data', error)
    } finally {
      setLoadingPaymentChain(false)
    }
  }, [])

  // Requirement 1 & 4: Poll every 10 seconds for new payment blocks & show green toast
  useEffect(() => {
    let isMounted = true

    const pollPaymentBlocks = async () => {
      try {
        const res = await api.get('/admin/payment-blockchain/blocks')
        const blocks = res.data || []

        if (!isMounted) return

        if (lastPaymentBlockCountRef.current !== null && blocks.length > lastPaymentBlockCountRef.current) {
          const newestBlock = blocks[blocks.length - 1]
          const amount = (newestBlock.amount || 0).toLocaleString('en-IN')
          const sender = newestBlock.senderName || 'Sender'
          const receiver = newestBlock.receiverName || 'Receiver'
          const toastMsg = `New block added — Block #${newestBlock.index} — ₹${amount} from ${sender} to ${receiver}`

          // Show green toast notification
          setNewBlockToast({
            id: Date.now(),
            message: toastMsg
          })

          // Automatically update blocks list on admin side without page refresh
          setPaymentChain(blocks)

          // Requirement 4: Reset validation state to "not run yet" and neutral grey banner
          setPaymentValidationStatus('not_run')
          setPaymentValidationResults(null)
          setPaymentValidationSummary(null)
        } else if (lastPaymentBlockCountRef.current === null) {
          setPaymentChain(blocks)
        }

        lastPaymentBlockCountRef.current = blocks.length
      } catch (err) {
        // Silently catch polling error
      }
    }

    // Run poll every 10 seconds
    const interval = setInterval(pollPaymentBlocks, 10000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Auto-dismiss block toast after 6 seconds
  useEffect(() => {
    if (newBlockToast) {
      const timer = setTimeout(() => {
        setNewBlockToast(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [newBlockToast])

  // Enhanced Blockchain validation handler
  const handleValidatePaymentChain = async () => {
    try {
      setIsValidatingPaymentChain(true)
      const res = await api.get('/admin/payment-blockchain/validate')
      const data = res.data || {}
      const results = data.results || []
      setPaymentValidationResults(results)
      setPaymentValidationSummary(data)

      const hasCritical = results.some((r) => r.severity === 'CRITICAL') || (data.critical && data.critical > 0)
      const hasWarning = results.some((r) => r.severity === 'WARNING') || (data.warnings && data.warnings > 0)
      const hasOrphans = (data.orphanCount && data.orphanCount > 0)

      if (hasCritical || data.valid === false) {
        setPaymentValidationStatus('invalid')
      } else if (hasWarning || hasOrphans) {
        setPaymentValidationStatus('warning')
      } else {
        setPaymentValidationStatus('valid')
      }
    } catch (error) {
      console.error('Failed to validate payment blockchain', error)
      alert('Failed to validate payment blockchain. Please try again.')
    } finally {
      setIsValidatingPaymentChain(false)
    }
  }

  const formatBlockTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  }

  // Initial fetch + re-fetch when tab changes
  useEffect(() => {
    fetchUsers()
    if (activeTab === 'explorer') {
      fetchBlockchainData()
      fetchPaymentBlockchainData()
    }
  }, [fetchUsers, fetchBlockchainData, fetchPaymentBlockchainData, activeTab])

  // Poll every 5 seconds silently to pick up changes from other browsers/sessions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers(true)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchUsers])

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/approve/${id}`, { initialBalance: 100 })
      await fetchUsers()
      await fetchBlockchainData()
      alert('User approved successfully')
    } catch (error) {
      console.error('Failed to approve user', error)
    }
  }

  const handleReject = async (id) => {
    try {
      await api.put(`/admin/reject/${id}`)
      await fetchUsers()
      await fetchBlockchainData()
      alert('User rejected')
    } catch (error) {
      console.error('Failed to reject user', error)
    }
  }

  const handleToggleFreeze = async (user) => {
    const actionName = user.isFrozen ? 'unfreeze' : 'freeze'
    if (!window.confirm(`Are you sure you want to ${actionName} account for "${user.name}"?`)) {
      return
    }
    try {
      const endpoint = user.isFrozen ? `/admin/unfreeze/${user._id || user.id}` : `/admin/freeze/${user._id || user.id}`
      const res = await api.put(endpoint)
      await fetchUsers()
      await fetchBlockchainData()
      alert(res.data?.message || `User ${actionName}d successfully`)
    } catch (error) {
      console.error(`Failed to ${actionName} user`, error)
      alert(error.response?.data?.message || `Failed to ${actionName} user`)
    }
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete account for "${user.name}"? This action cannot be undone and will remove the account from the database.`)) {
      return
    }
    try {
      const res = await api.delete(`/admin/users/${user._id || user.id}`)
      await fetchUsers()
      alert(res.data?.message || 'User deleted permanently from database')
    } catch (error) {
      console.error('Failed to delete user', error)
      alert(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true)
      setReportError('')

      const txRes = await api.get('/admin/all-transactions')
      const allTransactions = Array.isArray(txRes.data) ? txRes.data : []

      await generateReport({
        adminName,
        approvedUsers,
        pendingUsers,
        rejectedUsers,
        totalUsers: approvedUsers.length + pendingUsers.length + rejectedUsers.length,
        allTransactions,
        chartPeriod
      })
    } catch (error) {
      console.error('Failed to generate system report', error)
      setReportError(
        error.response?.data?.message ||
        error.message ||
        'Failed to generate system report. Please try again.'
      )
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const latestBlockIndex = chain.length > 0 ? chain[chain.length - 1].index : 0

  return (
    <div className="min-h-screen bg-surface-container-lowest font-sans text-on-surface flex">
      {/* Shared Admin Sidebar */}
      <Sidebar role="admin" activeTab={activeTab} setActiveTab={setActiveTab} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-surface-variant flex items-center justify-between px-4 lg:px-8 bg-surface-container-lowest sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            {/* Hamburger Button for Mobile & Tablet */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 shadow-xs text-xs font-bold transition-all active:scale-95"
              title="Open Navigation Menu"
            >
              <span className="material-symbols-outlined text-xl text-primary">menu</span>
              <span>Menu</span>
            </button>

            <div className="relative w-full max-w-[180px] sm:max-w-xs md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-surface-container pl-10 pr-4 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <NotificationBell />
            <div className="h-6 w-px bg-surface-variant"></div>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 cursor-pointer text-on-surface hover:opacity-80 transition-opacity focus:outline-none"
            >
              <span className="text-sm font-medium">{adminName}</span>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-outline-variant">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 flex-1 overflow-auto bg-surface">
          {(activeTab === 'profile' || activeTab === 'admin' || activeTab === 'settings') && <AdminProfileView />}
          {activeTab === 'dashboard' && (
            <>
              {/* Page Title */}
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Admin Dashboard
                  </h1>
                  <p className="text-on-surface-variant">
                    Real-time overview of network health and security protocols.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-md text-sm font-medium hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>Generate Report</span>
                      </>
                    )}
                  </button>
                  {reportError && (
                    <span className="text-xs text-error font-medium">{reportError}</span>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Pending Accounts
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant">
                      person_add
                    </span>
                  </div>
                  <div>
                    <div className="text-[40px] font-bold text-on-surface leading-none mb-3">
                      {pendingUsers.length}
                    </div>
                    <div className="flex items-center gap-1 text-tertiary">
                      <span className="material-symbols-outlined text-[16px]">trending_down</span>
                      <span className="text-xs font-medium">Waiting for approval</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Approved Accounts
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant">
                      account_balance
                    </span>
                  </div>
                  <div>
                    <div className="text-[40px] font-bold text-on-surface leading-none mb-3">
                      {approvedUsers.length}
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      <span className="text-xs font-medium">Active users</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Active Fraud Alerts
                    </span>
                    <span className="material-symbols-outlined text-amber-500">warning</span>
                  </div>
                  <div>
                    <div className="text-[36px] font-bold text-on-surface leading-none mb-3">
                      — —
                    </div>
                    <span className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-md text-xs font-semibold tracking-wider">
                      Under Construction
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Blockchain Status
                    </span>
                    <span className="material-symbols-outlined text-amber-500">construction</span>
                  </div>
                  <div>
                    <div className="text-[36px] font-bold text-on-surface leading-none mb-3">
                      — —
                    </div>
                    <span className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-md text-xs font-semibold tracking-wider">
                      Under Construction
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TransactionVolumeChart period={chartPeriod} onChangePeriod={setChartPeriod} />
                </div>

                {/* Quick Actions */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-on-surface mb-6">Quick Actions</h2>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setActiveTab('approve-users')}
                      className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg hover:bg-surface-container-lowest hover:border-primary transition-all group text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded bg-[#1e293b] text-white flex items-center justify-center group-hover:bg-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">person_check</span>
                      </div>
                      <span className="font-medium text-sm text-on-surface">Approve Users</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('freeze-accounts')}
                      className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg hover:bg-[#fff5f5] hover:border-error transition-all group text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded bg-[#fee2e2] text-error flex items-center justify-center group-hover:bg-error group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">ac_unit</span>
                      </div>
                      <span className="font-medium text-sm text-on-surface">Freeze Accounts</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'accounts' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Accounts
                  </h1>
                  <p className="text-on-surface-variant">List of all active and approved user accounts.</p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant">
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Name</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Email</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Account No</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Payment ID</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Balance</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedUsers.length > 0 ? (
                      approvedUsers.map((user) => (
                        <tr
                          key={user._id || user.id}
                          className="border-b border-outline-variant hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-4 px-6 text-sm font-medium">{user.name}</td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant">{user.email}</td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                            {user.accountNumber || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                            {user.paymentId || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-primary font-mono">
                            ₹{(user.balance || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {user.isFrozen ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-semibold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                Frozen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-on-surface-variant text-sm">
                          No approved accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'freeze-accounts' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Freeze Accounts
                  </h1>
                  <p className="text-on-surface-variant">
                    Manage account statuses, freeze transaction access, or delete accounts permanently.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant">
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Name</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Email</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Account No</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Payment ID</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Balance</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Status</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedUsers.length > 0 ? (
                      approvedUsers.map((user) => (
                        <tr
                          key={user._id || user.id}
                          className="border-b border-outline-variant hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-4 px-6 text-sm font-medium">{user.name}</td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant">{user.email}</td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                            {user.accountNumber || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                            {user.paymentId || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-primary font-mono">
                            ₹{(user.balance || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {user.isFrozen ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-semibold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                Frozen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-sm text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleFreeze(user)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 ${user.isFrozen
                                ? 'bg-primary text-on-primary border-primary hover:bg-primary/90'
                                : 'bg-surface-container-high text-on-surface border-outline-variant hover:bg-surface-container'
                                }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {user.isFrozen ? 'lock_open' : 'ac_unit'}
                              </span>
                              {user.isFrozen ? 'Unfreeze' : 'Freeze'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="px-3 py-1.5 bg-error text-white rounded text-xs font-semibold hover:bg-error/90 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-on-surface-variant text-sm">
                          No approved accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'approve-users' || activeTab === 'rejected-users') && (
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Approve Users & Management
                  </h1>
                  <p className="text-on-surface-variant">
                    Review pending user registration requests and view rejected registrations.
                  </p>
                </div>

                {/* Sub-tabs Navigation */}
                <div className="flex items-center gap-2 bg-surface-container border border-outline-variant p-1 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setApproveSubTab('pending')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      approveSubTab === 'pending'
                        ? 'bg-surface-container-lowest text-on-surface border border-outline-variant shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">person_check</span>
                    <span>Pending Approvals</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      approveSubTab === 'pending'
                        ? 'bg-amber-500/20 text-amber-700'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {pendingUsers.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApproveSubTab('rejected')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      approveSubTab === 'rejected'
                        ? 'bg-surface-container-lowest text-on-surface border border-outline-variant shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">person_cancel</span>
                    <span>Rejected Users</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      approveSubTab === 'rejected'
                        ? 'bg-red-500/20 text-red-700'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {rejectedUsers.length}
                    </span>
                  </button>
                </div>
              </div>

              {approveSubTab === 'pending' ? (
                /* Pending Users Table */
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant">
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Name</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Email</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Phone</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.length > 0 ? (
                        pendingUsers.map((user) => (
                          <tr
                            key={user._id || user.id}
                            className="border-b border-outline-variant hover:bg-surface-container-low transition-colors"
                          >
                            <td className="py-4 px-6 text-sm font-medium">{user.name}</td>
                            <td className="py-4 px-6 text-sm text-on-surface-variant">{user.email}</td>
                            <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                              {user.phone || 'N/A'}
                            </td>
                            <td className="py-4 px-6 text-sm text-right space-x-2">
                              <button
                                onClick={() => handleApprove(user._id || user.id)}
                                className="px-3 py-1.5 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(user._id || user.id)}
                                className="px-3 py-1.5 bg-error text-white rounded text-xs font-semibold hover:bg-error/90 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-on-surface-variant text-sm">
                            No pending users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Rejected Users Table */
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant">
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Name</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Email</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Phone</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Payment ID</th>
                        <th className="py-4 px-6 font-semibold text-sm text-on-surface">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedUsers.length > 0 ? (
                        rejectedUsers.map((user) => (
                          <tr
                            key={user._id || user.id}
                            className="border-b border-outline-variant hover:bg-surface-container-low transition-colors"
                          >
                            <td className="py-4 px-6 text-sm font-medium">{user.name}</td>
                            <td className="py-4 px-6 text-sm text-on-surface-variant">{user.email}</td>
                            <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                              {user.phone || 'N/A'}
                            </td>
                            <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">
                              {user.paymentId || '—'}
                            </td>
                            <td className="py-4 px-6 text-sm">
                              <span className="px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold border border-red-200">
                                Rejected
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-on-surface-variant text-sm">
                            No rejected users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && <AdminTransactionsView />}

          {activeTab === 'explorer' && (
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              {/* Explorer Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Blockchain Explorer
                  </h1>
                  <p className="text-on-surface-variant">
                    Inspect immutable cryptographic ledger blocks for payment transactions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleValidatePaymentChain}
                    disabled={isValidatingPaymentChain || paymentChain.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isValidatingPaymentChain ? 'animate-spin' : ''}`}>
                      {isValidatingPaymentChain ? 'sync' : 'verified_user'}
                    </span>
                    {isValidatingPaymentChain ? 'Validating Chain...' : 'Validate Chain'}
                  </button>
                  <button
                    onClick={fetchPaymentBlockchainData}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Payments Blockchain View */}
              <div className="flex flex-col gap-4">
                  {/* Validation State Banner (Requirement: Total blocks, healthy, warnings, critical, orphan transactions) */}
                  {paymentValidationStatus === 'not_run' ? (
                    <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-gray-700 shadow-sm animate-fadeIn">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[24px] text-gray-500 shrink-0">help_outline</span>
                        <div>
                          <span className="font-bold text-sm text-gray-800">
                            Validation not run yet. Click Validate Chain.
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Verify block indexes, timestamp ordering, bank records cross-check, cryptographic hashes, and authority signatures.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleValidatePaymentChain}
                        disabled={isValidatingPaymentChain || paymentChain.length === 0}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isValidatingPaymentChain ? 'animate-spin' : ''}`}>
                          {isValidatingPaymentChain ? 'sync' : 'verified_user'}
                        </span>
                        {isValidatingPaymentChain ? 'Validating...' : 'Validate Chain'}
                      </button>
                    </div>
                  ) : paymentValidationSummary ? (
                    <div
                      className={`rounded-xl p-4 border flex flex-col gap-3 shadow-sm animate-fadeIn ${
                        paymentValidationStatus === 'invalid'
                          ? 'bg-red-50/95 border-red-300 text-red-950'
                          : paymentValidationStatus === 'warning'
                          ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                          : 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`material-symbols-outlined text-[26px] shrink-0 font-bold ${
                              paymentValidationStatus === 'invalid'
                                ? 'text-red-600'
                                : paymentValidationStatus === 'warning'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {paymentValidationStatus === 'invalid'
                              ? 'error'
                              : paymentValidationStatus === 'warning'
                              ? 'warning'
                              : 'check_circle'}
                          </span>
                          <div>
                            <span className="font-extrabold text-sm sm:text-base">
                              {paymentValidationStatus === 'invalid'
                                ? '⚠️ Chain Integrity Compromised — Issues Found'
                                : paymentValidationStatus === 'warning'
                                ? '⚠️ Blockchain Warnings Detected'
                                : `✓ Blockchain Valid — All ${paymentValidationSummary.totalBlocks || paymentChain.length} blocks passed`}
                            </span>
                            <p className="text-xs opacity-85 mt-0.5">
                              {paymentValidationSummary.message}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleValidatePaymentChain}
                          disabled={isValidatingPaymentChain}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs ${
                            paymentValidationStatus === 'invalid'
                              ? 'bg-red-600 hover:bg-red-700'
                              : paymentValidationStatus === 'warning'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isValidatingPaymentChain ? 'animate-spin' : ''}`}>
                            refresh
                          </span>
                          {isValidatingPaymentChain ? 'Validating...' : 'Re-validate'}
                        </button>
                      </div>

                      {/* Summary Metrics: Total blocks, healthy, warnings, critical, orphan transactions */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2.5 border-t border-current/15 text-xs">
                        <div className="bg-white/80 rounded-lg p-2.5 border border-current/10 flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Total Blocks</span>
                          <span className="text-base font-extrabold font-mono text-on-surface">
                            {paymentValidationSummary.totalBlocks ?? paymentChain.length}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-current/10 flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Healthy</span>
                          <span className="text-base font-extrabold font-mono text-emerald-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            {paymentValidationSummary.passed ?? 0}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-current/10 flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Warnings</span>
                          <span className="text-base font-extrabold font-mono text-amber-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            {paymentValidationSummary.warnings ?? 0}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-current/10 flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Critical</span>
                          <span className="text-base font-extrabold font-mono text-red-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            {paymentValidationSummary.critical ?? 0}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-current/10 flex flex-col col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">Missing Records</span>
                          <span className="text-base font-extrabold font-mono text-purple-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            {paymentValidationSummary.orphanCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Secondary Sub-Tab Switcher */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex bg-surface-container rounded-lg p-1 w-fit border border-outline-variant/60">
                      <button
                        onClick={() => setPaymentViewTab('table')}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          paymentViewTab === 'table'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">table_chart</span>
                        Table
                      </button>
                      <button
                        onClick={() => setPaymentViewTab('visual')}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          paymentViewTab === 'visual'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">hub</span>
                        Visual Blockchain
                      </button>
                    </div>
                  </div>

                  {/* Option A: Table View */}
                  {paymentViewTab === 'table' && (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                      <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                        <h3 className="font-bold text-sm text-on-surface">Payment Transaction Block Ledger</h3>
                        <span className="text-xs text-on-surface-variant font-mono">{paymentChain.length} Total Blocks</span>
                      </div>
                      {loadingPaymentChain ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                          <p className="text-sm text-on-surface-variant font-medium">Loading payment blockchain...</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full min-w-[1050px] text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="bg-surface-container border-b border-outline-variant">
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Block #</th>
                                {paymentValidationResults && (
                                  <th className="py-4 px-6 font-semibold text-sm text-on-surface">Audit Status</th>
                                )}
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Transaction ID</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Sender</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Receiver</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Amount</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Timestamp</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Previous Hash</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Signature</th>
                                <th className="py-4 px-6 font-semibold text-sm text-on-surface">Hash</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentChain.length > 0 ? (
                                paymentChain.map((block) => {
                                  const valRes = paymentValidationResults
                                    ? paymentValidationResults.find((r) => r.index === block.index)
                                    : null
                                  const isCriticalRow = valRes && (valRes.severity === 'CRITICAL' || valRes.status === 'FAIL')
                                  const isWarningRow = valRes && valRes.severity === 'WARNING'

                                  const truncatedTxId = block.transactionId
                                    ? (block.transactionId.length > 14 ? `${block.transactionId.substring(0, 14)}...` : block.transactionId)
                                    : 'N/A'
                                  const truncatedPrevHash = block.previousHash
                                    ? `${block.previousHash.substring(0, 16)}...`
                                    : (block.index === 0 ? '0 (Genesis)' : 'N/A')
                                  const truncatedSignature = block.signature
                                    ? `${block.signature.substring(0, 12)}...`
                                    : 'N/A'
                                  const truncatedHash = block.hash
                                    ? `${block.hash.substring(0, 16)}...`
                                    : 'N/A'

                                  return (
                                    <tr
                                      key={block._id || block.index}
                                      className={`border-b border-outline-variant transition-colors ${
                                        isCriticalRow
                                          ? 'bg-red-50/70 hover:bg-red-100/80 border-l-4 border-l-red-500'
                                          : isWarningRow
                                          ? 'bg-amber-50/70 hover:bg-amber-100/80 border-l-4 border-l-amber-500'
                                          : 'hover:bg-surface-container-low'
                                      }`}
                                    >
                                      <td className="py-4 px-6 text-sm font-bold font-mono text-primary">#{block.index}</td>
                                      {paymentValidationResults && (
                                        <td className="py-4 px-6 text-sm">
                                          {valRes?.severity === 'OK' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-xs font-bold">
                                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                              Healthy
                                            </span>
                                          ) : isWarningRow ? (
                                            <div className="flex flex-col gap-1 max-w-[260px]">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-bold w-fit">
                                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                                Warning
                                              </span>
                                              {valRes.reasons && valRes.reasons.length > 0 && (
                                                <span className="text-[11px] text-amber-800 leading-tight">
                                                  {valRes.reasons.join('; ')}
                                                </span>
                                              )}
                                            </div>
                                          ) : isCriticalRow ? (
                                            <div className="flex flex-col gap-1 max-w-[260px]">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-900 border border-red-300 rounded-md text-xs font-bold w-fit">
                                                <span className="material-symbols-outlined text-[14px]">error</span>
                                                Tampered
                                              </span>
                                              {valRes.reasons && valRes.reasons.length > 0 && (
                                                <span className="text-[11px] text-red-800 leading-tight">
                                                  {valRes.reasons.join('; ')}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-on-surface-variant font-mono">—</span>
                                          )}
                                        </td>
                                      )}
                                      <td className="py-4 px-6 text-sm font-mono font-semibold text-on-surface" title={block.transactionId}>
                                        {truncatedTxId}
                                      </td>
                                      <td className="py-4 px-6 text-sm">
                                        <div className="font-bold text-on-surface">{block.senderName}</div>
                                        <div className="text-xs text-on-surface-variant font-mono">{block.senderPaymentId}</div>
                                      </td>
                                      <td className="py-4 px-6 text-sm">
                                        <div className="font-bold text-on-surface">{block.receiverName}</div>
                                        <div className="text-xs text-on-surface-variant font-mono">{block.receiverPaymentId}</div>
                                      </td>
                                      <td className={`py-4 px-6 text-sm font-mono font-bold ${isCriticalRow ? 'text-red-700' : isWarningRow ? 'text-amber-700' : 'text-emerald-600'}`}>
                                        ₹{(block.amount || 0).toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-4 px-6 text-sm text-on-surface-variant font-mono">{formatBlockTime(block.timestamp)}</td>
                                      <td className="py-4 px-6 text-sm font-mono text-on-surface-variant" title={block.previousHash || '0'}>
                                        {truncatedPrevHash}
                                      </td>
                                      <td className="py-4 px-6 text-sm font-mono text-on-surface-variant" title={block.signature}>
                                        {truncatedSignature}
                                      </td>
                                      <td className="py-4 px-6 text-sm font-mono text-on-surface-variant" title={block.hash}>
                                        {truncatedHash}
                                      </td>
                                    </tr>
                                  )
                                })
                              ) : (
                                <tr>
                                  <td colSpan={paymentValidationResults ? 10 : 9} className="py-8 text-center text-on-surface-variant text-sm">
                                    No payment blocks recorded in blockchain yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option B: Visual Blockchain View */}
                  {paymentViewTab === 'visual' && (
                    <PaymentBlockchainFlow
                      paymentChain={paymentChain}
                      validationResults={paymentValidationResults}
                      validationStatus={paymentValidationStatus}
                    />
                  )}

                  {/* Missing Blockchain Records Section (Requirement: orphan transactions) */}
                  {paymentValidationSummary && (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[22px] text-amber-600">receipt_long</span>
                            <h3 className="font-bold text-base text-on-surface">Missing Blockchain Records</h3>
                            {paymentValidationSummary.orphanCount > 0 ? (
                              <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded-full text-xs font-bold">
                                {paymentValidationSummary.orphanCount} Missing
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold">
                                All Recorded
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {paymentValidationSummary.orphanCount > 0
                              ? "The following bank transactions were never added to the blockchain."
                              : "All bank transactions have corresponding verified blocks on the blockchain."}
                          </p>
                        </div>
                      </div>

                      {paymentValidationSummary.orphanTransactions && paymentValidationSummary.orphanTransactions.length > 0 ? (
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                            <thead>
                              <tr className="bg-amber-50/70 border-b border-amber-200 text-amber-950 font-bold">
                                <th className="py-3 px-4">Transaction ID</th>
                                <th className="py-3 px-4">Date & Time</th>
                                <th className="py-3 px-4">Sender</th>
                                <th className="py-3 px-4">Receiver</th>
                                <th className="py-3 px-4">Amount</th>
                                <th className="py-3 px-4">Status & Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentValidationSummary.orphanTransactions.map((tx) => (
                                <tr key={tx.transactionId} className="border-b border-outline-variant/60 hover:bg-amber-50/40">
                                  <td className="py-3 px-4 font-mono font-bold text-on-surface">{tx.transactionId}</td>
                                  <td className="py-3 px-4 text-on-surface-variant font-mono">{formatBlockTime(tx.date)}</td>
                                  <td className="py-3 px-4 font-mono text-on-surface">{tx.sender}</td>
                                  <td className="py-3 px-4 font-mono text-on-surface">{tx.receiver}</td>
                                  <td className="py-3 px-4 font-mono font-bold text-amber-700">₹{(tx.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-4 text-red-700 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[14px]">warning</span>
                                      <span>{tx.issue || "This bank transaction has no block on the blockchain. It was never recorded."}</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                          <span>Every bank transaction is accounted for. No orphan or missing blockchain records exist.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
          )}


          {activeTab === 'fraud' && (
            <div className="w-full flex items-center justify-center py-12">
              <div className="w-full max-w-[460px] bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-amber-500 text-[28px]">warning</span>
                </div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Fraud Alerts</h2>
                <p className="text-sm text-on-surface-variant mb-4">This section is currently under construction.</p>
                <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Under Construction
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Real-time New Block Green Toast Notification (Requirement 1) */}
      {newBlockToast && (
        <div className="fixed top-6 right-6 z-[99999] max-w-md animate-fadeIn shadow-2xl">
          <div className="bg-emerald-600 text-white px-4 py-3.5 rounded-xl border border-emerald-500 flex items-start gap-3 shadow-lg">
            <span className="material-symbols-outlined text-[24px] shrink-0 text-emerald-100 mt-0.5">
              token
            </span>
            <div className="flex-1 pr-1">
              <div className="font-bold text-xs uppercase tracking-wider text-emerald-200 mb-0.5">
                Blockchain Live Update
              </div>
              <div className="text-sm font-medium leading-snug">
                {newBlockToast.message}
              </div>
            </div>
            <button
              onClick={() => setNewBlockToast(null)}
              className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
