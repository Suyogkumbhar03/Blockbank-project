import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [chartRange, setChartRange] = useState('1D')
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [pendingRes, approvedRes] = await Promise.all([
        api.get('/admin/pending-users'),
        api.get('/admin/approved-users'),
      ])
      setPendingUsers(pendingRes.data || [])
      setApprovedUsers(approvedRes.data || [])
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
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[22px]">dark_mode</span>
            </button>
            <div className="h-6 w-px bg-surface-variant"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium">Profile</span>
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm overflow-hidden border border-outline-variant">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 flex-1 overflow-auto bg-surface">
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
                <button className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-md text-sm font-medium hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer">
                  Generate Report
                </button>
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
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-semibold text-on-surface">
                      System Transaction Volume
                    </h2>
                    <div className="flex bg-surface-container rounded-md p-1">
                      <button
                        onClick={() => setChartRange('1D')}
                        className={`px-3 py-1 text-xs font-medium rounded ${
                          chartRange === '1D'
                            ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        1D
                      </button>
                      <button
                        onClick={() => setChartRange('1W')}
                        className={`px-3 py-1 text-xs font-medium rounded ${
                          chartRange === '1W'
                            ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        1W
                      </button>
                      <button
                        onClick={() => setChartRange('1M')}
                        className={`px-3 py-1 text-xs font-medium rounded ${
                          chartRange === '1M'
                            ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        1M
                      </button>
                    </div>
                  </div>
                  {/* Chart Container Placeholder */}
                  <div className="relative w-full h-[300px] bg-[#f8fafc] rounded-md border border-[#e2e8f0] overflow-hidden flex items-end">
                    <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none">
                      <div className="w-full h-px bg-[#e2e8f0]"></div>
                      <div className="w-full h-px bg-[#e2e8f0]"></div>
                      <div className="w-full h-px bg-[#e2e8f0]"></div>
                      <div className="w-full h-px bg-[#e2e8f0]"></div>
                    </div>
                    <svg
                      viewBox="0 0 1000 300"
                      preserveAspectRatio="none"
                      className="absolute bottom-0 w-full h-[90%] opacity-80 z-10"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="var(--color-primary)"
                            stopOpacity="0.1"
                          />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,250 C150,220 250,280 350,220 C450,160 550,150 600,250 C650,350 750,40 850,20 C920,0 970,180 1000,200 L1000,300 L0,300 Z"
                        fill="url(#chartGradient)"
                      />
                      <path
                        d="M0,250 C150,220 250,280 350,220 C450,160 550,150 600,250 C650,350 750,40 850,20 C920,0 970,180 1000,200"
                        fill="none"
                        stroke="var(--color-on-surface-variant)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
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
                    <button className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg hover:bg-[#fff5f5] hover:border-error transition-all group text-left cursor-pointer">
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
                  <p className="text-on-surface-variant">List of all active and approved users.</p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant">
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Name</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Email</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Account No</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Balance</th>
                      <th className="py-4 px-6 font-semibold text-sm text-on-surface">Role</th>
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
                          <td className="py-4 px-6 text-sm font-medium text-primary font-mono">
                            ₹{(user.balance || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            <span className="px-2 py-1 bg-surface-container-high rounded text-xs font-semibold uppercase">
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-on-surface-variant text-sm">
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

          {(activeTab === 'transactions' ||
            activeTab === 'explorer' ||
            activeTab === 'fraud') && (
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
