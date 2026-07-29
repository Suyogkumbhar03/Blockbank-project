import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'

export default function AdminTransactionsView() {
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeViewMode, setActiveViewMode] = useState('user-wise') // 'user-wise' | 'all-logs'
  const [selectedUserId, setSelectedUserId] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'success' | 'failed'
  const [selectedTx, setSelectedTx] = useState(null) // Modal details
  const [expandedUser, setExpandedUser] = useState(null) // User accordion toggle

  // Fetch all transactions & approved users
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [txRes, usersRes] = await Promise.all([
        api.get('/admin/transactions'),
        api.get('/admin/approved-users')
      ])
      setTransactions(Array.isArray(txRes.data) ? txRes.data : [])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
    } catch (err) {
      console.error('Failed to fetch admin transactions', err)
      setError(err.response?.data?.message || 'Failed to load transaction data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Helper formatting date & time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: 'N/A', time: 'N/A', full: 'N/A' }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A', full: 'N/A' }

    const date = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    return { date, time, full: `${date} at ${time}` }
  }

  // Calculate relative time (e.g. 5 mins ago)
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffSec = Math.floor((now - d) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hrs ago`
    return `${Math.floor(diffSec / 86400)} days ago`
  }

  // Helper to identify admin accounts
  const isAdminAccount = (paymentId, name, role) => {
    if (role === 'admin') return true
    if (paymentId && paymentId.toLowerCase().includes('admin')) return true
    if (name && name.toLowerCase().includes('admin')) return true
    return false
  }

  // Compute System Statistics
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0)
    const totalCount = transactions.length
    const uniqueUsersSet = new Set()
    transactions.forEach(t => {
      if (t.senderPaymentId && !isAdminAccount(t.senderPaymentId, t.senderName)) {
        uniqueUsersSet.add(t.senderPaymentId)
      }
      if (t.receiverPaymentId && !isAdminAccount(t.receiverPaymentId, t.receiverName)) {
        uniqueUsersSet.add(t.receiverPaymentId)
      }
    })
    const avgVolume = totalCount > 0 ? totalVolume / totalCount : 0

    return {
      totalVolume,
      totalCount,
      activeUsersCount: uniqueUsersSet.size,
      avgVolume
    }
  }, [transactions, users])

  // Group transactions by User (excluding Admin)
  const userWiseData = useMemo(() => {
    const userMap = new Map()

    // Initialize map with known approved non-admin users
    users.forEach(u => {
      if (u.paymentId && !isAdminAccount(u.paymentId, u.name, u.role)) {
        userMap.set(u.paymentId, {
          user: u,
          name: u.name || 'User',
          paymentId: u.paymentId,
          accountNumber: u.accountNumber || '',
          sentTotal: 0,
          receivedTotal: 0,
          sentCount: 0,
          receivedCount: 0,
          transactions: []
        })
      }
    })

    // Populate transaction data per non-admin user
    transactions.forEach(tx => {
      // Sender entry (only if sender is a regular user, not admin)
      if (tx.senderPaymentId && !isAdminAccount(tx.senderPaymentId, tx.senderName)) {
        if (!userMap.has(tx.senderPaymentId)) {
          userMap.set(tx.senderPaymentId, {
            user: { name: tx.senderName, paymentId: tx.senderPaymentId, accountNumber: tx.senderAccount },
            name: tx.senderName || 'User',
            paymentId: tx.senderPaymentId,
            accountNumber: tx.senderAccount || '',
            sentTotal: 0,
            receivedTotal: 0,
            sentCount: 0,
            receivedCount: 0,
            transactions: []
          })
        }
        const senderData = userMap.get(tx.senderPaymentId)
        senderData.sentTotal += tx.amount || 0
        senderData.sentCount += 1
        senderData.transactions.push({ ...tx, userRole: 'sender' })
      }

      // Receiver entry (only if receiver is a regular user, not admin)
      if (tx.receiverPaymentId && !isAdminAccount(tx.receiverPaymentId, tx.receiverName)) {
        if (!userMap.has(tx.receiverPaymentId)) {
          userMap.set(tx.receiverPaymentId, {
            user: { name: tx.receiverName, paymentId: tx.receiverPaymentId, accountNumber: tx.receiverAccount },
            name: tx.receiverName || 'User',
            paymentId: tx.receiverPaymentId,
            accountNumber: tx.receiverAccount || '',
            sentTotal: 0,
            receivedTotal: 0,
            sentCount: 0,
            receivedCount: 0,
            transactions: []
          })
        }
        const receiverData = userMap.get(tx.receiverPaymentId)
        receiverData.receivedTotal += tx.amount || 0
        receiverData.receivedCount += 1
        receiverData.transactions.push({ ...tx, userRole: 'receiver' })
      }
    })

    const result = Array.from(userMap.values())

    // Sort transactions within each user by timestamp desc
    result.forEach(u => {
      u.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    })

    return result
  }, [transactions, users])

  // Filtered User-Wise list based on search & user dropdown
  const filteredUserWise = useMemo(() => {
    return userWiseData.filter(item => {
      // Filter by selected user dropdown
      if (selectedUserId !== 'all' && item.paymentId !== selectedUserId) {
        return false
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchId = item.paymentId.toLowerCase().includes(q)
        const matchAcc = item.accountNumber.toLowerCase().includes(q)
        const matchTx = item.transactions.some(t => 
          (t.transactionId || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q)
        )
        return matchName || matchId || matchAcc || matchTx
      }

      return true
    })
  }, [userWiseData, selectedUserId, searchQuery])

  // Filtered All Transactions list
  const filteredAllTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Status filter
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false

      // User filter dropdown
      if (selectedUserId !== 'all') {
        if (tx.senderPaymentId !== selectedUserId && tx.receiverPaymentId !== selectedUserId) {
          return false
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (tx.senderName || '').toLowerCase().includes(q) ||
          (tx.receiverName || '').toLowerCase().includes(q) ||
          (tx.senderPaymentId || '').toLowerCase().includes(q) ||
          (tx.receiverPaymentId || '').toLowerCase().includes(q) ||
          (tx.transactionId || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q) ||
          (tx.amount || 0).toString().includes(q)
        )
      }

      return true
    })
  }, [transactions, statusFilter, selectedUserId, searchQuery])

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-8 pb-12">
      {/* ─── Header & Description ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              Admin Audit Center
            </span>
          </div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">
            User-Wise Transactions
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Monitor complete transaction breakdown by individual user, date, and time timestamps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface font-mono">
            ₹{stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-on-surface-variant mt-1 inline-block">System lifetime transactions</span>
        </div>

        {/* Total Transactions */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface font-mono">
            {stats.totalCount}
          </div>
          <span className="text-xs text-on-surface-variant mt-1 inline-block">Recorded ledger entries</span>
        </div>

        {/* Active Transacting Users */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface font-mono">
            {stats.activeUsersCount}
          </div>
          <span className="text-xs text-on-surface-variant mt-1 inline-block">Users with activity</span>
        </div>

        {/* Avg Transaction Value */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Transaction</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface font-mono">
            ₹{stats.avgVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-xs text-on-surface-variant mt-1 inline-block">Per transfer average</span>
        </div>
      </div>

      {/* ─── Controls & Filters Bar ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Mode Switcher */}
        <div className="flex bg-surface-container rounded-lg p-1 w-full md:w-auto">
          <button
            onClick={() => setActiveViewMode('user-wise')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeViewMode === 'user-wise'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_box</span>
            User-Wise Breakdown
          </button>
          <button
            onClick={() => setActiveViewMode('all-logs')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeViewMode === 'all-logs'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            All Transactions Log
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 max-w-[640px] justify-end">
          {/* User Select Dropdown */}
          <div className="relative w-full sm:w-56">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
            >
              <option value="all">All Accounts ({userWiseData.length})</option>
              {userWiseData.map((u) => (
                <option key={u.paymentId} value={u.paymentId}>
                  {u.name} ({u.paymentId})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search user, ID, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary border border-outline-variant/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Loading / Error states ─── */}
      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-on-surface-variant">Loading user transactions...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-6 text-center text-error">
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-1.5 bg-error text-white rounded-md text-xs font-semibold hover:bg-error/90 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── USER-WISE BREAKDOWN VIEW ─── */}
      {!loading && !error && activeViewMode === 'user-wise' && (
        <div className="flex flex-col gap-6">
          {filteredUserWise.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2 text-outline">search_off</span>
              <p className="font-semibold text-base text-on-surface">No users or transactions found</p>
              <p className="text-xs mt-1">Try clearing your search query or selecting a different user account filter.</p>
            </div>
          ) : (
            filteredUserWise.map((uItem) => {
              const isExpanded = expandedUser === uItem.paymentId || selectedUserId === uItem.paymentId
              const totalTxCount = uItem.transactions.length
              const initials = uItem.name ? uItem.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'

              return (
                <div
                  key={uItem.paymentId}
                  className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl shadow-sm overflow-hidden transition-all"
                >
                  {/* User Summary Card Header */}
                  <div
                    onClick={() => setExpandedUser(isExpanded && selectedUserId === 'all' ? null : uItem.paymentId)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-low/50 transition-colors border-b border-outline-variant/40"
                  >
                    {/* Left User Identity */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-outline-variant">
                        {uItem.user?.profilePhoto ? (
                          <img src={uItem.user.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-on-surface">{uItem.name}</h3>
                          <span className="px-2 py-0.5 bg-surface-container rounded text-[10px] font-bold text-on-surface-variant font-mono uppercase">
                            {uItem.accountNumber || 'Acc N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                          {uItem.paymentId}
                        </p>
                      </div>
                    </div>

                    {/* Right User Stats & Toggle */}
                    <div className="flex items-center gap-6 justify-between md:justify-end">
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">Sent ({uItem.sentCount})</span>
                          <span className="font-bold text-red-600">₹{uItem.sentTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-8 w-px bg-outline-variant/60"></div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">Received ({uItem.receivedCount})</span>
                          <span className="font-bold text-emerald-600">₹{uItem.receivedTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-8 w-px bg-outline-variant/60"></div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">Total Activity</span>
                          <span className="font-bold text-on-surface">{totalTxCount} Txns</span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">
                          {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transaction List */}
                  {isExpanded && (
                    <div className="bg-surface/50 p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          Transaction Log for {uItem.name} ({totalTxCount} Entries)
                        </h4>
                        <span className="text-xs text-on-surface-variant">
                          Ordered by Date & Time (Latest First)
                        </span>
                      </div>

                      {totalTxCount === 0 ? (
                        <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-lg border border-outline-variant/50">
                          No transaction history recorded for this user account.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {uItem.transactions.map((tx) => {
                            const { date, time, full } = formatDateTime(tx.timestamp)
                            const relTime = getRelativeTime(tx.timestamp)
                            const isOutgoing = tx.senderPaymentId === uItem.paymentId
                            const counterpartyName = isOutgoing ? tx.receiverName : tx.senderName
                            const counterpartyId = isOutgoing ? tx.receiverPaymentId : tx.senderPaymentId

                            return (
                              <div
                                key={`${uItem.paymentId}-${tx._id || tx.transactionId}`}
                                onClick={() => setSelectedTx(tx)}
                                className="bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                              >
                                {/* Left: Direction & Counterparty info */}
                                <div className="flex items-start sm:items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                      isOutgoing ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[20px]">
                                      {isOutgoing ? 'north_east' : 'south_west'}
                                    </span>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                                        isOutgoing ? 'bg-red-100/70 text-red-700' : 'bg-emerald-100/70 text-emerald-700'
                                      }`}>
                                        {isOutgoing ? 'SENT TO' : 'RECEIVED FROM'}
                                      </span>
                                      <span className="font-bold text-sm text-on-surface">
                                        {counterpartyName}
                                      </span>
                                      <span className="text-xs text-on-surface-variant font-mono">
                                        ({counterpartyId})
                                      </span>
                                    </div>

                                    {/* Date & Time display */}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                                      <span className="font-semibold text-on-surface font-mono">{date}</span>
                                      <span>•</span>
                                      <span className="font-medium font-mono">{time}</span>
                                      <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                                        {relTime}
                                      </span>
                                    </div>

                                    {tx.note && (
                                      <p className="text-xs text-on-surface-variant/80 italic mt-1 bg-surface-container-low px-2 py-0.5 rounded w-fit">
                                        "{tx.note}"
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Amount, Status & Details action */}
                                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/40">
                                  <div className="text-left sm:text-right">
                                    <div className={`text-base font-extrabold font-mono ${
                                      isOutgoing ? 'text-red-600' : 'text-emerald-600'
                                    }`}>
                                      {isOutgoing ? '- ' : '+ '}₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                                      ID: {tx.transactionId}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
                                      Success
                                    </span>
                                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                                      chevron_right
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ─── ALL TRANSACTIONS LOG TABLE VIEW ─── */}
      {!loading && !error && activeViewMode === 'all-logs' && (
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-outline-variant/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-sm text-on-surface">
              System All Transactions Log ({filteredAllTransactions.length} Entries)
            </h3>

            {/* Filter by Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-on-surface-variant font-semibold">Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'success' ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Success
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Sender</th>
                  <th className="py-3.5 px-4">Receiver</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-xs">
                {filteredAllTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-on-surface-variant text-sm">
                      No transaction entries match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAllTransactions.map((tx) => {
                    const { date, time } = formatDateTime(tx.timestamp)
                    const relTime = getRelativeTime(tx.timestamp)

                    return (
                      <tr
                        key={tx._id || tx.transactionId}
                        className="hover:bg-surface-container-low/70 transition-colors"
                      >
                        {/* Date & Time */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-on-surface font-mono">{date}</div>
                          <div className="text-[11px] text-on-surface-variant font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{time}</span>
                            <span className="text-[9px] bg-surface-container px-1 rounded text-on-surface-variant">{relTime}</span>
                          </div>
                        </td>

                        {/* TX ID */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                          {tx.transactionId}
                        </td>

                        {/* Sender */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-on-surface">{tx.senderName}</div>
                          <div className="text-[11px] text-on-surface-variant font-mono">{tx.senderPaymentId}</div>
                        </td>

                        {/* Receiver */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-on-surface">{tx.receiverName}</div>
                          <div className="text-[11px] text-on-surface-variant font-mono">{tx.receiverPaymentId}</div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-on-surface">
                          ₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Success
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="px-3 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TRANSACTION DETAILS MODAL ─── */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-[520px] max-w-[95vw] p-6 shadow-2xl flex flex-col gap-5 text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface leading-tight">Transaction Record</h3>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">ID: {selectedTx.transactionId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4">
              {/* Amount Spotlight */}
              <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 text-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount Transferred</span>
                <div className="text-3xl font-extrabold text-primary font-mono mt-1">
                  ₹{selectedTx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Status: Settled & Confirmed</span>
                </div>
              </div>

              {/* Timestamp info */}
              <div className="bg-surface-container/60 border border-outline-variant/40 rounded-lg p-3 text-xs flex items-center justify-between gap-2">
                <span className="font-bold text-on-surface-variant uppercase tracking-wider shrink-0">Date & Time:</span>
                <span className="font-mono font-bold text-on-surface text-right">{formatDateTime(selectedTx.timestamp).full}</span>
              </div>

              {/* Sender & Receiver info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/40">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Sender (From)</span>
                  <div className="font-bold text-sm text-on-surface truncate">{selectedTx.senderName}</div>
                  <div className="text-xs font-mono text-on-surface-variant mt-0.5 truncate">{selectedTx.senderPaymentId}</div>
                  {selectedTx.senderAccount && (
                    <div className="text-[11px] font-mono text-outline mt-1 truncate">Acc: {selectedTx.senderAccount}</div>
                  )}
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/40">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Receiver (To)</span>
                  <div className="font-bold text-sm text-on-surface truncate">{selectedTx.receiverName}</div>
                  <div className="text-xs font-mono text-on-surface-variant mt-0.5 truncate">{selectedTx.receiverPaymentId}</div>
                  {selectedTx.receiverAccount && (
                    <div className="text-[11px] font-mono text-outline mt-1 truncate">Acc: {selectedTx.receiverAccount}</div>
                  )}
                </div>
              </div>

              {/* Note / Remarks */}
              {selectedTx.note && (
                <div className="p-3 bg-surface-container/60 border border-outline-variant/40 rounded-lg">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Transaction Note</span>
                  <p className="text-xs text-on-surface italic">"{selectedTx.note}"</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
