import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import AdminProfileView from '../components/AdminProfileView'
import AdminTransactionsView from '../components/AdminTransactionsView'
import TransactionVolumeChart from '../components/TransactionVolumeChart'
import { generateReport } from '../utils/generateReport.jsx'

function AdminDashboard() {
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'dashboard'
  })

  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    localStorage.setItem('adminActiveTab', tab)
  }
  const [chartRange, setChartRange] = useState('1D')
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [rejectedUsers, setRejectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')

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

  // Initial fetch + re-fetch when tab changes
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, activeTab])

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
      alert('User approved successfully')
    } catch (error) {
      console.error('Failed to approve user', error)
    }
  }

  const handleReject = async (id) => {
    try {
      await api.put(`/admin/reject/${id}`)
      await fetchUsers()
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

      // Fetch all transactions from the backend endpoint GET /api/admin/all-transactions
      const txRes = await api.get('/admin/all-transactions')
      const allTransactions = Array.isArray(txRes.data) ? txRes.data : []

      // Generate the PDF report using html2canvas + jsPDF template
      await generateReport({
        adminName,
        approvedUsers,
        pendingUsers,
        rejectedUsers,
        totalUsers: approvedUsers.length + pendingUsers.length + rejectedUsers.length,
        allTransactions
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

  return (
    <div className="min-h-screen bg-surface-container-lowest font-sans text-on-surface flex">
      {/* Shared Admin Sidebar */}
      <Sidebar role="admin" activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-surface-variant flex items-center justify-between px-8 bg-surface-container-lowest sticky top-0 z-10 shrink-0">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search system logs..."
              className="w-full bg-surface-container pl-10 pr-4 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
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

                <div className="bg-[#fff5f5] border border-[#fecaca] rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-semibold tracking-wider text-error uppercase">
                      Active Fraud Alerts
                    </span>
                    <span className="material-symbols-outlined text-error">warning</span>
                  </div>
                  <div>
                    <div className="text-[40px] font-bold text-error leading-none mb-3">0</div>
                    <div className="text-xs font-medium text-error">Requires immediate review</div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Blockchain Status
                    </span>
                    <span
                      className="material-symbols-outlined text-[#059669]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <div>
                    <div className="text-[32px] font-bold text-on-surface leading-none mb-3">
                      Optimal
                    </div>
                    <div className="text-xs font-medium text-on-surface-variant">
                      Block #894210
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TransactionVolumeChart />
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
                    <button className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg hover:bg-surface-container-lowest hover:border-primary transition-all group text-left cursor-pointer">
                      <div className="w-10 h-10 rounded bg-surface-container text-on-surface-variant flex items-center justify-center group-hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-[20px]">terminal</span>
                      </div>
                      <span className="font-medium text-sm text-on-surface">System Logs</span>
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

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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

          {activeTab === 'approve-users' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Approve Users
                  </h1>
                  <p className="text-on-surface-variant">
                    Review and approve new user registrations.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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
            </div>
          )}

          {activeTab === 'transactions' && <AdminTransactionsView />}

          {activeTab === 'rejected-users' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-[32px] font-semibold text-on-surface tracking-tight mb-2">
                    Rejected Users
                  </h1>
                  <p className="text-on-surface-variant">
                    Read-only list of users whose registrations were rejected.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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
                            <span className="px-2 py-1 bg-[#fff5f5] text-error border border-[#fecaca] rounded text-xs font-semibold uppercase">
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
            </div>
          )}

          {(activeTab === 'explorer' || activeTab === 'fraud') && (
            <div className="flex items-center justify-center h-64">
              <p className="text-on-surface-variant">This section is under construction.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
